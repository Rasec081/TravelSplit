from datetime import datetime

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


def is_travel_admin(db: Session, travel_id: int, user_id: int) -> bool:
    """Verifica si un usuario es admin (creador) del viaje."""
    travel = get_travel_by_id(db, travel_id)
    if not travel:
        return False
    return travel.id_usuario_creador == user_id


def create_travel(db: Session, travel_data: TravelCreate) -> Travel:
    """Crea un nuevo viaje con el usuario especificado como creador (admin).
    
    Las fechas se generan automáticamente:
    - fecha_creacion: ahora
    - fecha_cierre: NULL (se establece cuando se cierra)
    """
    travel = Travel(
        nombre=travel_data.nombre.strip(),
        id_categoria=travel_data.id_categoria,
        id_usuario_creador=travel_data.id_usuario,
        fecha_creacion=datetime.utcnow(),
        fecha_cierre=None  # Aún no se cierra
    )

    try:
        print(f"[INFO] Intentando crear viaje: {travel.nombre}")
        print(f"[INFO] Creador (Admin): Usuario {travel_data.id_usuario}")
        
        db.add(travel)
        db.commit()
        db.refresh(travel)
        
        print(f"[SUCCESS] Viaje creado exitosamente con ID: {travel.id_travel}")
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


def close_travel(db: Session, travel: Travel) -> Travel:
    """Cierra un viaje estableciendo fecha_cierre a la fecha/hora actual."""
    try:
        print(f"[INFO] Cerrando viaje con ID: {travel.id_travel}")
        travel.fecha_cierre = datetime.utcnow()
        db.commit()
        db.refresh(travel)
        print(f"[SUCCESS] Viaje cerrado exitosamente")
        return travel
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al cerrar viaje: {exc}")
        db.rollback()
        raise TravelConflictError(
            "No se pudo cerrar el viaje."
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
