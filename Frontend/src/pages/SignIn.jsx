import React, { useState, useContext } from 'react'
import '../styles/sign.css'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { userDataContext } from '../context/userContext.jsx'
import axios from 'axios'

function SignIn() {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const { serverURL, userData, setUserData } = useContext(userDataContext)
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSignIn = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const response = await axios.post(`${serverURL}/api/auth/signin`, { email, password }, { withCredentials: true })
            // store access token (common key 'access') and fallbacks
            const access = response.data?.access || response.data?.token || response.data?.accessToken || response.data?.jwt || null
            if (access) {
                localStorage.setItem('access_token', access)
                localStorage.setItem('token', access) // keep existing key for compatibility
            }
            if (typeof setUserData === 'function') setUserData(response.data)
            setError('')
            setLoading(false)
            navigate('/customize')
        } catch (error) {
            setError(error.response?.data?.message || 'Sign in failed')
            setLoading(false)
        }
    }

    return (
        <div className="signin-container">
            <form className="signin-form" onSubmit={handleSignIn}>
                <h2>Sign In To <span>Virtual Assistant</span></h2>
                <input
                    type="email"
                    placeholder="Email"
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                />
                <div className="password-input-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                    />
                    <span
                        className="toggle-password"
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={0}
                        role="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </span>
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? <span className="spinner"></span> : "Sign In"}
                </button>
                <p className="signin-link">
                    Don't have an Account?{' '}
                    <span className="signup-span" onClick={() => navigate('/signup')}>
                        Sign Up
                    </span>
                </p>
            </form>
        </div>
    )
}

export default SignIn