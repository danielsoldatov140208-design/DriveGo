import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
const heroCars = [
  { name: 'Toyota Camry', image: '/cars/camry.jpg' },
  { name: 'Hyundai Elantra', image: '/cars/elantra.jpg' },
  { name: 'Kia K5', image: '/cars/k5.jpg' },
  { name: 'BMW 520i', image: '/cars/bmw520i.jpg' },
]

export default function Home(){
  const [activeCar, setActiveCar] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCar(current => (current + 1) % heroCars.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return <><section className="hero"><div className="hero-content"><div className="eyebrow"><i/> ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</div><h1>Больше свободы.<br/><span>Меньше условностей.</span></h1><p>Автомобиль под твой ритм жизни. Выбирай машину,<br/> бронируй онлайн и отправляйся навстречу планам.</p><div className="hero-actions"><Link className="button" to="/cars">Выбрать автомобиль ↗</Link><a className="text-link" href="#how">Как это работает ↓</a></div><div className="hero-note"><span>01 /</span> Для будней, выходных и новых маршрутов</div></div><div className="hero-visual"><span className="giant-word" aria-hidden="true">DRIVE</span><div className="hero-slides">{heroCars.map((car, index) => <img
  key={car.image}
  className={index === activeCar ? 'is-active' : ''}
  src={car.image}
  alt={index === activeCar ? car.name : ''}
  aria-hidden={index !== activeCar}
  fetchPriority={index === 0 ? 'high' : 'auto'}
/>)}</div><div className="image-caption"><span>В центре внимания</span><strong>{heroCars[activeCar].name} ↗</strong></div><span className="visual-tag">ГОРОД СТАНОВИТСЯ БЛИЖЕ</span></div></section><div className="benefit-strip"><div><b>↗</b><p><strong>Бронирование онлайн</strong>Планы начинаются с пары кликов</p></div><div><b>◷</b><p><strong>Аренда от одного дня</strong>Столько времени, сколько нужно</p></div><div><b>₸</b><p><strong>Понятная стоимость</strong>Расчёт до подтверждения брони</p></div></div><section className="intro-section"><div><div className="eyebrow">ВЫБИРАЙ СВОЙ МАРШРУТ</div><h2>Твоя следующая поездка<br/>начинается здесь.</h2></div><div><p>Деловая встреча, поездка за город или обычный день, который хочется сделать особенным. Найди свой автомобиль в автопарке DriveGo.</p><Link className="text-link accent" to="/cars">Открыть автопарк ↗</Link></div></section><section id="how" className="how-section"><div className="section-heading"><div><div className="eyebrow">ПРОСТО НАЧАТЬ</div><h2>Три шага до свободы</h2></div><span className="muted">Меньше хлопот. Больше движения.</span></div><div className="steps">{[['01','Выбери автомобиль','Открой автопарк и найди машину для своих планов.'],['02','Укажи даты','Выбери начало и окончание аренды. Стоимость рассчитается сразу.'],['03','Забронируй поездку','Войди в аккаунт и подтверди бронь. Все поездки — в личном кабинете.']].map(([n,t,d])=><article key={n}><div className="step-number">{n}<span>↗</span></div><h3>{t}</h3><p>{d}</p></article>)}</div></section><section className="cta-panel"><div className="eyebrow">DRIVE YOUR OWN WAY</div><h2>У города много дорог.<br/>Выбирай свою.</h2><Link className="button" to="/cars">Поехали ↗</Link></section></>}