from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.user_schema import (
    PasswordResetConfirm,
    PasswordResetRequest,
    UserCreate,
    UserLogin,
    UserMessageResponse,
    UserResponse,
    UserUpdate,
)
from app.services import user_service
from app.services.exceptions import InvalidCredentialsError, PasswordResetError, UserConflictError

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.post(
    "",
    response_model=UserMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)) -> UserMessageResponse:
    try:
        user = user_service.create_user(db, user_data)
    except UserConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return UserMessageResponse(message="Usuario creado correctamente", data=user)


@router.post("/login", response_model=UserMessageResponse)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)) -> UserMessageResponse:
    try:
        user = user_service.authenticate_user(db, login_data)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return UserMessageResponse(message="Inicio de sesion correcto", data=user)


@router.post("/password-reset/request", response_model=UserMessageResponse)
def request_password_reset(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db),
) -> UserMessageResponse:
    user_service.request_password_reset(db, reset_data)
    return UserMessageResponse(
        message="Si el correo existe, enviaremos un enlace de recuperacion."
    )


@router.post("/password-reset/confirm", response_model=UserMessageResponse)
def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db),
) -> UserMessageResponse:
    try:
        user_service.confirm_password_reset(db, reset_data)
    except PasswordResetError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return UserMessageResponse(message="Contrasena actualizada correctamente")


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)) -> list[UserResponse]:
    return user_service.get_users(db)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserResponse:
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro un usuario con ese identificador.",
        )
    return user


@router.put("/{user_id}", response_model=UserMessageResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
) -> UserMessageResponse:
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro un usuario con ese identificador.",
        )

    try:
        updated_user = user_service.update_user(db, user, user_data)
    except UserConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return UserMessageResponse(message="Usuario actualizado correctamente", data=updated_user)


@router.delete("/{user_id}", response_model=UserMessageResponse)
def delete_user(user_id: int, db: Session = Depends(get_db)) -> UserMessageResponse:
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro un usuario con ese identificador.",
        )

    user_service.delete_user(db, user)
    return UserMessageResponse(message="Usuario eliminado correctamente")
