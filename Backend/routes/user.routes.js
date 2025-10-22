import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { getCurrentUser, updateAssistant, askToAssistant } from "../controllers/user.Controllers.js"
import upload from "../middlewares/multer.js"
import User from "../models/user.model.js"

const userRouter = express.Router()

userRouter.get("/current", isAuth, getCurrentUser)
userRouter.post("/update", isAuth, upload.single('assistantImage'), updateAssistant)
userRouter.post("/ask", isAuth, askToAssistant)

// Add a command to user history
userRouter.post("/history", async (req, res) => {
    try {
        const { userId, command } = req.body;
        if (!userId || !command) return res.status(400).json({ error: "userId and command required" });
        await User.findByIdAndUpdate(userId, { $push: { history: command } });
        res.json({ success: true });
    } catch (err) {
        console.error("History push error:", err?.message || err);
        res.status(500).json({ error: "Could not update history" });
    }
});

// Get user history
userRouter.get("/history/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        // Ensure history is always returned in reverse chronological order (latest first)
        const user = await User.findById(userId, "history");
        if (!user) return res.status(404).json({ error: "User not found" });
        // Defensive: ensure array and copy
        const historyArr = Array.isArray(user.history) ? [...user.history] : [];
        // Reverse for latest first (optional, remove .reverse() if you want oldest first)
        res.json({ history: historyArr.reverse() });
    } catch (err) {
        console.error("History fetch error:", err);
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// Clear user history
userRouter.post("/history/clear", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "userId required" });
        await User.findByIdAndUpdate(userId, { $set: { history: [] } });
        res.json({ success: true });
    } catch (err) {
        console.error("History clear error:", err?.message || err);
        res.status(500).json({ error: "Could not clear history" });
    }
});

export default userRouter
