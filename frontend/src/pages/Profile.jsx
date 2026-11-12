import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BookingCard from '../BookingCard'
import { api } from '../api'

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api('/auth/me', { signal: controller.signal }), api('/bookings', { signal: controller.signal })])
      .then(([u, b]) => { setUser(u); setBookings(b) })
      .catch(e => {
        if (e.name === 'AbortError') return
        if (e.status === 401) {
          sessionStorage.removeItem('drivego_token')
          navigate('/login', { replace: true, state: { from: '/profile' } })
        } else setError(e.message)
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [navigate, attempt])
  async function cancel(id) {
    setBusy(true)
    setError('')
    try {
      const updated = await api('/bookings/' + id + '/cancel', { method: 'POST' })
      setBookings(items => items.map(b => b.id === id ? updated : b))
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    try {
      await api('/auth/logout', { method: 'POST' })
      sessionStorage.removeItem('drivego_token')
      navigate('/login')
    } catch (e) {
      if (e.status === 401) { sessionStorage.removeItem('drivego_token'); navigate('/login') }
      else setError(e.message)
    } finally { setBusy(false) }
  }
  return <section className="page-section profile-page"><div className="eyebrow">МОЙ DRIVEGO</div><h1>Твои поездки.<br/><span className="muted">Всё под контролем.</span></h1>{location.state?.message&&<p role="status">{location.state.message}</p>}{loading&&<p role="status">Загрузка бронирований…</p>}{error&&<div role="alert">{error} <button onClick={()=>{setLoading(true);setError('');setAttempt(attempt+1)}}>Повторить</button></div>}{user&&<div className="account-panel"><div className="avatar">{user.email.slice(0,1).toUpperCase()}</div><div><div className="eyebrow">ТВОЙ АККАУНТ</div><p>{user.email}</p></div><button className="secondary" onClick={logout} disabled={busy}>Выйти ↗</button></div>}<div className="section-heading"><h2>Мои бронирования</h2><Link className="text-link accent" to="/cars">Новая поездка ↗</Link></div>{!loading&&!error&&!bookings.length&&<div className="empty-state"><h3>Впереди ещё много дорог</h3><p>У тебя пока нет бронирований. Самое время спланировать первую поездку.</p><Link className="button" to="/cars">Выбрать автомобиль ↗</Link></div>}<div className="booking-list">{bookings.map(booking=><BookingCard key={booking.id} booking={booking} onCancel={cancel} disabled={busy}/>)}</div></section>
}