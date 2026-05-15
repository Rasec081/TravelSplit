from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.gasto_schema import (
    GastoCreate,
    GastoMessageResponse,
    GastoResponse,
    GastoUpdate,
)
from app.services import gasto
from app.services.exceptions import GastoValidationError

router = APIRouter(prefix="/gastos", tags=["Gastos"])


# ============================================================================
# FUNCIONES DE VALIDACIÓN
# ============================================================================

def validar_gasto_create(gasto_data: GastoCreate) -> tuple[bool, str]:
    """
    Valida que los datos para crear un gasto sean completos y correctos.
    Retorna: (es_válido, mensaje_error)
    
    NOTA: Las divisiones se crean de forma independiente via POST /divisiones-gastos
    """
    # Validar descripción
    if not gasto_data.descripcion or not isinstance(gasto_data.descripcion, str):
        print("[ERROR] descripcion es requerida y debe ser string")
        return False, "El campo 'descripcion' es requerido y debe ser de tipo string"
    
    if not gasto_data.descripcion.strip():
        print("[ERROR] descripcion no puede estar vacía")
        return False, "El campo 'descripcion' no puede estar vacío"
    
    # Validar monto
    if gasto_data.monto is None or not isinstance(gasto_data.monto, (int, float, Decimal)):
        print("[ERROR] monto es requerido y debe ser numérico")
        return False, "El campo 'monto' es requerido y debe ser numérico"
    
    monto_decimal = Decimal(str(gasto_data.monto))
    if monto_decimal <= 0:
        print(f"[ERROR] monto debe ser mayor a 0, se recibió: {monto_decimal}")
        return False, "El campo 'monto' debe ser mayor a 0"
    
    # Validar id_viaje
    if gasto_data.id_viaje is None or gasto_data.id_viaje <= 0:
        print("[ERROR] id_viaje es requerido y debe ser mayor a 0")
        return False, "El campo 'id_viaje' es requerido y debe ser mayor a 0"
    
    # Validar id_usuario
    if gasto_data.id_usuario is None or gasto_data.id_usuario <= 0:
        print("[ERROR] id_usuario es requerido y debe ser mayor a 0")
        return False, "El campo 'id_usuario' es requerido y debe ser mayor a 0"
    
    # Validar id_categoria si se proporciona
    if gasto_data.id_categoria is not None and gasto_data.id_categoria <= 0:
        print(f"[ERROR] id_categoria debe ser mayor a 0, se recibió: {gasto_data.id_categoria}")
        return False, "El campo 'id_categoria' debe ser mayor a 0"
    
    return True, ""


def validar_gasto_update(gasto_data: GastoUpdate) -> tuple[bool, str]:
    """
    Valida que los datos para actualizar un gasto sean correctos.
    Retorna: (es_válido, mensaje_error)
    """
    # Validar descripción si es proporcionada
    if gasto_data.descripcion is not None:
        if not isinstance(gasto_data.descripcion, str):
            print(f"[ERROR] descripcion debe ser string, se recibió: {type(gasto_data.descripcion).__name__}")
            return False, "El campo 'descripcion' debe ser de tipo string"
        
        if not gasto_data.descripcion.strip():
            print("[ERROR] descripcion no puede estar vacía")
            return False, "El campo 'descripcion' no puede estar vacío"
    
    # Validar monto si es proporcionado
    if gasto_data.monto is not None:
        monto_decimal = Decimal(str(gasto_data.monto))
        if monto_decimal <= 0:
            print(f"[ERROR] monto debe ser mayor a 0, se recibió: {monto_decimal}")
            return False, "El campo 'monto' debe ser mayor a 0"
    
    # Validar id_viaje si es proporcionado
    if gasto_data.id_viaje is not None and gasto_data.id_viaje <= 0:
        print(f"[ERROR] id_viaje debe ser mayor a 0, se recibió: {gasto_data.id_viaje}")
        return False, "El campo 'id_viaje' debe ser mayor a 0"
    
    # Validar id_usuario si es proporcionado
    if gasto_data.id_usuario is not None and gasto_data.id_usuario <= 0:
        print(f"[ERROR] id_usuario debe ser mayor a 0, se recibió: {gasto_data.id_usuario}")
        return False, "El campo 'id_usuario' debe ser mayor a 0"
    
    # Validar id_categoria si es proporcionado
    if gasto_data.id_categoria is not None and gasto_data.id_categoria <= 0:
        print(f"[ERROR] id_categoria debe ser mayor a 0, se recibió: {gasto_data.id_categoria}")
        return False, "El campo 'id_categoria' debe ser mayor a 0"
    
    # Validar que al menos un campo sea proporcionado
    if not gasto_data.model_fields_set:
        print("[ERROR] Debe proporcionar al menos un campo para actualizar")
        return False, "Debe proporcionar al menos un campo para actualizar"
    
    return True, ""


# ============================================================================
# ENDPOINTS CRUD - GASTOS
# ============================================================================

@router.post(
    "",
    response_model=GastoMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_gasto(
    gasto_data: GastoCreate,
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    """Crea un nuevo gasto.
    
    Nota: Las divisiones se crean de forma independiente via POST /divisiones-gastos
    """
    print(f"\n[INFO] Iniciando creación de gasto con datos: {gasto_data.descripcion}")
    
    # Validar datos
    es_valido, mensaje_error = validar_gasto_create(gasto_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        print("[INFO] Datos válidos, llamando a servicio de creación...")
        gasto_obj = gasto.create_gasto(db, gasto_data)
        print(f"[SUCCESS] Gasto creado exitosamente con ID: {gasto_obj.id_gasto}")
        
        # Construir respuesta
        gasto_response = GastoResponse(
            id_gasto=gasto_obj.id_gasto,
            id_viaje=gasto_obj.id_viaje,
            id_usuario=gasto_obj.id_usuario,
            id_categoria=gasto_obj.id_categoria,
            monto=gasto_obj.monto,
            descripcion=gasto_obj.descripcion,
            fecha_creacion=gasto_obj.fecha_creacion,
        )
        
        return GastoMessageResponse(
            message="Gasto creado correctamente. Ahora puedes crear divisiones con POST /divisiones-gastos",
            data=gasto_response,
        )
    except GastoValidationError as exc:
        print(f"[ERROR] Validación en servicio: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al crear gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al crear el gasto",
        ) from exc


@router.get("", response_model=list[GastoResponse])
def list_gastos(
    travel_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[GastoResponse]:
    """Lista todos los gastos, opcionalmente filtrados por viaje."""
    print(f"\n[INFO] Obteniendo gastos" + (f" del viaje {travel_id}" if travel_id else ""))
    
    try:
        gastos_list = gasto.get_gastos(db, travel_id=travel_id)
        print(f"[SUCCESS] Se obtuvieron {len(gastos_list)} gasto(s)")
        
        return [
            GastoResponse(
                id_gasto=g.id_gasto,
                id_viaje=g.id_viaje,
                id_usuario=g.id_usuario,
                id_categoria=g.id_categoria,
                monto=g.monto,
                descripcion=g.descripcion,
                fecha_creacion=g.fecha_creacion,
            )
            for g in gastos_list
        ]
    except Exception as exc:
        print(f"[ERROR] Error al obtener gastos: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los gastos",
        ) from exc


@router.get("/{gasto_id}", response_model=GastoResponse)
def get_gasto(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> GastoResponse:
    """Obtiene un gasto específico por ID."""
    print(f"\n[INFO] Obteniendo gasto con ID: {gasto_id}")
    
    try:
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        print(f"[SUCCESS] Gasto encontrado: {gasto_obj.descripcion}")
        
        return GastoResponse(
            id_gasto=gasto_obj.id_gasto,
            id_viaje=gasto_obj.id_viaje,
            id_usuario=gasto_obj.id_usuario,
            id_categoria=gasto_obj.id_categoria,
            monto=gasto_obj.monto,
            descripcion=gasto_obj.descripcion,
            fecha_creacion=gasto_obj.fecha_creacion,
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el gasto",
        ) from exc


@router.put("/{gasto_id}", response_model=GastoMessageResponse)
def update_gasto_endpoint(
    gasto_id: int = Path(gt=0),
    gasto_data: GastoUpdate = None,
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    """Actualiza un gasto existente (solo campos básicos)."""
    print(f"\n[INFO] Iniciando actualización de gasto con ID: {gasto_id}")
    
    # Validar que se envíen datos
    if gasto_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requieren datos para actualizar",
        )
    
    # Validar datos de actualización
    es_valido, mensaje_error = validar_gasto_update(gasto_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        print("[INFO] Gasto encontrado, procediendo a actualizar...")
        updated_gasto = gasto.update_gasto(db, gasto_obj, gasto_data)
        print(f"[SUCCESS] Gasto actualizado exitosamente")
        
        gasto_response = GastoResponse(
            id_gasto=updated_gasto.id_gasto,
            id_viaje=updated_gasto.id_viaje,
            id_usuario=updated_gasto.id_usuario,
            id_categoria=updated_gasto.id_categoria,
            monto=updated_gasto.monto,
            descripcion=updated_gasto.descripcion,
            fecha_creacion=updated_gasto.fecha_creacion,
        )
        
        return GastoMessageResponse(
            message="Gasto actualizado correctamente",
            data=gasto_response,
        )
    except GastoValidationError as exc:
        print(f"[ERROR] Validación en servicio: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al actualizar gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al actualizar el gasto",
        ) from exc


@router.delete("/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gasto_endpoint(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> None:
    """Elimina un gasto y sus divisiones asociadas."""
    print(f"\n[INFO] Iniciando eliminación de gasto con ID: {gasto_id}")
    
    try:
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        print("[INFO] Gasto encontrado, procediendo a eliminar...")
        gasto.delete_gasto(db, gasto_obj)
        print(f"[SUCCESS] Gasto eliminado exitosamente")
    except GastoValidationError as exc:
        print(f"[ERROR] Validación en servicio: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al eliminar gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al eliminar el gasto",
        ) from exc




    
    # Validar id_usuario si es proporcionado
    if gasto_data.id_usuario is not None and gasto_data.id_usuario <= 0:
        print(f"[ERROR] id_usuario debe ser mayor a 0, se recibió: {gasto_data.id_usuario}")
        return False, "El campo 'id_usuario' debe ser mayor a 0"
    
    # Validar id_categoria si es proporcionado
    if gasto_data.id_categoria is not None and gasto_data.id_categoria <= 0:
        print(f"[ERROR] id_categoria debe ser mayor a 0, se recibió: {gasto_data.id_categoria}")
        return False, "El campo 'id_categoria' debe ser mayor a 0"
    
    # Validar que al menos un campo sea proporcionado
    if not gasto_data.model_fields_set:
        print("[ERROR] Debe proporcionar al menos un campo para actualizar")
        return False, "Debe proporcionar al menos un campo para actualizar"
    
    return True, ""


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "",
    response_model=GastoMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_gasto(
    gasto_data: GastoCreate,
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    """Crea un nuevo gasto con divisiones entre participantes."""
    print(f"\n[INFO] Iniciando creación de gasto con datos: {gasto_data.descripcion}")
    
    # Validar datos
    es_valido, mensaje_error = validar_gasto_create(gasto_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        print("[INFO] Datos válidos, llamando a servicio de creación...")
        gasto_obj = gasto.create_gasto(db, gasto_data)
        print(f"[SUCCESS] Gasto creado exitosamente con ID: {gasto_obj.id_gasto}")
        
        # Obtener divisiones
        divisiones = gasto.get_divisiones_by_gasto(db, gasto_obj.id_gasto)
        divisiones_response = [
            DivisionGastoResponse.model_validate(d) for d in divisiones
        ]
        
        # Construir respuesta
        gasto_response = GastoResponse(
            id_gasto=gasto_obj.id_gasto,
            id_viaje=gasto_obj.id_viaje,
            id_usuario=gasto_obj.id_usuario,
            id_categoria=gasto_obj.id_categoria,
            monto=gasto_obj.monto,
            descripcion=gasto_obj.descripcion,
            fecha_creacion=gasto_obj.fecha_creacion,
            divisiones=divisiones_response
        )
        
        return GastoMessageResponse(
            message="Gasto creado correctamente con divisiones registradas",
            data=gasto_response,
        )
    except GastoValidationError as exc:
        print(f"[ERROR] Validación en servicio: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al crear gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al crear el gasto",
        ) from exc


@router.get("", response_model=list[GastoResponse])
def list_gastos(
    travel_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[GastoResponse]:
    """Lista todos los gastos, opcionalmente filtrados por viaje."""
    print(f"\n[INFO] Obteniendo gastos" + (f" del viaje {travel_id}" if travel_id else ""))
    
    try:
        gastos_list = gasto.get_gastos(db, travel_id)
        print(f"[SUCCESS] Se obtuvieron {len(gastos_list)} gasto(s)")
        
        respuesta = []
        for g in gastos_list:
            divisiones = gasto.get_divisiones_by_gasto(db, g.id_gasto)
            divisiones_response = [
                DivisionGastoResponse.model_validate(d) for d in divisiones
            ]
            respuesta.append(GastoResponse(
                id_gasto=g.id_gasto,
                id_viaje=g.id_viaje,
                id_usuario=g.id_usuario,
                id_categoria=g.id_categoria,
                monto=g.monto,
                descripcion=g.descripcion,
                fecha_creacion=g.fecha_creacion,
                divisiones=divisiones_response
            ))
        
        return respuesta
    except Exception as exc:
        print(f"[ERROR] Error al obtener gastos: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los gastos",
        ) from exc


@router.get("/{gasto_id}", response_model=GastoResponse)
def get_gasto(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> GastoResponse:
    """Obtiene un gasto por ID."""
    print(f"\n[INFO] Obteniendo gasto con ID: {gasto_id}")
    
    try:
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        print(f"[SUCCESS] Gasto encontrado: {gasto_obj.descripcion}")
        
        divisiones = gasto.get_divisiones_by_gasto(db, gasto_obj.id_gasto)
        divisiones_response = [
            DivisionGastoResponse.model_validate(d) for d in divisiones
        ]
        
        return GastoResponse(
            id_gasto=gasto_obj.id_gasto,
            id_viaje=gasto_obj.id_viaje,
            id_usuario=gasto_obj.id_usuario,
            id_categoria=gasto_obj.id_categoria,
            monto=gasto_obj.monto,
            descripcion=gasto_obj.descripcion,
            fecha_creacion=gasto_obj.fecha_creacion,
            divisiones=divisiones_response
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el gasto",
        ) from exc


@router.put("/{gasto_id}", response_model=GastoMessageResponse)
def update_gasto_endpoint(
    gasto_id: int = Path(gt=0),
    gasto_data: GastoUpdate = None,
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    """Actualiza un gasto existente."""
    print(f"\n[INFO] Iniciando actualización de gasto con ID: {gasto_id}")
    
    # Validar que se envíen datos
    if gasto_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requieren datos para actualizar",
        )
    
    # Validar datos de actualización
    es_valido, mensaje_error = validar_gasto_update(gasto_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        print("[INFO] Gasto encontrado, procediendo a actualizar...")
        updated_gasto = gasto.update_gasto(db, gasto_obj, gasto_data)
        print(f"[SUCCESS] Gasto actualizado exitosamente")
        
        divisiones = gasto.get_divisiones_by_gasto(db, updated_gasto.id_gasto)
        divisiones_response = [
            DivisionGastoResponse.model_validate(d) for d in divisiones
        ]
        
        gasto_response = GastoResponse(
            id_gasto=updated_gasto.id_gasto,
            id_viaje=updated_gasto.id_viaje,
            id_usuario=updated_gasto.id_usuario,
            id_categoria=updated_gasto.id_categoria,
            monto=updated_gasto.monto,
            descripcion=updated_gasto.descripcion,
            fecha_creacion=updated_gasto.fecha_creacion,
            divisiones=divisiones_response
        )
        
        return GastoMessageResponse(
            message="Gasto actualizado correctamente",
            data=gasto_response,
        )
    except GastoValidationError as exc:
        print(f"[ERROR] Validación en servicio: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al actualizar gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al actualizar el gasto",
        ) from exc


@router.delete("/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gasto_endpoint(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> None:
    """Elimina un gasto."""
    print(f"\n[INFO] Iniciando eliminación de gasto con ID: {gasto_id}")
    
    try:
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        print("[INFO] Gasto encontrado, procediendo a eliminar...")
        gasto.delete_gasto(db, gasto_obj)
        print(f"[SUCCESS] Gasto eliminado exitosamente")
    except GastoValidationError as exc:
        print(f"[ERROR] Validación en servicio: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al eliminar gasto: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al eliminar el gasto",
        ) from exc

