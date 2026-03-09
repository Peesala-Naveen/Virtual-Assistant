//Auto login user with token if he was previously logged in that system 
import jwt from 'jsonwebtoken'

const isAuth = async (req, res, next) => {
    try {
        // Try Authorization header first (Bearer ...)
        const authHeader = req.headers?.authorization || req.headers?.Authorization
        let token = null

        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }

        // Fallbacks: cookie named 'token' or x-access-token header
        if (!token) {
            token = req.cookies?.token || req.headers['x-access-token'] || null
        }

        // If token missing or not a string, reject
        if (!token || typeof token !== 'string') {
            return res.status(401).json({ message: 'Unauthorized: token missing' })
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        // store user id from token (adjust key according to your token payload)
        req.userId = decoded?.id || decoded?.userId || decoded?.sub || null

        if (!req.userId) {
            return res.status(401).json({ message: 'Unauthorized: invalid token payload' })
        }

        next()
    } catch (err) {
        console.error('isAuth error:', err && err.message ? err.message : err)
        return res.status(401).json({ message: 'Unauthorized: invalid token' })
    }
}

export default isAuth;