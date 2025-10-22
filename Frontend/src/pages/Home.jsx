import React, { useContext, useEffect, useRef, useState } from "react";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../context/UserContext.jsx";
import axios from "axios";
import { FaBars, FaMicrophone } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";

function Home() {
    const { userData, selectedImage, setUserData, serverURL } =
        useContext(userDataContext);
    const navigate = useNavigate();

    const assistantName = (userData?.assistantName || "Your Assistant").trim();
    const assistantImage = userData?.assistantImage || selectedImage || null;
    const username = userData?.name || "Guest";

    const [activated, setActivated] = useState(false);
    const recognitionRef = useRef(null);
    const isSpeakingRef = useRef(false);
    const [flash, setFlash] = useState(false);
    const [speakingFlash, setSpeakingFlash] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [currentCommand, setCurrentCommand] = useState("");
    const [currentResponse, setCurrentResponse] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [listening, setListening] = useState(false);

    // add loading/error state for history
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyError, setHistoryError] = useState(null)

    // Navigation buttons
    const handleClick = () => {
        if (userData) navigate("/customize");
        else navigate("/signin");
    };

    const handleLogout = async () => {
        try {
            if (serverURL) {
                await axios.post(`${serverURL}/api/auth/logout`, {}, { withCredentials: true });
            }
        } catch (err) {
            console.error("logout error:", err.response?.data || err.message || err);
        } finally {
            localStorage.removeItem("access_token");
            localStorage.removeItem("token");
            if (typeof setUserData === "function") setUserData(null);
            navigate("/signin", { replace: true });
        }
    };

    // 🔊 Speak helper
    const speak = (text) => {
        return new Promise((resolve) => {
            if (!("speechSynthesis" in window)) return resolve();
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance(String(text));
            utter.lang = "en-US";
            setSpeakingFlash(true); // Start glowing while speaking
            utter.onend = () => {
                setTimeout(() => setSpeakingFlash(false), 100); // Turn off after speech
                setTimeout(resolve, 250);
            };
            utter.onerror = (e) => {
                console.error("❌ Speech error:", e);
                setSpeakingFlash(false);
                setTimeout(resolve, 250);
            };
            try {
                // Do not call synth.cancel() here, as it can interrupt the current utterance
                synth.speak(utter);
            } catch (err) {
                console.error("Speech synthesis failed:", err);
                setSpeakingFlash(false);
                setTimeout(resolve, 250);
            }
        });
    };

    // Fetch history from backend
    const fetchHistory = async () => {
        // Prevent concurrent fetches
        if (historyLoading) return;
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            if (!userData?._id) {
                console.warn('fetchHistory: no userData._id available');
                setHistory([]);
                return;
            }
            const url = `${serverURL || ''}/api/user/history/${userData._id}`;
            const resp = await axios.get(url, { withCredentials: true, timeout: 8000 });

            // handle unexpected status codes
            if (resp.status >= 500) {
                const msg = `Server error (${resp.status})`;
                setHistoryError(msg);
                setHistory([]);
                return;
            }

            // set history safely; avoid logging full resp.data
            setHistory(Array.isArray(resp.data.history) ? resp.data.history : []);
        } catch (err) {
            // show concise error to user; preserve debug in console
            console.warn('fetchHistory error:', err?.message || err);
            const msg = err?.response?.data?.error || err.message || 'Network or server error';
            setHistoryError(String(msg));
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Toggle history panel and fetch if opening
    const handleGetHistory = () => {
        // Prevent starting another fetch while one is in progress
        if (!showHistory && historyLoading) return;
        if (!showHistory) fetchHistory();
        setShowHistory((prev) => !prev);
    };

    // Clear history handler (confirm then call backend)
    const clearHistory = async () => {
        if (!userData?._id) return;
        const ok = window.confirm("Clear all saved assistant commands from your history? This cannot be undone.");
        if (!ok) return;
        try {
            const url = `${serverURL || ''}/api/user/history/clear`;
            console.log('Clearing history via', url);
            await axios.post(url, { userId: userData._id }, { withCredentials: true });
            setHistory([]); // update UI
            // optionally clear the small panel content
            setCurrentCommand('');
            setCurrentResponse('');
        } catch (err) {
            console.error('clearHistory error:', err);
            // silent fail or show message
        }
    };

    // 🌐 Handle commands from Gemini
    const handleCommand = async (data, preOpenedTab = null, originalCommand = "") => {
        const { type, userInput, response } = data || {};
        const t = String(type || "").toLowerCase();
        // derive a usable query: prefer userInput, fallback to originalCommand
        let cleanQuery = (userInput || "").replace(/^(search for|search|play|open)\s*/i, "").trim();
        if (!cleanQuery && originalCommand) {
            cleanQuery = String(originalCommand).replace(/^(search for|search|play|open)\s*/i, "").trim();
        }

        let targetUrl = null;
        // prefer explicit type value, but also accept many youtube aliases
        if (t.includes("google") || t === "google_search") {
            targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery || "")}`;
        } else if (t.includes("calculator") || t === "calculator_open" || t === "open_calculator") {
            targetUrl = "https://www.google.com/search?q=calculator";
        } else if (t.includes("instagram")) {
            targetUrl = "https://www.instagram.com";
        } else if (t.includes("facebook")) {
            targetUrl = "https://www.facebook.com";
        } else if (t.includes("weather") || t === "show_weather") {
            targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery || "current weather")}`;
        } else if (t.includes("youtube") || t === "youtube_search" || t === "youtube_play") {
            // If query exists, prefer search; otherwise open YouTube home
            targetUrl = cleanQuery
                ? `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`
                : "https://www.youtube.com";
        }

        // Open the tab immediately if preOpenedTab exists
        if (targetUrl) {
            try {
                if (preOpenedTab) preOpenedTab.location.href = targetUrl;
                else window.open(targetUrl, "_blank", "noopener,noreferrer");
            } catch {
                window.location.href = targetUrl;
            }
        }
        if (response) {
            setCurrentResponse(response);
            await speak(response);
        }

        // Push the actual user command (not just userInput) to history
        if (userData && userData._id && originalCommand) {
            try {
                const pushUrl = `${serverURL || ''}/api/user/history`;
                await axios.post(pushUrl, { userId: userData._id, command: originalCommand }, { withCredentials: true });
            } catch (e) {
                console.warn('Could not push history (action):', e?.message || e);
            }
        }
    };

    // Extract only the speakable response text
    const extractSpeakable = (raw) => {
        if (raw == null) return null;
        const stripFences = (s) => {
            if (typeof s !== "string") return s;
            const match = s.match(/```(?:\w*\n)?([\s\S]*?)```/);
            return match ? match[1].trim() : s.trim();
        };
        try {
            if (typeof raw === "string") {
                const cleaned = stripFences(raw);
                try {
                    const parsed = JSON.parse(cleaned);
                    if (parsed.response) return parsed.response.trim();
                    if (parsed.text) return parsed.text.trim();
                    raw = parsed;
                } catch {
                    return cleaned.replace(/^[\s`]+|[\s`]+$/g, "").trim() || null;
                }
            }
            if (typeof raw === "object") {
                if (raw.response) return raw.response.trim();
                if (raw.text) return raw.text.trim();
            }
        } catch (e) {
            console.warn("extractSpeakable error:", e);
        }
        return null;
    };

    // Helper: parse assistant output text into an object if possible
    const parseAssistantOutput = (raw) => {
        if (!raw) return null;
        // If already an object, return it
        if (typeof raw === "object") return raw;
        if (typeof raw !== "string") return null;

        // Remove code fences and surrounding text, then try to find a JSON object substring
        const fenceMatch = raw.match(/```(?:\w*\n)?([\s\S]*?)```/);
        const candidate = fenceMatch ? fenceMatch[1].trim() : raw.trim();

        // Try direct JSON parse of candidate
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === "object") return parsed;
        } catch (_) { /* ignore */ }

        // Fallback: try to extract {...} substring and parse
        const jsonMatch = candidate.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                if (parsed && typeof parsed === "object") return parsed;
            } catch (_) { /* ignore */ }
        }

        return null;
    };

    // 🎤 Speech Recognition Setup
    useEffect(() => {
        if (!activated) return;

        // helper keywords used by the recognition fallback
        const actionKeywords = ['youtube', 'google', 'search', 'open', 'play', 'facebook', 'instagram', 'weather', 'calculator'];

        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("SpeechRecognition not supported in this browser");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            setFlash(false); // blue flash OFF at recognition start
            setListening(true);
        };
        recognition.onerror = (e) => {
            console.error("⚠️ Recognition error:", e.error);
            setFlash(false); // flash OFF on error
            setListening(false);
        };
        recognition.onend = () => {
            setFlash(false); // flash OFF when recognition ends
            setListening(false);
            if (!isSpeakingRef.current) {
                console.log("🔁 Restarting recognition...");
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (err) {
                        console.warn("Could not restart recognition:", err);
                    }
                }, 1000);
            }
        };

        recognition.onresult = async (evt) => {
            const last = evt.results.length - 1;
            const transcript = (evt.results[last][0].transcript || "").trim();
            if (!transcript) return;

            const lower = transcript.toLowerCase();
            const nameLower = (assistantName || "").toLowerCase();
            if (!nameLower || !lower.includes(nameLower)) {
                setFlash(false);
                setCurrentCommand("");
                setCurrentResponse("");
                return;
            }

            // Blue flash ON only when assistant name is detected
            setFlash(true);

            const command = transcript
                .replace(new RegExp(nameLower, "ig"), "")
                .trim()
                .replace(/^[:,\-\s]+/, "");
            if (!command) return;

            setCurrentCommand(command);
            setCurrentResponse(""); // clear previous response

            try {
                recognition.stop();
            } catch (_) { }

            isSpeakingRef.current = true;

            let preTab = null;
            // Pre-open a blank tab (do NOT use noopener/noreferrer here)
            // so we can later set preTab.location.href to navigate it.
            if (/(youtube|google|search|play|open|facebook|instagram|weather|calculator)/i.test(command)) {
                try {
                    preTab = window.open("about:blank", "_blank"); // keep reference
                    if (preTab && typeof preTab.focus === "function") preTab.focus();
                } catch (e) {
                    preTab = null;
                }
            }
            let shouldOpenTab = false;
            let speakable = null;
            let handled = false;

            try {
                const resp = await axios.get(`${serverURL || ""}/`, {
                    params: { prompt: command, userName: username, assistantName },
                    withCredentials: true,
                });

                // Resp is available here; parse and act inside this try block
                // extract speakable text
                speakable = extractSpeakable(resp.data);

                // parse JSON-like assistant output if present
                const parsed = parseAssistantOutput(resp.data) || {};

                // Determine action intent (prefer parsed.type)
                const typeStr = String(parsed.type || "").toLowerCase();
                if (["google_search", "open_calculator", "calculator_open", "open_instagram", "open_youtube", "youtube_search", "youtube_play", "open_facebook", "show_weather"].includes(typeStr)) {
                    shouldOpenTab = true;
                }

                // fallback heuristic if no explicit type
                if (!shouldOpenTab && !typeStr) {
                    const lc = command.toLowerCase();
                    shouldOpenTab = actionKeywords.some(k => lc.includes(k));
                }

                // if we pre-opened a tab but model doesn't require it, close it
                if (!shouldOpenTab && preTab) {
                    try { preTab.close(); } catch (_) { }
                    preTab = null;
                }

                // prepare payload to send to handler (parsed object preferred)
                const actionPayload = Object.keys(parsed).length ? parsed : resp.data;

                // call handler (will open tab if needed)
                await handleCommand(actionPayload, preTab, command);
                handled = true;

                // If not handled (defensive), set speakable response if any
                if (!handled && speakable) {
                    setCurrentResponse(speakable);
                }
            } catch (err) {
                console.error("🚨 Server call failed:", err?.response?.data || err.message || err);
                setCurrentResponse("Sorry, I couldn't find the answer.");
            }

            // if still not handled, speak fallback and push history
            if (!handled) {
                if (speakable) {
                    await speak(speakable);
                } else {
                    await speak("Sorry, I couldn't find the answer.");
                }
                // Push the non-action user command to history as well
                try {
                    if (userData && userData._id && command) {
                        const pushUrl = `${serverURL || ''}/api/user/history`;
                        await axios.post(pushUrl, { userId: userData._id, command }, { withCredentials: true });
                    }
                } catch (pushErr) {
                    console.warn('Could not push history (non-action):', pushErr?.message || pushErr);
                }
            }

            isSpeakingRef.current = false;
            setFlash(false); // blue flash OFF after command is handled
            try {
                recognition.start();
            } catch (_) { }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (e) {
            console.warn("Could not start recognition:", e);
        }

        return () => {
            try {
                recognition.onresult = null;
                recognition.onend = null;
                recognition.onerror = null;
                recognition.onstart = null;
                recognition.stop();
            } catch (_) { }
            recognitionRef.current = null;
            setFlash(false);
            setListening(false);
        };
    }, [activated, assistantName, serverURL, username]);

    // 🟢 Enable voice
    const enableVoice = () => {
        try {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
            setActivated(true);
        } catch (e) {
            console.error("Speech unlock failed:", e);
        }
    };

    return (
        <div className="home-bg">
            {/* Responsive top-right menu */}
            <div className="topbar-btns">
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
                <button
                    className="get-history-btn"
                    onClick={handleGetHistory}
                    disabled={historyLoading}
                    aria-busy={historyLoading}
                >
                    {historyLoading ? "Loading..." : (showHistory ? "Hide History" : "Get History")}
                </button>
            </div>
            {/* Hamburger menu for mobile */}
            <button className="menu-icon-btn" onClick={() => setMenuOpen((v) => !v)}>
                <FaBars />
            </button>
            {menuOpen && (
                <div className="mobile-menu-panel">
                    <button className="logout-btn" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                        Logout
                    </button>
                    <button className="get-history-btn" onClick={() => { setMenuOpen(false); handleGetHistory(); }}>
                        {showHistory ? "Hide History" : "Get History"}
                    </button>
                </div>
            )}
            <div className="home-container">
                <h1 className="home-title">Virtual Assistant</h1>
                <p className="home-subtitle">Hi {username} — meet your assistant</p>
                {!activated ? (
                    <button className="home-cta" onClick={enableVoice}>
                        🎤 Activate Voice Assistant
                    </button>
                ) : (
                    <p className="voice-active">
                        🎧 Listening... Say "{assistantName}" {listening && <FaMicrophone className="voice-mic" />}
                    </p>
                )}
                <div className={`assistant-card${flash ? " assistant-flash" : ""}${speakingFlash ? " assistant-speaking-flash" : ""}`}>
                    {assistantImage ? (
                        <img src={assistantImage} alt={assistantName} className="assistant-image" />
                    ) : (
                        <div className="assistant-placeholder">?</div>
                    )}
                    <div className="assistant-info">
                        <h2 className="assistant-name">{assistantName}</h2>
                        <p className="assistant-desc">
                            This is {assistantName}. You can customize me by clicking below.
                        </p>
                        <button className="home-cta" onClick={handleClick}>
                            {userData ? "Customize Assistant" : "Sign In to Customize"}
                        </button>
                    </div>
                </div>
                {/* User command and assistant response below the assistant info box */}
                <div className="interaction-panel">
                    <p className="command-text">
                        {currentCommand && <span><b>You:</b> {currentCommand}</span>}
                    </p>
                    <p className="response-text">
                        {currentResponse && <span><b>Assistant:</b> {currentResponse}</span>}
                    </p>
                </div>
            </div>
            {showHistory && (
                <div className="history-panel">
                    <button
                        className="history-close-btn"
                        onClick={() => setShowHistory(false)}
                        aria-label="Close history"
                    >
                        <IoMdClose size={28} />
                    </button>
                    <h3>User Command History</h3>
                    <div className="history-list">
                        {historyLoading ? (
                            <p>Loading history...</p>
                        ) : historyError ? (
                            <div>
                                <p className="history-error-text">Could not load history: {historyError}</p>
                                <button
                                    className="history-retry-btn"
                                    onClick={fetchHistory}
                                >
                                    Retry
                                </button>
                            </div>
                        ) : history.length === 0 ? (
                            <p>No history found.</p>
                        ) : (
                            <ul>
                                {history.map((cmd, idx) => (
                                    <li key={idx} title={cmd}>{cmd}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Clear button at bottom */}
                    <button className="history-clear-btn" onClick={clearHistory}>
                        Clear History
                    </button>
                </div>
            )}
        </div>
    );
}

export default Home;
