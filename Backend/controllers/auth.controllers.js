import genToken from "../config/token.js"
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const signUp = async (req, res) => {
    try {
        const { name, email, password } = req.body


        const existEmail = await User.findOne({ email })
        if (existEmail) {
            return res.status(400).json({ message: "Email already Exists!" })
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be atleast 6 Characters!" })
        }
        const hashedPassword = await bcrypt.hash(password, 10)  //creating a hashed password where the length of salt is 10
        const user = await User.create({     //Creating user
            name, password: hashedPassword, email
        })
        //Generating token
        const token = genToken(user._id)  //This function is defined in cnfig/token.js

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "None",
            secure: true
        })
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `Signup error ${error}` })
    }
}



export const logIn = async (req, res) => {
    try {
        const { email, password } = req.body


        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ message: "Email does not exist!!" })
        }
        const ismatch = await bcrypt.compare(password, user.password)
        if (!ismatch) {
            return res.status(400).json({ message: "Incorrect password" })
        }



        //Generating token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // changed: 30 days
        )  //This function is defined in cnfig/token.js

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "None",
            secure: true
        })
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `LogIn error ${error}` })
    }
}

export const LogOut = async (req, res) => {
    try {
        res.clearCookie("token")
        return res.status(200).json({ message: "LogOut Successfully" })
    } catch (error) {
        return res.status(500).json({ message: `LogOut Error ${error}` })
    }
}
