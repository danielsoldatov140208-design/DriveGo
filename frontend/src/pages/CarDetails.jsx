import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, today } from '../api'


export default function CarDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [car, setCar] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [finishDate, setFinishDate] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    api('/cars/' + id, { signal: controller.signal }).then(setCar).catch(e => {
      if (e.name !== 'AbortError') setError(e.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id])
  const days = startDate && finishDate ? Math.max(0, (Date.parse(finishDate) - Date.parse(startDate)) / 86400000) : 0
  async function book(event) {
    event.preventDefault()
    setError('')
    if (startDate < today() || days < 1) {
      setError('Выберите будущие даты. Минимальная аренда — один день.')
      return
    }
    if (!sessionStorage.getItem('drivego_token')) {
      navigate('/login', { state: { from: '/cars/' + id } })
      return
    }
    setBusy(true)
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify({ car_id: car.id, start_date: startDate, finish_date: finishDate }) })
      navigate('/profile', { state: { message: 'Автомобиль забронирован!' } })
    } catch (e) {
      setError(e.message)
      if (e.status === 401) {
        sessionStorage.removeItem('drivego_token')
        navigate('/login', { state: { from: '/cars/' + id } })
      }
    } finally { setBusy(false) }
  }
  return <section className="page-section details-page"><Link className="back-link" to="/cars">← Весь автопарк</Link>{loading&&<p role="status">Загрузка автомобиля…</p>}{error&&<p role="alert">{error}</p>}{car&&<div className="cardetails"><div className="details-visual"><div className="eyebrow">DRIVEGO COLLECTION</div><h1>{car.name}</h1><img src={car.image||'/cars/camry.jpg'} alt={car.name} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/cars/camry.jpg'}}/><div className="details-note"><span>↗</span><div><h3>Свобода в каждом маршруте</h3><p>Выбери даты и спланируй свою следующую поездку.</p></div></div></div><form onSubmit={book}><div className="eyebrow">ТВОЯ СЛЕДУЮЩАЯ ПОЕЗДКА</div><h2>Забронировать</h2><p className="detail-price"><strong>{Number(car.price).toLocaleString('ru-RU')} ₸</strong> / день</p><label htmlFor="start">Начало аренды</label><input id="start" type="date" required min={today()} value={startDate} onChange={e=>setStartDate(e.target.value)} disabled={busy}/><label htmlFor="finish">Дата возврата</label><input id="finish" type="date" required min={startDate||today()} value={finishDate} onChange={e=>setFinishDate(e.target.value)} disabled={busy}/><div className="price-row"><span>Дней аренды</span><strong>{days}</strong></div><div className="price-row total"><span>Итого</span><strong>{(days*car.price).toLocaleString('ru-RU')} ₸</strong></div><p className="form-note">Дата окончания — день возврата, он не оплачивается.</p><button disabled={busy||!days}>{busy?'Бронирование…':'Забронировать ↗'}</button></form></div>}</section>
}