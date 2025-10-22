import React, { useContext, useState, useEffect } from 'react'
import './Customize2.css'
import { userDataContext } from '../context/userContext.jsx'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function Customize2() {
    const context = useContext(userDataContext) || {}
    const { userData, backendImage, selectedImage, serverURL, setUserData } = context
    const navigate = useNavigate()
    const [assistantName, setAssistantName] = useState(userData?.assistantName || '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Auth guard: redirect to signin if not authenticated (no userData and no local token)
    useEffect(() => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || null
        if (!userData && !token) {
            navigate('/signin', { replace: true })
        }
    }, [userData, navigate])

    const handleUpdateAssistant = async () => {
        setLoading(true)
        setError('')
        try {
            let formData = new FormData()
            formData.append("assistantName", assistantName)
            if (backendImage instanceof File) {
                formData.append("assistantImage", backendImage)
            } else if (selectedImage) {
                formData.append("imageUrl", selectedImage)
            }

            const token = localStorage.getItem('access_token') || localStorage.getItem('token') || null
            const headers = token ? { Authorization: `Bearer ${token}` } : {}

            const result = await axios.post(
                `${serverURL}/api/user/update`,
                formData,
                { withCredentials: true, headers }
            )

            if (result?.data) {
                if (typeof setUserData === 'function') setUserData(result.data)
                navigate('/')
            }
        } catch (err) {
            console.error('Customize2 update error:', err)
            // handle 401: clear auth and redirect to signin
            if (err.response?.status === 401) {
                setError('Session expired — please sign in again.')
                // clear stored tokens and context
                localStorage.removeItem('access_token')
                localStorage.removeItem('token')
                if (typeof setUserData === 'function') setUserData(null)
                // give user a moment to read the message then redirect
                setTimeout(() => navigate('/signin', { replace: true }), 1000)
            } else {
                setError(err.response?.data?.message || err.message || 'Update failed')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="customize2-bg">
            <div className="customize2-center">
                <h1 className="customize2-title">Enter your Assistant Name</h1>
                <input
                    className="customize2-input"
                    type="text"
                    placeholder="Eg..Siddhu"
                    value={assistantName}
                    onChange={e => setAssistantName(e.target.value)}
                />
                {assistantName.trim() !== '' && (
                    <button
                        className="customize2-next-btn"
                        onClick={handleUpdateAssistant}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner"></span> : 'Create Assistant'}
                    </button>
                )}
                {error && <p className="error-message" style={{ color: '#ffd700' }}>{error}</p>}
            </div>
        </div>
    )
}

export default Customize2