from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.models.travel_model import Travel, UserTravel
from app.database.models.user_model import User
from app.schemas.user_travel_schema import UserTravelCreate, UserTravelUpdate
from app.services.exceptions import TravelConflictError


def get_user_travel_by_id(db: Session, user_travel_id: int) -> UserTravel | None:
    """Obtiene una relación usuario-viaje por su ID."""
    return db.query(UserTravel).filter(UserTravel.id_user_travel == user_travel_id).first()


def get_user_travel_by_ids(db: Session, travel_id: int, user_id: int) -> UserTravel | None:
    """Obtiene una relación usuario-viaje por IDs de viaje y usuario."""
    return db.query(UserTravel).filter(
        UserTravel.id_travel == travel_id,
        UserTravel.id_usuario == user_id
    ).first()


def get_users_by_travel(db: Session, travel_id: int) -> list[UserTravel]:
    """Obtiene todos los usuarios de un viaje."""
    return db.query(UserTravel).filter(UserTravel.id_travel == travel_id).all()


def get_travels_by_user(db: Session, user_id: int) -> list[UserTravel]:
    """Obtiene todos los viajes de un usuario."""
    return db.query(UserTravel).filter(UserTravel.id_usuario == user_id).all()


def create_user_travel(db: Session, user_travel_data: UserTravelCreate, rol: str = "participante") -> UserTravel:
    """
    Crea una nueva relación usuario-viaje.
    
    Args:
        db: Sesión de base de datos
        user_travel_data: Datos de la relación (id_viaje, id_usuario)
        rol: Rol del usuario en el viaje (por defecto "participante")
        
    Returns:
        UserTravel: Relación creada
        
    Raises:
        TravelConflictError: Si hay error en la creación
    """
    try:
        # Validar que el viaje existe
        travel = db.query(Travel).filter(Travel.id_travel == user_travel_data.id_viaje).first()
        if not travel:
            raise TravelConflictError(f"El viaje con ID {user_travel_data.id_viaje} no existe")
        
        # Validar que el usuario existe
        usuario = db.query(User).filter(User.id_usuario == user_travel_data.id_usuario).first()
        if not usuario:
            raise TravelConflictError(f"El usuario con ID {user_travel_data.id_usuario} no existe")
        
        # Validar que no existe ya
        existing = get_user_travel_by_ids(db, user_travel_data.id_viaje, user_travel_data.id_usuario)
        if existing:
            raise TravelConflictError(
                f"El usuario {user_travel_data.id_usuario} ya está en el viaje {user_travel_data.id_viaje}"
            )
        
        print(f"[INFO] Creando relación usuario {user_travel_data.id_usuario} - viaje {user_travel_data.id_viaje}")
        
        user_travel = UserTravel(
            id_travel=user_travel_data.id_viaje,
            id_usuario=user_travel_data.id_usuario,
            balance=0,
            rol=rol
        )
        
        db.add(user_travel)
        db.commit()
        db.refresh(user_travel)
        
        print(f"[SUCCESS] Relación usuario-viaje creada con ID: {user_travel.id_user_travel}")
        return user_travel
        
    except TravelConflictError:
        raise
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad: {exc}")
        db.rollback()
        raise TravelConflictError("No se pudo crear la relación usuario-viaje") from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {exc}")
        db.rollback()
        raise TravelConflictError("Error al crear la relación usuario-viaje") from exc


def update_user_travel(
    db: Session,
    user_travel_id: int,
    user_travel_data: UserTravelUpdate
) -> UserTravel:
    """
    Actualiza una relación usuario-viaje.
    
    Args:
        db: Sesión de base de datos
        user_travel_id: ID de la relación a actualizar
        user_travel_data: Datos a actualizar (balance, rol)
        
    Returns:
        UserTravel: Relación actualizada
        
    Raises:
        TravelConflictError: Si no existe o hay error
    """
    try:
        user_travel = get_user_travel_by_id(db, user_travel_id)
        if not user_travel:
            raise TravelConflictError(f"La relación usuario-viaje con ID {user_travel_id} no existe")
        
        print(f"[INFO] Actualizando relación usuario-viaje con ID: {user_travel_id}")
        
        updates = user_travel_data.model_dump(exclude_unset=True)
        
        if "balance" in updates and updates["balance"] is not None:
            user_travel.balance = updates["balance"]
        
        if "rol" in updates and updates["rol"] is not None:
            if updates["rol"] not in ["admin", "participante"]:
                raise TravelConflictError("El rol debe ser 'admin' o 'participante'")
            user_travel.rol = updates["rol"]
        
        db.commit()
        db.refresh(user_travel)
        
        print(f"[SUCCESS] Relación usuario-viaje actualizada")
        return user_travel
        
    except TravelConflictError:
        raise
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad: {exc}")
        db.rollback()
        raise TravelConflictError("No se pudo actualizar la relación usuario-viaje") from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {exc}")
        db.rollback()
        raise TravelConflictError("Error al actualizar la relación usuario-viaje") from exc


def delete_user_travel(db: Session, user_travel_id: int) -> None:
    """
    Elimina una relación usuario-viaje.
    
    Args:
        db: Sesión de base de datos
        user_travel_id: ID de la relación a eliminar
        
    Raises:
        TravelConflictError: Si no existe o hay error
    """
    try:
        user_travel = get_user_travel_by_id(db, user_travel_id)
        if not user_travel:
            raise TravelConflictError(f"La relación usuario-viaje con ID {user_travel_id} no existe")
        
        print(f"[INFO] Eliminando relación usuario-viaje con ID: {user_travel_id}")
        
        db.delete(user_travel)
        db.commit()
        
        print(f"[SUCCESS] Relación usuario-viaje eliminada")
        
    except TravelConflictError:
        raise
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad: {exc}")
        db.rollback()
        raise TravelConflictError("No se pudo eliminar la relación usuario-viaje") from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {exc}")
        db.rollback()
        raise TravelConflictError("Error al eliminar la relación usuario-viaje") from exc
