import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.note import Note

client = TestClient(app)

def test_full_flow():
    print("--- 1. Testing Health Endpoints ---")
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("Root OK:", res.json())

    test_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "strongpassword123"

    print("\n--- 2. Testing Registration ---")
    reg_res = client.post("/api/v1/auth/register", json={
        "email": test_email,
        "password": test_password
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    reg_data = reg_res.json()
    token = reg_data["access_token"]
    user_id = reg_data["user"]["id"]
    print(f"Registered user successfully! ID: {user_id}")

    headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 3. Testing Login ---")
    login_res = client.post("/api/v1/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    assert login_res.json()["user"]["email"] == test_email
    print("Login OK!")

    print("\n--- 4. Testing Get Profile (/me) ---")
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_id
    print("Get /me OK!")

    print("\n--- 5. Testing Offline-First Batch Sync (/api/v1/notes/sync) ---")
    client_note_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    sync_payload = {
        "last_synced_at": None,
        "push_notes": [
            {
                "id": client_note_id,
                "title": "Welcome to Mindful Canvas",
                "content": "<p>This is my first offline note synchronized with Neon!</p>",
                "is_pinned": True,
                "tags": ["personal", "welcome"],
                "deleted_at": None,
                "created_at": now_iso,
                "updated_at": now_iso
            }
        ]
    }

    sync_res = client.post("/api/v1/notes/sync", json=sync_payload, headers=headers)
    assert sync_res.status_code == 200, f"Sync failed: {sync_res.text}"
    sync_data = sync_res.json()
    assert client_note_id in sync_data["synced_ids"]
    print("Batch Sync Push OK! Synced IDs:", sync_data["synced_ids"])

    print("\n--- 6. Testing Notes Retrieval ---")
    notes_res = client.get("/api/v1/notes", headers=headers)
    assert notes_res.status_code == 200
    notes = notes_res.json()
    assert len(notes) == 1
    assert notes[0]["id"] == client_note_id
    assert notes[0]["tags"] == ["personal", "welcome"]
    assert notes[0]["is_pinned"] is True
    print(f"Note retrieved from Neon! Title: '{notes[0]['title']}', Pinned: {notes[0]['is_pinned']}, Tags: {notes[0]['tags']}")

    print("\n--- 7. Cleanup Test User from Neon ---")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
            db.commit()
            print("Test user and associated notes cleanly deleted.")
    finally:
        db.close()

    print("\n===========================================")
    print("ALL TESTS PASSED! Backend is 100% operational.")
    print("===========================================")

if __name__ == "__main__":
    test_full_flow()
