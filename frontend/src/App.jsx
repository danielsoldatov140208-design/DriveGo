import './App.css'
import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Header from './Header.jsx'
import Cars from "./Cars.jsx"
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import CarDetails from "./pages/CarDetails.jsx"
import Profile from "./pages/Profile.jsx"
import Auth from './pages/Auth.jsx'

const currentYear = new Date().getFullYear()
function App() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])

  return (
    <>
    <Header/>
    <main id="main-content"><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cars" element={<Cars />} />
        <Route path="/cars/:id" element={<CarDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Auth key="login" />} />
        <Route path="/register" element={<Auth key="register" />} />
        <Route path="*" element={<section className="page-section"><div className="eyebrow">404 / МАРШРУТ НЕ НАЙДЕН</div><h1>Кажется, здесь поворот.</h1><Link className="button" to="/cars">Вернуться в автопарк ↗</Link></section>} />
    </Routes></main><footer className="site-footer"><Link className="brand" to="/">Drive<span>Go</span></Link><p>Твой город. Твой ритм. Твоя свобода.</p><Link to="/cars">Автопарк ↗</Link><span>© {currentYear} DriveGo</span></footer>
    </>
  )
}

export default App
