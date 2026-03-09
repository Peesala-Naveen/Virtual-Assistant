//This is used to connect the database in mogondb atlas with this code
import mongoose from "mongoose";
import dotenv from "dotenv"; //Load environment variables from .env like PORT...
dotenv.config()
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("DB is connected!")
    } catch (error) {
        console.log(error)
    }
}
export default connectDB