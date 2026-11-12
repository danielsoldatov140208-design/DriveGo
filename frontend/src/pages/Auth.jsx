import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Auth() {
  const location = useLocation()
  const navigate = useNavigate()
  const register = location.pathname === '/register'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setBusy(true)
    try {
      const data = await api(register ? '/auth/register' : '/auth/login', {
        method: 'POST', body: JSON.stringify({ email: form.get('email').trim(), password: form.get('password') })
      })
      sessionStorage.setItem('drivego_token', data.token)
      navigate(location.state?.from?.startsWith('/cars/') ? location.state.from : '/profile', { replace: true })
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <section className="auth-layout"><aside className="auth-story"><div className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В DRIVEGO</div><h2>Твои планы.<br/>Твои дороги.<br/><span>Твой DriveGo.</span></h2><img src="/cars/camry.jpg" alt="Toyota Camry"/><p>Один аккаунт — все твои поездки.<br/>Бронируй автомобили и управляй арендой онлайн.</p></aside><div className="auth-panel"><div className="eyebrow">НАЧНИ СВОЙ МАРШРУТ</div><h1>{register?'Создать аккаунт':'С возвращением'}</h1><p>{register?'Зарегистрируйся, чтобы забронировать первую поездку.':'Войди, чтобы продолжить путешествие.'}</p><form className="auth-form" onSubmit={submit}><label htmlFor="email">Email</label><input id="email" name="email" placeholder="you@example.com" type="email" autoComplete="email" required maxLength={254} disabled={busy}/><label htmlFor="password">Пароль (от 8 символов)</label><input id="password" name="password" placeholder="Не менее 8 символов" type="password" autoComplete={register?'new-password':'current-password'} required minLength={8} maxLength={128} disabled={busy}/>{error&&<p role="alert">{error}</p>}<button disabled={busy}>{busy?'Подождите…':register?'Зарегистрироваться':'Войти'}</button></form><Link to={register?'/login':'/register'} state={location.state}>{register?'Уже есть аккаунт? Войти':'Создать аккаунт'}</Link></div></section>
}