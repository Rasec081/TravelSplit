from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.models.travel_model import Travel, UserTravel
from app.schemas.travel_schema import TravelCreate, TravelUpdate
from app.services.exceptions import TravelConflictError


def get_travels(db: Session) -> list[Travel]:
    """Obtiene todos los viajes."""
    return db.query(Travel).order_by(Travel.id_travel).all()


def get_travels_by_user(db: Session, user_id: int) -> list[Travel]:
    """Obtiene los viajes en los que el usuario participa o que creó."""
    return (
        db.query(Travel)
        .outerjoin(UserTravel, Travel.id_travel == UserTravel.id_travel)
        .filter(or_(UserTravel.id_usuario == user_id, Travel.id_usuario_creador == user_id))
        .distinct()
        .order_by(Travel.id_travel)
        .all()
    )


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
    
    Además, automáticamente agrega al usuario creador a la tabla usuarios_viajes 
    con rol de 'admin'.
    
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
        
        # ✅ AUTOMÁTICAMENTE AGREGAR AL CREADOR A usuarios_viajes COMO ADMIN
        user_travel = UserTravel(
            id_travel=travel.id_travel,
            id_usuario=travel_data.id_usuario,
            balance=0,
            rol="admin"
        )
        
        print(f"[INFO] Agregando usuario {travel_data.id_usuario} como admin del viaje")
        db.add(user_travel)
        db.commit()
        
        print(f"[SUCCESS] Usuario agregado a usuarios_viajes como admin")
        
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


def add_user_to_travel(db: Session, travel_id: int, user_id: int) -> UserTravel:
    """Agrega un usuario a un viaje existente como participante.
    
    Args:
        db: Sesión de base de datos
        travel_id: ID del viaje
        user_id: ID del usuario a agregar
        
    Returns:
        UserTravel: Objeto creado
        
    Raises:
        TravelConflictError: Si el usuario ya está en el viaje o si hay error
    """
    try:
        # Verificar que el viaje existe
        travel = get_travel_by_id(db, travel_id)
        if not travel:
            raise TravelConflictError(f"El viaje con ID {travel_id} no existe")
        
        # Verificar que el usuario no está ya en el viaje
        existing = get_user_travel_by_ids(db, travel_id, user_id)
        if existing:
            raise TravelConflictError(f"El usuario {user_id} ya está en el viaje {travel_id}")
        
        print(f"[INFO] Agregando usuario {user_id} al viaje {travel_id}")
        
        user_travel = UserTravel(
            id_travel=travel_id,
            id_usuario=user_id,
            balance=0,
            rol="participante"
        )
        
        db.add(user_travel)
        db.commit()
        db.refresh(user_travel)
        
        print(f"[SUCCESS] Usuario {user_id} agregado al viaje {travel_id}")
        return user_travel
        
    except TravelConflictError:
        raise
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al agregar usuario: {exc}")
        db.rollback()
        raise TravelConflictError(
            "No se pudo agregar el usuario al viaje"
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {exc}")
        db.rollback()
        raise TravelConflictError(
            "Error al agregar usuario al viaje"
        ) from exc


def remove_user_from_travel(db: Session, travel_id: int, user_id: int) -> None:
    """Remueve un usuario de un viaje.
    
    Args:
        db: Sesión de base de datos
        travel_id: ID del viaje
        user_id: ID del usuario a remover
        
    Raises:
        TravelConflictError: Si no se encuentra la relación o hay error
    """
    try:
        user_travel = get_user_travel_by_ids(db, travel_id, user_id)
        if not user_travel:
            raise TravelConflictError(f"El usuario {user_id} no está en el viaje {travel_id}")
        
        print(f"[INFO] Removiendo usuario {user_id} del viaje {travel_id}")
        
        db.delete(user_travel)
        db.commit()
        
        print(f"[SUCCESS] Usuario removido del viaje")
        
    except TravelConflictError:
        raise
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al remover usuario: {exc}")
        db.rollback()
        raise TravelConflictError(
            "No se pudo remover el usuario del viaje"
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {exc}")
        db.rollback()
        raise TravelConflictError(
            "Error al remover usuario del viaje"
        ) from exc
