import express from "express";
import dotenv from "dotenv"; //Load environment variables from .env like PORT...
dotenv.config()
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import cors from "cors";
import * as geminiModule from "./gemini.js";

const geminiResponse = geminiModule?.default || geminiModule?.geminiResponse || geminiModule;

const app = express()
app.use(cors({
    origin: 'https://virtual-assistant-frontend1.onrender.com',
    credentials: true
}))
const port = process.env.PORT || 8000
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});
app.get("/", async (req, res) => {
    if (typeof geminiResponse !== "function") {
        console.error('geminiResponse is not available as a function. Inspect ./gemini.js export.');
        return res.status(500).json({
            ok: false,
            error: 'Server misconfiguration: gemini helper not available. See server log.'
        });
    }

    try {
        const prompt = req.query.prompt;
        const userName = req.query.userName || undefined;
        const assistantName = req.query.assistantName || undefined;
        const data = await geminiResponse(prompt, userName, assistantName);
        return res.json(data);
    } catch (err) {
        console.error('Error calling geminiResponse:', err);
        return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
});



app.listen(port, () => {
    connectDB()
    console.log(`Server Started on ${port}`)
})
