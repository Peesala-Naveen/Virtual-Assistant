import { createContext, useState, useEffect, useRef } from 'react'
import axios from 'axios'
export const userDataContext = createContext();

function UserContext({ children }) {
    const serverURL = "https://virtual-assistant-backend-3dwn.onrender.com"
    const [userData, setUserData] = useState(null);
    const [backendImage, setBackendImage] = useState(null); // File or null
    const [selectedImage, setSelectedImage] = useState(null); // url string

    const didFetchRef = useRef(false); // prevent duplicate fetches in StrictMode

    const handleCurrentUser = async () => {
        if (didFetchRef.current) return; // already attempted
        didFetchRef.current = true;

        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || null;

        // Detect visible cookie names that suggest a session (only works for non-httpOnly cookies)
        const cookies = typeof document !== 'undefined' ? document.cookie : '';
        const hasVisibleSessionCookie = cookies && (cookies.includes('token=') || cookies.includes('access_token=') || cookies.includes('connect.sid') || cookies.includes('jwt='));

        // If no token and no visible session cookie, skip calling the endpoint to avoid 401 noise
        if (!token && !hasVisibleSessionCookie) {
            // Not authenticated (client-side) — don't hit the API
            setUserData(null);
            return;
        }

        try {
            // If token exists prefer header auth
            if (token) {
                const headers = { Authorization: `Bearer ${token}` };
                const resHeader = await axios.get(`${serverURL}/api/user/current`, { withCredentials: true, headers });
                setUserData(resHeader.data);
                return;
            }

            // Otherwise try cookie-based auth (httpOnly cookie may be sent)
            const resCookie = await axios.get(`${serverURL}/api/user/current`, { withCredentials: true });
            setUserData(resCookie.data);
            return;
        } catch (err) {
            // On failure treat as unauthenticated — avoid noisy logging for expected 401s
            const status = err?.response?.status;
            if (status && status !== 401) {
                console.log('handleCurrentUser error:', status, err?.response?.data || err.message);
            }
            setUserData(null);
        }
    }


    const getGeminiResponse = async (command) => {
        try {
            const result = await axios.post(`${serverURL}/api/user/asktoassistant`, { command }, { withCredentials: true })
            return result.data;
        } catch (error) {
            console.error('getGeminiResponse error:', error);
        }
    }

    useEffect(() => {
        handleCurrentUser();
    }, [])

    return (
        <userDataContext.Provider value={{ serverURL, userData, setUserData, backendImage, setBackendImage, selectedImage, setSelectedImage, getGeminiResponse }}>
            {children}
        </userDataContext.Provider>
    )
}

export default UserContext
