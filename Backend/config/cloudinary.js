import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
})

// Upload a local file path to Cloudinary and return the upload result object
export async function uploadOnCloudinary(filePath) {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'virtual_assistant', // optional folder
            use_filename: true,
            unique_filename: false,
            overwrite: false
        })
        return result
    } catch (err) {
        console.error('uploadOnCloudinary error:', err)
        throw err
    }
}

export default uploadOnCloudinary