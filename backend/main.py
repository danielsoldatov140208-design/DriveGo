import hashlib
import os
import secrets
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, select, text, String, Integer, Date, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session
from sqlalchemy.exc import IntegrityError

load_dotenv()
url = os.getenv("DATABASE_URL")
if not url:
    raise RuntimeError("Set DATABASE_URL in backend/.env; see .env.example")
if url.startswith(("postgres://", "postgresql://")):
    url = "postgresql+psycopg://" + url.split("://", 1)[1]
engine = create_engine(url, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Car(Base):
    __tablename__ = "cars"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    price: Mapped[int] = mapped_column(Integer)
    image: Mapped[str] = mapped_column(String(255), default="/cars/camry.jpg")

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), index=True)
    start_date: Mapped[date] = mapped_column(Date)
    finish_date: Mapped[date] = mapped_column(Date)
    total_price: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="active")
    car: Mapped[Car] = relationship()

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with SessionLocal.begin() as db:
        if engine.dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(7349281)"))
        if not db.scalar(select(Car.id).limit(1)):
            for name, price in [("Toyota Camry",15000),("Hyundai Elantra",12000),("Kia K5",17000),("BMW 520i",25000)]:
                db.add(Car(name=name, price=price))
    yield

app = FastAPI(title="DriveGo API", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=[s.strip() for s in os.getenv("CORS_ORIGINS","http://localhost:5173,http://127.0.0.1:5173").split(",") if s.strip()],
    allow_methods=["GET","POST"], allow_headers=["Authorization","Content-Type"])

def get_db():
    with SessionLocal() as db:
        yield db

bearer = HTTPBearer(auto_error=False)

def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    if credentials:
        session = db.get(AuthSession, hashlib.sha256(credentials.credentials.encode()).hexdigest())
        if session and session.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
            return db.get(User, session.user_id)
    raise HTTPException(401, "Войдите в аккаунт", headers={"WWW-Authenticate":"Bearer"})

class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=8, max_length=128)

class BookingInput(BaseModel):
    car_id: int = Field(gt=0)
    start_date: date
    finish_date: date

def hash_password(password, salt):
    return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()

def login_response(user, db):
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
        expires_at=datetime.now(timezone.utc)+timedelta(days=7)))
    db.commit()
    return {"token":token, "user":{"id":user.id,"email":user.email}}

@app.post("/auth/register", status_code=201)
def register(data: Credentials, db: Session = Depends(get_db)):
    salt = secrets.token_hex(16)
    user = User(email=data.email.lower(), password_hash=salt+":"+hash_password(data.password,salt))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Этот email уже зарегистрирован")
    return login_response(user,db)

@app.post("/auth/login")
def login(data: Credentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    salt, expected = user.password_hash.split(":") if user else ("00"*16,"00"*64)
    valid = secrets.compare_digest(hash_password(data.password,salt),expected)
    if not user or not valid:
        raise HTTPException(401,"Неверный email или пароль")
    return login_response(user,db)

@app.get("/auth/me")
def me(user: User = Depends(current_user)):
    return {"id":user.id,"email":user.email}

@app.post("/auth/logout", status_code=204)
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer), user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(db.get(AuthSession,hashlib.sha256(credentials.credentials.encode()).hexdigest()))
    db.commit()

@app.get("/")
def home(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"message":"DriveGo API работает"}

@app.get("/cars")
def cars(db: Session = Depends(get_db)):
    return db.scalars(select(Car).order_by(Car.id)).all()

@app.get("/cars/{car_id}")
def car(car_id: int, db: Session = Depends(get_db)):
    result = db.get(Car,car_id)
    if not result:
        raise HTTPException(404,"Автомобиль не найден")
    return result

def booking_view(b):
    return {"id":b.id,"car":b.car,"start_date":b.start_date,"finish_date":b.finish_date,"total_price":b.total_price,"status":b.status}

@app.post("/bookings", status_code=201)
def create_booking(data: BookingInput, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.start_date < datetime.now(ZoneInfo("Asia/Oral")).date():
        raise HTTPException(422,"Дата начала не может быть в прошлом")
    if data.finish_date <= data.start_date:
        raise HTTPException(422,"Дата окончания должна быть позже начала")
    # Serialize reservations for the same car, including concurrent requests.
    car = db.scalar(select(Car).where(Car.id == data.car_id).with_for_update())
    if not car:
        raise HTTPException(404,"Автомобиль не найден")
    conflict = db.scalar(select(Booking.id).where(Booking.car_id == car.id, Booking.status == "active",
        Booking.start_date < data.finish_date, Booking.finish_date > data.start_date).limit(1))
    if conflict:
        raise HTTPException(409,"Автомобиль уже забронирован на эти даты")
    booking = Booking(user_id=user.id,car_id=car.id,start_date=data.start_date,finish_date=data.finish_date,
        total_price=(data.finish_date-data.start_date).days*car.price)
    db.add(booking)
    db.commit()
    return booking_view(booking)

@app.get("/bookings")
def bookings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [booking_view(b) for b in db.scalars(select(Booking).where(Booking.user_id == user.id).order_by(Booking.id.desc())).all()]

@app.post("/bookings/{booking_id}/cancel")
def cancel(booking_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    booking = db.scalar(select(Booking).where(Booking.id == booking_id,Booking.user_id == user.id).with_for_update())
    if not booking:
        raise HTTPException(404,"Бронирование не найдено")
    booking.status = "cancelled"
    db.commit()
    return booking_view(booking)
