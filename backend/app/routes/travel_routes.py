from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.travel_schema import (
    TravelCreate,
    TravelMessageResponse,
    TravelResponse,
    TravelUpdate,
)
from app.schemas.balance_schema import (
    BalanceViajeResponse,
    BalanceViajeMessageResponse,
)
from app.services import travel, balance
from app.services.exceptions import TravelConflictError, TravelValidationError

router = APIRouter(prefix="/travels", tags=["Viajes"])

'''
aqui van las validaciones de datos que se reciben del frontend, y aqui se llaman a 
las funciones del servicio de viajes para insertar los datos en la db

PD: segun yo aca se debe de verificar que el usuario en efecto sea admin
'''

# ============================================================================
# FUNCIONES DE VALIDACIÓN
# ============================================================================

def validar_travel_create(travel_data: TravelCreate) -> tuple[bool, str]:
    """
    Valida que los datos para crear un viaje sean completos y correctos.
    Retorna: (es_válido, mensaje_error)
    """
    # Validar que nombre no sea vacío
    if not travel_data.nombre or not isinstance(travel_data.nombre, str):
        print("[ERROR] nombre es requerido y debe ser string")
        return False, "El campo 'nombre' es requerido y debe ser de tipo string"
    
    # Validar que nombre tenga contenido
    if not travel_data.nombre.strip():
        print("[ERROR] nombre no puede estar vacío")
        return False, "El campo 'nombre' no puede estar vacío"
    
    # Validar que id_usuario no sea None
    if travel_data.id_usuario is None:
        print("[ERROR] id_usuario es requerido")
        return False, "El campo 'id_usuario' es requerido"
    
    # Validar que id_usuario sea entero positivo
    if not isinstance(travel_data.id_usuario, int):
        print(f"[ERROR] id_usuario debe ser entero, se recibió: {type(travel_data.id_usuario).__name__}")
        return False, f"El campo 'id_usuario' debe ser de tipo entero"
    
    if travel_data.id_usuario <= 0:
        print(f"[ERROR] id_usuario debe ser mayor a 0, se recibió: {travel_data.id_usuario}")
        return False, "El campo 'id_usuario' debe ser mayor a 0"
    
    # Validar que id_categoria sea entero positivo si es proporcionado
    if travel_data.id_categoria is not None:
        if not isinstance(travel_data.id_categoria, int):
            print(f"[ERROR] id_categoria debe ser entero, se recibió: {type(travel_data.id_categoria).__name__}")
            return False, f"El campo 'id_categoria' debe ser de tipo entero"
        
        if travel_data.id_categoria <= 0:
            print(f"[ERROR] id_categoria debe ser mayor a 0, se recibió: {travel_data.id_categoria}")
            return False, "El campo 'id_categoria' debe ser mayor a 0"
    
    return True, ""


def validar_travel_update(travel_data: TravelUpdate) -> tuple[bool, str]:
    """
    Valida que los datos para actualizar un viaje sean correctos.
    Retorna: (es_válido, mensaje_error)
    """
    # Validar nombre si es proporcionado
    if travel_data.nombre is not None:
        if not isinstance(travel_data.nombre, str):
            print(f"[ERROR] nombre debe ser string, se recibió: {type(travel_data.nombre).__name__}")
            return False, f"El campo 'nombre' debe ser de tipo string"
        
        if not travel_data.nombre.strip():
            print("[ERROR] nombre no puede estar vacío")
            return False, "El campo 'nombre' no puede estar vacío"
    
    # Validar id_categoria si es proporcionado
    if travel_data.id_categoria is not None:
        if not isinstance(travel_data.id_categoria, int):
            print(f"[ERROR] id_categoria debe ser entero, se recibió: {type(travel_data.id_categoria).__name__}")
            return False, f"El campo 'id_categoria' debe ser de tipo entero"
        
        if travel_data.id_categoria <= 0:
            print(f"[ERROR] id_categoria debe ser mayor a 0, se recibió: {travel_data.id_categoria}")
            return False, "El campo 'id_categoria' debe ser mayor a 0"
    
    # Validar que al menos un campo sea proporcionado
    if travel_data.nombre is None and travel_data.id_categoria is None:
        print("[ERROR] Debe proporcionar al menos un campo para actualizar")
        return False, "Debe proporcionar al menos un campo (nombre o id_categoria) para actualizar"
    
    return True, ""

def validar_es_admin(db: Session, travel_id: int, user_id: int) -> tuple[bool, str]:
    """
    Valida si un usuario es admin (creador) de un viaje.
    Retorna: (es_admin, mensaje_error)
    """
    es_admin = travel.is_travel_admin(db, travel_id, user_id)
    
    if not es_admin:
        print(f"[ERROR] Usuario {user_id} no es admin del viaje {travel_id}")
        return False, "Solo el admin del viaje puede realizar esta acción"
    
    print(f"[SUCCESS] Usuario {user_id} es admin del viaje {travel_id}")
    return True, ""

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "",
    response_model=TravelMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_travel(
    travel_data: TravelCreate,
    db: Session = Depends(get_db),
) -> TravelMessageResponse:
    """Crea un nuevo viaje. El usuario que crea el viaje se convierte en admin."""
    print(f"\n[INFO] Iniciando creación de viaje con datos: {travel_data}")
    
    # Validar datos
    es_valido, mensaje_error = validar_travel_create(travel_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        print("[INFO] Datos válidos, llamando a servicio de creación...")
        travel_obj = travel.create_travel(db, travel_data)
        print(f"[SUCCESS] Viaje creado exitosamente con ID: {travel_obj.id_travel}")
        
        # Construir respuesta (Travel tiene id_usuario_creador directamente)
        travel_response = TravelResponse(
            id_travel=travel_obj.id_travel,
            nombre=travel_obj.nombre,
            id_categoria=travel_obj.id_categoria,
            id_usuario_creador=travel_obj.id_usuario_creador,
            fecha_creacion=travel_obj.fecha_creacion,
            fecha_cierre=travel_obj.fecha_cierre
        )
        
        return TravelMessageResponse(
            message="Viaje creado correctamente. Usuario asignado como admin.",
            data=travel_response,
        )
    except TravelConflictError as exc:
        print(f"[ERROR] Conflicto en base de datos: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al crear viaje: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al crear el viaje",
        ) from exc


@router.get("", response_model=list[TravelResponse])
def list_travels(
    db: Session = Depends(get_db),
) -> list[TravelResponse]:
    """Lista todos los viajes."""
    print(f"\n[INFO] Iniciando obtención de viajes")
    
    try:
        print("[INFO] Obteniendo viajes...")
        travels = travel.get_travels(db)
        print(f"[SUCCESS] Se obtuvieron {len(travels)} viaje(s)")
        
        # Convertir cada viaje a TravelResponse
        travels_response = []
        for t in travels:
            travel_response = TravelResponse(
                id_travel=t.id_travel,
                nombre=t.nombre,
                id_categoria=t.id_categoria,
                id_usuario_creador=t.id_usuario_creador,
                fecha_creacion=t.fecha_creacion,
                fecha_cierre=t.fecha_cierre
            )
            travels_response.append(travel_response)
        
        return travels_response
    except Exception as exc:
        print(f"[ERROR] Error al obtener viajes: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los viajes",
        ) from exc


@router.get("/{travel_id}", response_model=TravelResponse)
def get_travel(
    travel_id: int,
    db: Session = Depends(get_db),
) -> TravelResponse:
    """Obtiene un viaje por ID."""
    print(f"\n[INFO] Iniciando obtención de viaje con ID: {travel_id}")
    
    # Validar que travel_id sea entero positivo
    if not isinstance(travel_id, int):
        print(f"[ERROR] travel_id debe ser entero, se recibió: {type(travel_id).__name__}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'travel_id' debe ser de tipo entero",
        )
    
    if travel_id <= 0:
        print(f"[ERROR] travel_id debe ser mayor a 0, se recibió: {travel_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'travel_id' debe ser mayor a 0",
        )
    
    try:
        print(f"[INFO] Buscando viaje con ID: {travel_id}")
        travel_obj = travel.get_travel_by_id(db, travel_id)
        
        if not travel_obj:
            print(f"[ERROR] Viaje con ID {travel_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un viaje con ese identificador.",
            )
        
        print(f"[SUCCESS] Viaje encontrado: {travel_obj.nombre}")
        
        travel_response = TravelResponse(
            id_travel=travel_obj.id_travel,
            nombre=travel_obj.nombre,
            id_categoria=travel_obj.id_categoria,
            id_usuario_creador=travel_obj.id_usuario_creador,
            fecha_creacion=travel_obj.fecha_creacion,
            fecha_cierre=travel_obj.fecha_cierre
        )
        
        return travel_response
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener viaje: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el viaje",
        ) from exc


@router.put("/{travel_id}", response_model=TravelMessageResponse)
def update_travel(
    travel_id: int,
    travel_data: TravelUpdate,
    db: Session = Depends(get_db),
) -> TravelMessageResponse:
    """Actualiza un viaje existente."""
    print(f"\n[INFO] Iniciando actualización de viaje con ID: {travel_id}")
    print(f"[INFO] Datos de actualización: {travel_data}")
    
    # Validar travel_id
    if not isinstance(travel_id, int):
        print(f"[ERROR] travel_id debe ser entero, se recibió: {type(travel_id).__name__}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'travel_id' debe ser de tipo entero",
        )
    
    if travel_id <= 0:
        print(f"[ERROR] travel_id debe ser mayor a 0, se recibió: {travel_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'travel_id' debe ser mayor a 0",
        )
    
    # Validar datos de actualización
    es_valido, mensaje_error = validar_travel_update(travel_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        print(f"[INFO] Buscando viaje existente con ID: {travel_id}")
        travel_obj = travel.get_travel_by_id(db, travel_id)
        
        if not travel_obj:
            print(f"[ERROR] Viaje con ID {travel_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un viaje con ese identificador.",
            )
        
        print("[INFO] Viaje encontrado, procediendo a actualizar...")
        updated_travel = travel.update_travel(db, travel_obj, travel_data)
        print(f"[SUCCESS] Viaje actualizado exitosamente: {updated_travel.nombre}")
        
        travel_response = TravelResponse(
            id_travel=updated_travel.id_travel,
            nombre=updated_travel.nombre,
            id_categoria=updated_travel.id_categoria,
            id_usuario_creador=updated_travel.id_usuario_creador,
            fecha_creacion=updated_travel.fecha_creacion,
            fecha_cierre=updated_travel.fecha_cierre
        )
        
        return TravelMessageResponse(
            message="Viaje actualizado correctamente",
            data=travel_response,
        )
    except TravelConflictError as exc:
        print(f"[ERROR] Conflicto en base de datos: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al actualizar viaje: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al actualizar el viaje",
        ) from exc


#por que la ruta esta así?
@router.get("/{travel_id}/balance", response_model=BalanceViajeMessageResponse)
def get_balance_viaje(
    travel_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> BalanceViajeMessageResponse:
    """
    Obtiene el desglose de balance de todos los usuarios para un viaje específico.
    
    Calcula para cada usuario:
    - total_pagado: suma de gastos donde fue quien pagó
    - total_debido: suma de divisiones donde participa
    - balance_final: total_pagado - total_debido
    - estado: saldado, debe_recibir o debe_pagar
    
    Retorna información completa de todos los participantes del viaje.
    """
    print(f"\n[INFO] Iniciando cálculo de balance para viaje {travel_id}")
    
    try:
        #aquie se va a balance.py a calcular el balance, y se va a traer toda la info necesaria para construir la respuesta
        balance_result = balance.calculate_balance_by_travel(db, travel_id)
        
        travel_obj = balance_result["travel"]
        usuarios_balance = balance_result["usuarios_balance"]
        total_pagado_viaje = balance_result["total_pagado_viaje"]
        total_debido_viaje = balance_result["total_debido_viaje"]
        diferencia_viaje = balance_result["diferencia_viaje"]
        
        print(f"[SUCCESS] Balance calculado para {len(usuarios_balance)} usuario(s)")
        
        # Construir respuesta
        balance_response = BalanceViajeResponse(
            id_viaje=travel_obj.id_travel,
            nombre_viaje=travel_obj.nombre,
            cantidad_usuarios=len(usuarios_balance),
            usuarios=usuarios_balance,
            total_pagado_viaje=total_pagado_viaje,
            total_debido_viaje=total_debido_viaje,
            diferencia=diferencia_viaje,
        )
        
        return BalanceViajeMessageResponse(
            message=f"Balance calculado para viaje '{travel_obj.nombre}' con {len(usuarios_balance)} participante(s)",
            data=balance_response,
        )
        
    except TravelValidationError as exc:
        print(f"[ERROR] Validación de viaje: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error al calcular balance: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al calcular el balance del viaje",
        ) from exc


@router.delete("/{travel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_travel(
    travel_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Elimina un viaje."""
    print(f"\n[INFO] Iniciando eliminación de viaje con ID: {travel_id}")
    
    # Validar travel_id
    if not isinstance(travel_id, int):
        print(f"[ERROR] travel_id debe ser entero, se recibió: {type(travel_id).__name__}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'travel_id' debe ser de tipo entero",
        )
    
    if travel_id <= 0:
        print(f"[ERROR] travel_id debe ser mayor a 0, se recibió: {travel_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'travel_id' debe ser mayor a 0",
        )
    
    try:
        print(f"[INFO] Buscando viaje existente con ID: {travel_id}")
        travel_obj = travel.get_travel_by_id(db, travel_id)
        
        if not travel_obj:
            print(f"[ERROR] Viaje con ID {travel_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un viaje con ese identificador.",
            )
        
        print(f"[INFO] Viaje encontrado: {travel_obj.nombre}, procediendo a eliminar...")
        travel.delete_travel(db, travel_obj)
        print(f"[SUCCESS] Viaje eliminado exitosamente")
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al eliminar viaje: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al eliminar el viaje",
        ) from exc


@router.put("/{travel_id}/close", response_model=TravelMessageResponse)
def close_travel(
    travel_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> TravelMessageResponse:
    """Cierra un viaje estableciendo fecha_cierre (si no está cerrado)."""
    print(f"\n[INFO] Iniciando cierre de viaje con ID: {travel_id}")

    try:
        travel_obj = travel.get_travel_by_id(db, travel_id)
        if not travel_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un viaje con ese identificador.",
            )

        if travel_obj.fecha_cierre is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El viaje ya está cerrado.",
            )

        closed = travel.close_travel(db, travel_obj)

        travel_response = TravelResponse(
            id_travel=closed.id_travel,
            nombre=closed.nombre,
            id_categoria=closed.id_categoria,
            id_usuario_creador=closed.id_usuario_creador,
            fecha_creacion=closed.fecha_creacion,
            fecha_cierre=closed.fecha_cierre,
        )

        return TravelMessageResponse(message="Viaje cerrado correctamente", data=travel_response)
    except HTTPException:
        raise
    except TravelConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al cerrar el viaje",
        ) from exc
