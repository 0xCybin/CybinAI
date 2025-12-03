"""Authentication API endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import DbSession, AuthenticatedUser
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenRefresh,
    PasswordChange,
    AuthResponse,
    TokenPair,
    MeResponse,
    UserResponse,
    TenantInfo,
)
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, summary="Register a new business")
async def register(data: UserRegister, db: DbSession):
    service = AuthService(db)
    try:
        result = await service.register(data)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AuthResponse, summary="Login")
async def login(data: UserLogin, db: DbSession):
    service = AuthService(db)
    try:
        result = await service.login(data)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenPair, summary="Refresh Token")
async def refresh_token(data: TokenRefresh, db: DbSession):
    service = AuthService(db)
    try:
        result = await service.refresh_tokens(data.refresh_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=MeResponse, summary="Get Current User")
async def get_me(current: AuthenticatedUser):
    return MeResponse(
        user=UserResponse.model_validate(current.user),
        tenant=TenantInfo.model_validate(current.tenant),
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT, summary="Change Password")
async def change_password(data: PasswordChange, current: AuthenticatedUser, db: DbSession):
    service = AuthService(db)
    try:
        await service.change_password(current.user, data.current_password, data.new_password)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout")
async def logout(current: AuthenticatedUser):
    return None
