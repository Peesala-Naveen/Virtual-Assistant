import mongoose from "mongoose";

//Defining the Structure of the model or Table to store the data
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    assistantName: {
        type: String
    },
    assistantImage: {
        type: String
    },
    history: [
        { type: String }
    ]
}, { timestamps: true })

//Creating the model
const User = mongoose.model("User", userSchema)
export default User

// Log once when mongoose connects
try {
    if (mongoose && mongoose.connection) {
        // avoid attaching multiple listeners in case of repeated imports
        const hasConnectedListener = mongoose.connection.listeners('connected').length > 0
        if (!hasConnectedListener) {
            mongoose.connection.on('connected', () => {
                console.log('MongoDB connected')
            })
        }
    }
} catch (e) {
    // silent fail if mongoose isn't available yet
}