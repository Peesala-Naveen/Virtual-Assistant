import React, { useContext, useState } from 'react'
import '../styles/sign.css'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { userDataContext } from '../context/userContext.jsx'
import axios from 'axios'


function SignUp() {
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [emailExists, setEmailExists] = useState(false)
    const [checkingEmail, setCheckingEmail] = useState(false)
    const { serverURL, userData, setUserData } = useContext(userDataContext);
    const navigate = useNavigate()
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const checkEmail = async (value) => {
        const v = (value || '').toString().trim()
        if (!v) {
            setEmailExists(false)
            return
        }
        setCheckingEmail(true)
        try {
            const res = await axios.get(`${serverURL}/api/auth/check-email`, {
                params: { email: v },
            })
            setEmailExists(!!res.data?.exists)
        } catch (err) {
            console.error('checkEmail error:', err)
            // assume not exists on error to avoid blocking signup
            setEmailExists(false)
        } finally {
            setCheckingEmail(false)
        }
    }

    const handleSignUp = async (e) => {
        e.preventDefault();
        if (emailExists) {
            setError('Email already exists')
            return
        }
        setLoading(true)
        try {
            let result = await axios.post(`${serverURL}/api/auth/signup`, { name, email, password }, { withCredentials: true });
            // save token if returned
            const token = result.data?.token || result.data?.accessToken || result.data?.jwt || null
            if (token) {
                localStorage.setItem('token', token)
                // also store under access_token for API calls that expect that key
                localStorage.setItem('access_token', token)
            }
            if (typeof setUserData === 'function') setUserData(result.data);
            setError(''); // clear error on success
            navigate('/customize')
        } catch (error) {
            console.log(error)
            setError(error.response?.data?.message || 'Sign up failed');
            if (typeof setUserData === 'function') setUserData(null);
        }
        setLoading(false)
    }

    const updateUser = async (data) => {
        // If sending file, ensure `data` is FormData and do NOT set Content-Type header
        // prefer access_token key, fallback to token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        return axios.post(
            "http://localhost:8000/api/user/update",
            data,
            { withCredentials: true, headers }
        )
    }

    return (
        <div className="signup-container">
            <form className="signup-form" onSubmit={handleSignUp}>
                <h2>Register To <span>Virtual Assistant</span></h2>
                <input type="text" placeholder="Username" required onChange={(e) => setName(e.target.value)} value={name} />
                <input
                    type="email"
                    placeholder="Email"
                    required
                    autoComplete="username"
                    onChange={(e) => {
                        setEmail(e.target.value)
                        // clear exists flag while typing
                        setEmailExists(false)
                    }}
                    onBlur={(e) => checkEmail(e.target.value)}
                    value={email}
                />
                {/* inline message */}
                {checkingEmail ? (
                    <p className="error-message">Checking email...</p>
                ) : emailExists ? (
                    <p className="error-message">Email already registered</p>
                ) : null}
                <div className="password-input-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)} value={password}
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
                <button type="submit" disabled={loading || emailExists}>
                    {loading ? <span className="spinner"></span> : "Register"}
                </button>
                <p className="signup-link">
                    Already have an Account?{' '}
                    <span className="signin-span"
                        onClick={() => navigate('/signin')}>
                        Sign In
                    </span>
                </p>
            </form>
        </div>
    )
}

export default SignUp