import React, { useState, useContext, useEffect } from 'react'
import Card from '../components/Card.jsx'
import './Customize.css'
import assist1 from '../assets/assist1.jpeg'
import assist2 from '../assets/assist2.jpg'
import assist3 from '../assets/assist3.jpeg'
import assist4 from '../assets/assist4.jpeg'
import assist5 from '../assets/assist5.jpeg'
import assist6 from '../assets/assist6.jpeg'
import assist7 from '../assets/assist7.jpeg'
import { userDataContext } from '../context/UserContext.jsx'
import { useNavigate } from 'react-router-dom'

const initialImages = [
    assist1, assist2, assist3, assist4, assist5, assist6, assist7
];

function Customize() {
    const context = useContext(userDataContext) || {}
    const { userData, setBackendImage, setSelectedImage } = context

    const [images, setImages] = useState(initialImages);
    const [selectedIdx, setSelectedIdx] = useState(null);
    // detect small screen (match CSS breakpoint)
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 800 : false);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 800);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    const navigate = useNavigate();

    // Auth guard: redirect to signin if not authenticated (no userData and no local token)
    useEffect(() => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || null
        if (!userData && !token) {
            navigate('/signin', { replace: true })
        }
    }, [userData, navigate])

    const handleSelect = (idx) => {
        setSelectedIdx(idx);
        const img = images[idx];
        if (typeof setSelectedImage === 'function') setSelectedImage(img);
        if (typeof setBackendImage === 'function') setBackendImage(null);
    }

    return (
        <div className="customize-bg">
            <h1 className="customize-title">Select your Assistant Image</h1>
            <div className="customize-card-container">
                <div className="images-container">
                    {/* styles moved to Customize.css */}

                    <div className="images-scroll">
                        {images.map((img, idx) => (
                            <Card
                                key={idx}
                                image={img}
                                selected={selectedIdx === idx}
                                onClick={() => handleSelect(idx)}
                            />
                        ))}
                    </div>
                </div>
            </div>
            {/* show inline Next on non-mobile (desktop/laptop) */}
            {selectedIdx !== null && !isMobile && (
                <div className="next-inline">
                    <button className="customize-next-btn" onClick={() => navigate("/customize2")}>Next</button>
                </div>
            )}
            {/* show sticky Next only on small screens (mobile) */}
            {selectedIdx !== null && isMobile && (
                <div className="next-sticky">
                    <button
                        className="customize-next-btn"
                        onClick={() => navigate("/customize2")}
                        style={{ width: '100%' }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

export default Customize
