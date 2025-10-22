//Gives the current user details
import fs from 'fs/promises';
import User from '../models/user.model.js'
import * as cloudinary from '../config/cloudinary.js' // safer namespace import
import geminiResponse from '../gemini.js';
import { response } from 'express';
import moment from 'moment';
export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: `Error fetching user data: ${error}` });
    }
}

export const updateAssistant = async (req, res) => {
    try {
        // Basic auth check
        if (!req.userId) {
            return res.status(401).json({ message: 'Unauthorized: user not authenticated' });
        }

        // Accept multiple body field names
        const assistantName = req.body?.assistantName || req.body?.name || null;
        const imageUrl = req.body?.imageUrl || req.body?.Imageurl || req.body?.assistantImageUrl || null;

        // If client sent a blob/object URL (starts with blob:) that's a client-side preview URL — server cannot use it.
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('blob:')) {
            return res.status(400).json({ message: 'Invalid image URL: received a client-side blob URL. Upload the actual file (multipart/form-data) using the field name "assistantImage".' });
        }

        let assistantImage = null;

        if (req.file) {
            // Attempt Cloudinary upload
            let uploadResult;
            try {
                if (typeof cloudinary.uploadOnCloudinary === 'function') {
                    uploadResult = await cloudinary.uploadOnCloudinary(req.file.path);
                } else if (typeof cloudinary.default === 'function') {
                    uploadResult = await cloudinary.default(req.file.path);
                } else {
                    throw new Error('Cloudinary upload function not found in config/cloudinary.js');
                }
            } catch (uploadErr) {
                console.error('Cloudinary upload failed:', uploadErr);
                // remove temp file if present
                try { if (req.file?.path) await fs.unlink(req.file.path) } catch (_) { }
                return res.status(500).json({ message: 'Failed to upload image to Cloudinary', error: String(uploadErr) });
            }

            // Normalize upload result to URL
            if (uploadResult && typeof uploadResult === 'object') {
                assistantImage = uploadResult.secure_url || uploadResult.url || uploadResult.result?.secure_url || uploadResult.result?.url || null;
            } else if (typeof uploadResult === 'string') {
                assistantImage = uploadResult;
            }

            // remove temp file uploaded by multer
            try {
                if (req.file?.path) await fs.unlink(req.file.path);
            } catch (unlinkErr) {
                console.warn('Failed to remove temp file:', unlinkErr);
            }

            if (!assistantImage) {
                return res.status(500).json({ message: 'Cloudinary did not return a usable image URL' });
            }
        } else {
            assistantImage = imageUrl || null;
        }

        // Build update payload only for provided fields
        const updatePayload = {};
        if (assistantName !== null) updatePayload.assistantName = assistantName;
        if (assistantImage !== null) updatePayload.assistantImage = assistantImage;

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: 'No assistantName or assistantImage provided' });
        }

        const user = await User.findByIdAndUpdate(req.userId, updatePayload, { new: true }).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json(user);
    } catch (error) {
        console.error('updateAssistant error:', error);
        return res.status(500).json({ message: `Error updating assistant data: ${error.message || error}` });
    }
}

export const askToAssistant = async (req, res) => {
    try {
        // Accept command from body in multiple shapes
        let command = '';
        if (typeof req.body === 'string') {
            command = req.body;
        } else if (req.body?.command) {
            command = req.body.command;
        } else if (req.body?.prompt) {
            command = req.body.prompt;
        } else {
            // whole body fallback
            command = JSON.stringify(req.body);
        }
        command = String(command || '').trim();
        if (!command) {
            return res.status(400).json({ ok: false, message: 'No command provided' });
        }

        // Fetch user to get names
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

        const userName = user.name || 'User';
        const assistantName = user.assistantName || 'Assistant';

        // Call Gemini helper (returns { ok, text, raw } or string depending on your implementation)
        const result = await geminiResponse(command, userName, assistantName);

        // normalize result object (support both {ok,text} and raw string)
        let textOutput = null;
        if (typeof result === 'string') {
            textOutput = result;
        } else if (result && typeof result === 'object') {
            if (result.ok === false) {
                return res.status(500).json({ ok: false, error: result.error || 'Assistant error' });
            }
            textOutput = result.text || (result.raw && typeof result.raw === 'string' ? result.raw : null);
            if (!textOutput && result.raw && typeof result.raw === 'object') {
                // try common nested shape
                textOutput = result.raw?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text || null;
            }
        }

        if (!textOutput) {
            return res.status(500).json({ ok: false, message: 'No response from assistant' });
        }

        // Try to extract JSON object from assistant response text
        const jsonMatch = String(textOutput).match(/{[\s\S]*}/);
        let parsed = null;
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
                // invalid JSON — fallback to returning raw text
                parsed = null;
            }
        }

        if (!parsed) {
            // No structured JSON returned — treat as general response
            return res.json({
                ok: true,
                type: 'general',
                userInput: command,
                response: String(textOutput)
            });
        }

        const type = parsed.type || 'general';
        const userInput = parsed.userInput || command;
        const responseText = parsed.response || String(textOutput);

        // handle simple built-in intents server-side (time/date/day/etc.)
        if (type === 'get_date') {
            return res.json({ ok: true, type, userInput, response: moment().format('YYYY-MM-DD') });
        }
        if (type === 'get_time') {
            return res.json({ ok: true, type, userInput, response: moment().format('HH:mm:ss') });
        }
        if (type === 'get_day') {
            return res.json({ ok: true, type, userInput, response: moment().format('dddd') });
        }
        if (type === 'get_month') {
            return res.json({ ok: true, type, userInput, response: moment().format('MMMM') });
        }
        if (type === 'get_year') {
            return res.json({ ok: true, type, userInput, response: moment().format('YYYY') });
        }

        // Default: return parsed response
        return res.json({ ok: true, type, userInput, response: responseText });
    } catch (error) {
        console.error('askToAssistant error:', error);
        return res.status(500).json({ ok: false, message: 'Assistant error', error: String(error) });
    }
}