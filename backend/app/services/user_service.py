from datetime import datetime, timedelta
from hashlib import sha256
from os import getenv
import secrets

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.models.password_reset_model import PasswordResetToken
from app.database.models.user_model import User
from app.schemas.user_schema import (
    PasswordResetConfirm,
    PasswordResetRequest,
    UserCreate,
    UserLogin,
    UserUpdate,
)
from app.services.email_service import send_password_reset_email
from app.services.exceptions import (
    InvalidCredentialsError,
    PasswordResetError,
    UserConflictError,
)
from app.utils.security import hash_password, verify_password


def get_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id_usuario).all()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id_usuario == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.correo == email).first()


def create_user(db: Session, user_data: UserCreate) -> User:
    normalized_email = str(user_data.correo).lower()
    if get_user_by_email(db, normalized_email):
        raise UserConflictError("Ya existe un usuario registrado con ese correo.")

    user = User(
        nombre=user_data.nombre.strip(),
        correo=normalized_email,
        contrasena=hash_password(user_data.contrasena),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError as exc:
        db.rollback()
        raise UserConflictError(
            "No se pudo crear el usuario porque el correo ya esta registrado."
        ) from exc


def authenticate_user(db: Session, login_data: UserLogin) -> User:
    normalized_email = str(login_data.correo).lower()
    user = get_user_by_email(db, normalized_email)

    if not user:
        raise InvalidCredentialsError(
            "Correo no existe, el usuario debe registrarse primero."
        )

    if not verify_password(login_data.contrasena, user.contrasena):
        raise InvalidCredentialsError("Correo o contrasena incorrectos.")

    return user


def request_password_reset(db: Session, reset_data: PasswordResetRequest) -> None:
    _ensure_password_reset_table(db)

    normalized_email = str(reset_data.correo).lower()
    user = get_user_by_email(db, normalized_email)

    if not user:
        return

    raw_token = secrets.token_urlsafe(32)
    token = PasswordResetToken(
        id_usuario=user.id_usuario,
        token_hash=_hash_reset_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )

    try:
        db.add(token)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

    frontend_url = getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/?reset_token={raw_token}"
    send_password_reset_email(user.correo, reset_link)


def confirm_password_reset(db: Session, reset_data: PasswordResetConfirm) -> None:
    _ensure_password_reset_table(db)

    token_hash = _hash_reset_token(reset_data.token)
    reset_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if (
        not reset_token
        or reset_token.used
        or reset_token.expires_at < datetime.utcnow()
    ):
        raise PasswordResetError("El enlace de recuperacion no es valido o ya vencio.")

    user = get_user_by_id(db, reset_token.id_usuario)
    if not user:
        raise PasswordResetError("El usuario ya no existe.")

    user.contrasena = hash_password(reset_data.nueva_contrasena)
    reset_token.used = True

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def update_user(db: Session, user: User, user_data: UserUpdate) -> User:
    updates = user_data.model_dump(exclude_unset=True)

    if "correo" in updates and updates["correo"] is not None:
        new_email = str(updates["correo"]).lower()
        existing_user = get_user_by_email(db, new_email)
        if existing_user and existing_user.id_usuario != user.id_usuario:
            raise UserConflictError("Ya existe otro usuario registrado con ese correo.")
        user.correo = new_email

    if "nombre" in updates and updates["nombre"] is not None:
        user.nombre = updates["nombre"].strip()

    if "contrasena" in updates and updates["contrasena"] is not None:
        user.contrasena = hash_password(updates["contrasena"])

    try:
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError as exc:
        db.rollback()
        raise UserConflictError(
            "No se pudo actualizar el usuario con los datos enviados."
        ) from exc


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def _hash_reset_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _ensure_password_reset_table(db: Session) -> None:
    PasswordResetToken.__table__.create(bind=db.get_bind(), checkfirst=True)
