import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

temp = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = os.getenv("TEST_DATABASE_URL", "sqlite:///" + temp.name.replace("\\", "/") + "/test.db")
from main import app, Base, engine

@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)

def auth(client, email):
    r = client.post("/auth/register", json={"email": email, "password": "test-password-42"})
    assert r.status_code == 201, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}

def dates():
    start = datetime.now(ZoneInfo("Asia/Oral")).date() + timedelta(days=3)
    return {"car_id": 1, "start_date": str(start), "finish_date": str(start + timedelta(days=3))}

def test_booking_lifecycle(client):
    assert client.get("/").status_code == 200
    assert len(client.get("/cars").json()) == 4
    assert client.get("/cars/1").json()["image"] == "/cars/camry.jpg"
    assert client.get("/cars/999").status_code == 404
    assert client.get("/bookings").status_code == 401
    headers = auth(client, "one@example.com")
    other = auth(client, "two@example.com")
    assert client.post("/auth/register", json={"email":"ONE@example.com","password":"test-password-42"}).status_code == 409
    assert client.post("/auth/login", json={"email":"one@example.com","password":"wrong-pass"}).status_code == 401
    assert client.post("/auth/login", json={"email":"ONE@example.com","password":"test-password-42"}).status_code == 200
    data = dates()
    invalid = {**data, "finish_date": data["start_date"]}
    assert client.post("/bookings",json=invalid,headers=headers).status_code == 422
    assert client.post("/bookings",json={**data,"start_date":"2020-01-01"},headers=headers).status_code == 422
    r = client.post("/bookings",json=data,headers=headers)
    assert r.status_code == 201, r.text
    booking = r.json()
    assert booking["total_price"] == 45000
    assert client.post("/bookings",json=data,headers=other).status_code == 409
    assert client.get("/bookings",headers=other).json() == []
    assert client.post(f"/bookings/{booking['id']}/cancel",headers=other).status_code == 404
    assert client.get("/bookings",headers=headers).json()[0]["id"] == booking["id"]
    assert client.post(f"/bookings/{booking['id']}/cancel",headers=headers).json()["status"] == "cancelled"
    assert client.post("/bookings",json=data,headers=other).status_code == 201
    end = data["finish_date"]
    next_end = str(datetime.fromisoformat(end).date()+timedelta(days=1))
    assert client.post("/bookings",json={**data,"start_date":end,"finish_date":next_end},headers=headers).status_code == 201
    assert client.post("/auth/logout",headers=headers).status_code == 204
    assert client.get("/bookings",headers=headers).status_code == 401

@pytest.mark.skipif(engine.dialect.name != "postgresql", reason="PostgreSQL row locks required")
def test_concurrent_booking(client):
    headers = auth(client, "race@example.com")
    def reserve(_):
        return client.post("/bookings",json=dates(),headers=headers).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(reserve, range(2))) == [201,409]

def test_restart_and_cors(client):
    headers = auth(client, "persist@example.com")
    created = client.post("/bookings", json=dates(), headers=headers)
    assert created.status_code == 201
    with TestClient(app) as restarted:
        assert restarted.get("/bookings", headers=headers).json()[0]["id"] == created.json()["id"]
        assert len(restarted.get("/cars").json()) == 4
    preflight = client.options("/bookings", headers={"Origin":"http://localhost:5173", "Access-Control-Request-Method":"POST", "Access-Control-Request-Headers":"authorization,content-type"})
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == "http://localhost:5173"
