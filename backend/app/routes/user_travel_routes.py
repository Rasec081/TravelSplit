from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.user_travel_schema import (
    UserTravelCreate,
    UserTravelResponse,
    UserTravelUpdate,
    UserTravelMessageResponse,
)
from app.services import user_travel
from app.services.exceptions import TravelConflictError


router = APIRouter(prefix="/user-travels", tags=["Usuarios en Viajes"])

"""
CRUD completo para gestionar la relación entre usuarios y viajes.
Endpoints para agregar, remover, listar y actualizar participantes en viajes.
"""


# ============================================================================
# FUNCIONES DE VALIDACIÓN
# ============================================================================

def validar_user_travel_create(data: UserTravelCreate) -> tuple[bool, str]:
    """Valida datos para crear una relación usuario-viaje."""
    if not data.id_viaje or data.id_viaje <= 0:
        return False, "id_viaje debe ser un entero mayor a 0"
    
    if not data.id_usuario or data.id_usuario <= 0:
        return False, "id_usuario debe ser un entero mayor a 0"
    
    return True, ""


def validar_user_travel_update(data: UserTravelUpdate) -> tuple[bool, str]:
    """Valida datos para actualizar una relación usuario-viaje."""
    # Al menos un campo debe ser proporcionado
    if data.balance is None and data.rol is None:
        return False, "Debe proporcionar al menos balance o rol"
    
    # Validar rol si es proporcionado
    if data.rol is not None and data.rol not in ["admin", "participante"]:
        return False, "rol debe ser 'admin' o 'participante'"
    
    return True, ""


# ============================================================================
# ENDPOINTS CRUD
# ============================================================================

@router.post("", response_model=UserTravelMessageResponse, status_code=status.HTTP_201_CREATED)
def create_user_travel(
    user_travel_data: UserTravelCreate,
    db: Session = Depends(get_db),
) -> UserTravelMessageResponse:
    """Agrega un usuario existente a un viaje como participante."""
    print(f"\n[INFO] Creando relación usuario-viaje")
    
    # Validar datos
    es_valido, mensaje_error = validar_user_travel_create(user_travel_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        # Crear relación con rol "participante" por defecto
        user_travel_obj = user_travel.create_user_travel(db, user_travel_data, rol="participante")
        
        print(f"[SUCCESS] Relación creada exitosamente")
        
        response = UserTravelResponse(
            id_user_travel=user_travel_obj.id_user_travel,
            id_viaje=user_travel_obj.id_travel,
            id_usuario=user_travel_obj.id_usuario,
            balance=user_travel_obj.balance,
            rol=user_travel_obj.rol,
        )
        
        return UserTravelMessageResponse(
            message=f"Usuario {user_travel_data.id_usuario} agregado al viaje {user_travel_data.id_viaje}",
            data=response,
        )
        
    except TravelConflictError as exc:
        print(f"[ERROR] Conflicto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear la relación usuario-viaje",
        ) from exc


@router.get("", response_model=list[UserTravelResponse])
def list_user_travels(
    db: Session = Depends(get_db),
) -> list[UserTravelResponse]:
    """Lista todas las relaciones usuario-viaje."""
    print(f"\n[INFO] Listando todas las relaciones usuario-viaje")
    
    try:
        # Obtener todos los user_travel
        from app.database.models.travel_model import UserTravel
        user_travels = db.query(UserTravel).all()
        
        print(f"[SUCCESS] Se obtuvieron {len(user_travels)} relaciones")
        
        responses = []
        for ut in user_travels:
            responses.append(UserTravelResponse(
                id_user_travel=ut.id_user_travel,
                id_viaje=ut.id_travel,
                id_usuario=ut.id_usuario,
                balance=ut.balance,
                rol=ut.rol,
            ))
        
        return responses
        
    except Exception as exc:
        print(f"[ERROR] Error al listar: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al listar relaciones usuario-viaje",
        ) from exc


@router.get("/{user_travel_id}", response_model=UserTravelResponse)
def get_user_travel(
    user_travel_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> UserTravelResponse:
    """Obtiene una relación usuario-viaje por su ID."""
    print(f"\n[INFO] Obteniendo relación usuario-viaje {user_travel_id}")
    
    try:
        user_travel_obj = user_travel.get_user_travel_by_id(db, user_travel_id)
        
        if not user_travel_obj:
            print(f"[ERROR] Relación no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró la relación usuario-viaje",
            )
        
        print(f"[SUCCESS] Relación encontrada")
        
        return UserTravelResponse(
            id_user_travel=user_travel_obj.id_user_travel,
            id_viaje=user_travel_obj.id_travel,
            id_usuario=user_travel_obj.id_usuario,
            balance=user_travel_obj.balance,
            rol=user_travel_obj.rol,
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener la relación usuario-viaje",
        ) from exc


@router.put("/{user_travel_id}", response_model=UserTravelMessageResponse)
def update_user_travel(
    user_travel_id: int = Path(gt=0),
    user_travel_data: UserTravelUpdate = None,
    db: Session = Depends(get_db),
) -> UserTravelMessageResponse:
    """Actualiza una relación usuario-viaje (balance o rol)."""
    print(f"\n[INFO] Actualizando relación usuario-viaje {user_travel_id}")
    
    if user_travel_data is None:
        user_travel_data = UserTravelUpdate()
    
    # Validar datos
    es_valido, mensaje_error = validar_user_travel_update(user_travel_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        user_travel_obj = user_travel.update_user_travel(db, user_travel_id, user_travel_data)
        
        print(f"[SUCCESS] Relación actualizada")
        
        response = UserTravelResponse(
            id_user_travel=user_travel_obj.id_user_travel,
            id_viaje=user_travel_obj.id_travel,
            id_usuario=user_travel_obj.id_usuario,
            balance=user_travel_obj.balance,
            rol=user_travel_obj.rol,
        )
        
        return UserTravelMessageResponse(
            message="Relación usuario-viaje actualizada correctamente",
            data=response,
        )
        
    except TravelConflictError as exc:
        print(f"[ERROR] Conflicto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar la relación usuario-viaje",
        ) from exc


@router.delete("/{user_travel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_travel(
    user_travel_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> None:
    """Elimina una relación usuario-viaje (remueve usuario del viaje)."""
    print(f"\n[INFO] Eliminando relación usuario-viaje {user_travel_id}")
    
    try:
        user_travel.delete_user_travel(db, user_travel_id)
        print(f"[SUCCESS] Relación eliminada")
        
    except TravelConflictError as exc:
        print(f"[ERROR] Conflicto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar la relación usuario-viaje",
        ) from exc


# ============================================================================
# ENDPOINTS ADICIONALES (Queries)
# ============================================================================

@router.get("/by-travel/{travel_id}", response_model=list[UserTravelResponse])
def get_users_by_travel(
    travel_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> list[UserTravelResponse]:
    """Obtiene todos los usuarios de un viaje específico."""
    print(f"\n[INFO] Obteniendo usuarios del viaje {travel_id}")
    
    try:
        users_travels = user_travel.get_users_by_travel(db, travel_id)
        
        print(f"[SUCCESS] Se encontraron {len(users_travels)} usuario(s)")
        
        responses = []
        for ut in users_travels:
            responses.append(UserTravelResponse(
                id_user_travel=ut.id_user_travel,
                id_viaje=ut.id_travel,
                id_usuario=ut.id_usuario,
                balance=ut.balance,
                rol=ut.rol,
            ))
        
        return responses
        
    except Exception as exc:
        print(f"[ERROR] Error al obtener usuarios: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener usuarios del viaje",
        ) from exc


@router.get("/by-user/{user_id}", response_model=list[UserTravelResponse])
def get_travels_by_user(
    user_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> list[UserTravelResponse]:
    """Obtiene todos los viajes de un usuario específico."""
    print(f"\n[INFO] Obteniendo viajes del usuario {user_id}")
    
    try:
        users_travels = user_travel.get_travels_by_user(db, user_id)
        
        print(f"[SUCCESS] Se encontraron {len(users_travels)} viaje(s)")
        
        responses = []
        for ut in users_travels:
            responses.append(UserTravelResponse(
                id_user_travel=ut.id_user_travel,
                id_viaje=ut.id_travel,
                id_usuario=ut.id_usuario,
                balance=ut.balance,
                rol=ut.rol,
            ))
        
        return responses
        
    except Exception as exc:
        print(f"[ERROR] Error al obtener viajes: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener viajes del usuario",
        ) from exc
