import React, { useContext } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'

import SignUp from './pages/SignUp.jsx'
import SignIn from './pages/SignIn.jsx'
import Customize from './pages/Customize.jsx'
import Customize2 from './pages/Customize2.jsx'
import Home from './pages/Home.jsx'
import { userDataContext } from './context/UserContext.jsx'


function App() {
  const { userData } = useContext(userDataContext);
  return (
    <Routes>
      <Route path="/" element={(userData?.assistantImage && userData?.assistantName) ? <Home /> : <Navigate to="/customize" />} />
      <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />
      <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
      <Route path="/customize" element={userData ? <Customize /> : <Navigate to="/signin" />} />
      <Route path="/customize2" element={userData ? <Customize2 /> : <Navigate to="/signin" />} />
    </Routes>
  )
}

export default App
