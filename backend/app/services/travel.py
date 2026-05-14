from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models.travel_model import Travel, UserTravel
from app.schemas.travel_schema import TravelCreate, TravelUpdate
from app.services.exceptions import TravelConflictError


def get_travels(db: Session) -> list[Travel]:
    """Obtiene todos los viajes."""
    return db.query(Travel).order_by(Travel.id_travel).all()


def get_travel_by_id(db: Session, travel_id: int) -> Travel | None:
    """Obtiene un viaje por su ID."""
    return db.query(Travel).filter(Travel.id_travel == travel_id).first()


def get_user_travel_by_ids(db: Session, travel_id: int, user_id: int) -> UserTravel | None:
    """Obtiene la relación usuario-viaje por IDs."""
    return db.query(UserTravel).filter(
        UserTravel.id_travel == travel_id,
        UserTravel.id_usuario == user_id
    ).first()


def get_admin_by_travel(db: Session, travel_id: int) -> UserTravel | None:
    """Obtiene el admin de un viaje."""
    return db.query(UserTravel).filter(
        UserTravel.id_travel == travel_id,
        UserTravel.rol == "admin"
    ).first()


def create_travel(db: Session, travel_data: TravelCreate) -> Travel:
    """Crea un nuevo viaje y asigna al usuario como admin."""
    travel = Travel(
        nombre=travel_data.nombre.strip(),
        id_categoria=travel_data.id_categoria,
    )

    try:
        print(f"[INFO] Intentando crear viaje: {travel.nombre}")
        db.add(travel)
        db.flush()  # Obtener el ID del viaje sin hacer commit
        print(f"[INFO] Viaje creado con ID: {travel.id_travel}")

        # Crear relación usuario-viaje con rol de admin
        user_travel = UserTravel(
            id_travel=travel.id_travel,
            id_usuario=travel_data.id_usuario,
            rol="admin",
            balance=0.0
        )
        print(f"[INFO] Asignando usuario {travel_data.id_usuario} como admin del viaje")
        db.add(user_travel)
        db.commit()
        db.refresh(travel)
        print(f"[SUCCESS] Viaje creado exitosamente con admin asignado")
        return travel
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al crear viaje: {exc}")
        db.rollback()
        raise TravelConflictError(
            "No se pudo crear el viaje con los datos proporcionados."
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al crear viaje: {exc}")
        db.rollback()
        raise TravelConflictError(
            "Error al crear el viaje"
        ) from exc


def update_travel(db: Session, travel: Travel, travel_data: TravelUpdate) -> Travel:
    """Actualiza un viaje existente."""
    updates = travel_data.model_dump(exclude_unset=True)

    if "nombre" in updates and updates["nombre"] is not None:
        travel.nombre = updates["nombre"].strip()

    if "id_categoria" in updates and updates["id_categoria"] is not None:
        travel.id_categoria = updates["id_categoria"]

    try:
        print(f"[INFO] Actualizando viaje con ID: {travel.id_travel}")
        db.commit()
        db.refresh(travel)
        print(f"[SUCCESS] Viaje actualizado exitosamente")
        return travel
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al actualizar viaje: {exc}")
        db.rollback()
        raise TravelConflictError(
            "No se pudo actualizar el viaje con los datos proporcionados."
        ) from exc


def delete_travel(db: Session, travel: Travel) -> None:
    """Elimina un viaje."""
    try:
        print(f"[INFO] Eliminando viaje con ID: {travel.id_travel}")
        db.delete(travel)
        db.commit()
        print(f"[SUCCESS] Viaje eliminado exitosamente")
    except IntegrityError as exc:
        print(f"[ERROR] Error al eliminar viaje: {exc}")
        db.rollback()
        raise TravelConflictError(
            "No se pudo eliminar el viaje."
        ) from exc
