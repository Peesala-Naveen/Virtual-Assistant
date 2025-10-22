import React from 'react'
import './Card.css'
import { userDataContext } from '../context/UserContext.jsx'

function Card({ image, selected, onClick }) {
    return (
        <div className={`card${selected ? ' selected' : ''}`} onClick={onClick}>
            {image && (
                <img src={image} alt="Card image" className="card-image" />
            )}
        </div>
    )
}

export function PlusCard({ onAddImage }) {
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onAddImage(e.target.files[0]);
        }
    };

    return (
        <div className="card plus-card">
            <label className="plus-icon" style={{ cursor: 'pointer' }}>
                +
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </label>
        </div>
    );
}

export default Card
