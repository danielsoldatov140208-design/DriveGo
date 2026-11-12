import { useEffect, useState } from 'react'
import { api } from './api'
import CarCard from './CarCard'


export default function Cars() {
  const [cars, setCars] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api('/cars', { signal: controller.signal }).then(setCars).catch(e => {
      if (e.name !== 'AbortError') setError(e.message)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  return <section id="cars" className="page-section">
    <div className="eyebrow">АВТОПАРК DRIVEGO</div><div className="section-heading"><div><h1>Твой автомобиль.<br/><span className="muted">Твой ритм.</span></h1><p>Выбирай, бронируй и открывай новые маршруты.</p></div><span className="collection-label">АРЕНДА ОТ 1 ДНЯ ↗</span></div>
    {loading && <p role="status">Загрузка автомобилей…</p>}
    {error && <div role="alert">{error} <button onClick={() => { setLoading(true); setError(''); setAttempt(attempt + 1) }}>Повторить</button></div>}
    {!loading && !error && !cars.length && <p>Автомобилей пока нет.</p>}
    <div className="cars-list">{cars.map(car => <CarCard key={car.id} {...car} />)}</div>
  </section>
}
