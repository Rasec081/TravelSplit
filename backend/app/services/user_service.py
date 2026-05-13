from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models.user_model import User
from app.schemas.user_schema import UserCreate, UserUpdate
from app.services.exceptions import UserConflictError
from app.utils.security import hash_password


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
