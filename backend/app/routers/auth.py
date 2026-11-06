import secrets
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, GoogleAuthRequest, UserResponse, Token
from app.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/google", response_model=Token)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Verify Google OAuth access_token, id_token, or authorization code,
    and sign in or create the corresponding user in Neon PostgreSQL.
    """
    email: str | None = None

    with httpx.Client(timeout=10.0) as client:
        # 1. If authorization code is provided, exchange it for tokens first
        access_token = payload.access_token
        id_token = payload.id_token

        if payload.code and settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
            token_res = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": payload.code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": payload.redirect_uri or "postmessage",
                    "grant_type": "authorization_code",
                },
            )
            if token_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to exchange Google authorization code.",
                )
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            id_token = token_data.get("id_token")

        # 2. Verify via access_token against Google's official userinfo endpoint
        if access_token:
            userinfo_res = client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if userinfo_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google access token.",
                )
            info = userinfo_res.json()
            email = info.get("email")

        # 3. Or verify via id_token against Google's tokeninfo endpoint
        elif id_token:
            tokeninfo_res = client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
            if tokeninfo_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google ID token.",
                )
            info = tokeninfo_res.json()
            if settings.GOOGLE_CLIENT_ID and info.get("aud") != settings.GOOGLE_CLIENT_ID:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google token audience mismatch.",
                )
            email = info.get("email")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve email from Google account.",
        )

    email_clean = email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user:
        random_pw = get_password_hash(secrets.token_urlsafe(32))
        user = User(
            email=email_clean,
            hashed_password=random_pw,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(data={"sub": user.id, "email": user.email})
    return Token(
        access_token=jwt_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
