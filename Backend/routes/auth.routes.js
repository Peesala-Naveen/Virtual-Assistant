import express from "express"
import { logIn, LogOut, signUp } from "../controllers/auth.controllers.js"
import User from '../models/user.model.js'

const authRouter = express.Router()

authRouter.post("/signup", signUp)
authRouter.post("/signin", logIn)
authRouter.post("/logout", LogOut)

// Add email existence check
authRouter.get('/check-email', async (req, res) => {
    try {
        const email = (req.query.email || '').toString().trim().toLowerCase()
        if (!email) return res.status(400).json({ message: 'Email is required' })

        const user = await User.findOne({ email })
        return res.status(200).json({ exists: !!user })
    } catch (err) {
        console.error('check-email error:', err)
        return res.status(500).json({ message: 'Server error' })
    }
})

export default authRouter
