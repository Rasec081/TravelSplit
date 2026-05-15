from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.division_gasto_schema import (
    DivisionGastoResponse,
    DivisionGastoCreate,
    DivisionGastoUpdate,
    DivisionGastoMessageResponse,
    ParticipanteEnDivision,
)
from app.services import division_gasto, gasto
from app.services.exceptions import GastoValidationError

router = APIRouter(prefix="/divisiones-gastos", tags=["Divisiones de Gastos"])


# ============================================================================
# FUNCIONES AUXILIARES DE RESPUESTA
# ============================================================================

def construir_respuesta_division(division_obj) -> DivisionGastoResponse:
    """Construye una respuesta de división a partir del objeto ORM."""
    participantes = [
        ParticipanteEnDivision(
            id_usuario=p.id_usuario,
            monto=p.monto
        )
        for p in division_obj.participantes
    ]
    
    return DivisionGastoResponse(
        id_division=division_obj.id_division,
        id_gasto=division_obj.id_gasto,
        nombre=division_obj.nombre,
        monto_total=division_obj.monto_total,
        participantes=participantes,
        fecha_creacion=division_obj.fecha_creacion.isoformat() if division_obj.fecha_creacion else None,
    )


# ============================================================================
# ENDPOINTS GET - LECTURA DE DIVISIONES
# ============================================================================

@router.get("", response_model=list[DivisionGastoResponse])
def list_divisiones(
    gasto_id: int | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[DivisionGastoResponse]:
    """
    Lista divisiones de gastos.
    - Si se proporciona `gasto_id`: obtiene divisiones de un gasto específico
    - Si se proporciona `user_id`: obtiene divisiones donde participa el usuario
    """
    print(f"\n[INFO] Obteniendo divisiones" + 
          (f" del gasto {gasto_id}" if gasto_id else "") + 
          (f" del usuario {user_id}" if user_id else ""))
    
    try:
        if gasto_id:
            if not isinstance(gasto_id, int) or gasto_id <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ID de gasto debe ser un entero positivo",
                )
            divisiones_list = division_gasto.get_divisiones_by_gasto(db, gasto_id)
        elif user_id:
            if not isinstance(user_id, int) or user_id <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ID de usuario debe ser un entero positivo",
                )
            divisiones_list = division_gasto.get_divisiones_by_usuario(db, user_id)
        else:
            # Si no se proporciona filtro, retornar lista vacía (implementar paginación en el futuro)
            divisiones_list = []
        
        print(f"[SUCCESS] Se obtuvieron {len(divisiones_list)} división(es)")
        
        respuesta = [construir_respuesta_division(d) for d in divisiones_list]
        return respuesta
        
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener divisiones: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las divisiones",
        ) from exc


@router.get("/{division_id}", response_model=DivisionGastoResponse)
def get_division(
    division_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> DivisionGastoResponse:
    """Obtiene una división específica por ID con todos sus participantes."""
    print(f"\n[INFO] Obteniendo división con ID: {division_id}")
    
    try:
        division_obj = division_gasto.get_division_by_id(db, division_id)
        
        if not division_obj:
            print(f"[ERROR] División con ID {division_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una división con ese identificador",
            )
        
        print(f"[SUCCESS] División encontrada: {division_obj.nombre} - ${division_obj.monto_total}")
        
        return construir_respuesta_division(division_obj)
        
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener división: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener la división",
        ) from exc


# ============================================================================
# ENDPOINTS POST - CREAR DIVISIÓN
# ============================================================================

@router.post(
    "",
    response_model=DivisionGastoMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_division_endpoint(
    division_data: DivisionGastoCreate,
    db: Session = Depends(get_db),
) -> DivisionGastoMessageResponse:
    """
    Crea una nueva división de gasto con nombre y participantes.
    
    Ejemplo de request:
    {
        "id_gasto": 1,
        "nombre": "Daniel invita",
        "monto_total": "50.00",
        "participantes": [
            {"id_usuario": 1, "monto": "40.00"},
            {"id_usuario": 2, "monto": "10.00"}
        ]
    }
    """
    print(f"\n[INFO] Iniciando creación de división: '{division_data.nombre}'")
    print(f"       Gasto: {division_data.id_gasto}, Monto total: {division_data.monto_total}")
    
    try:
        # Convertir participantes a lista de dicts
        participantes_dict = [
            {"id_usuario": p.id_usuario, "monto": p.monto}
            for p in division_data.participantes
        ]
        
        division_obj = division_gasto.create_division(
            db,
            id_gasto=division_data.id_gasto,
            nombre=division_data.nombre,
            monto_total=division_data.monto_total,
            participantes=participantes_dict
        )
        
        division_response = construir_respuesta_division(division_obj)
        
        return DivisionGastoMessageResponse(
            message=f"División '{division_data.nombre}' creada exitosamente con {len(division_data.participantes)} participantes",
            data=division_response,
        )
        
    except GastoValidationError as exc:
        print(f"[ERROR] Validación: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        print(f"[ERROR] Error de validación Pydantic: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al crear la división",
        ) from exc


# ============================================================================
# ENDPOINTS PUT - ACTUALIZAR DIVISIÓN
# ============================================================================

@router.put(
    "/{division_id}",
    response_model=DivisionGastoMessageResponse,
)
def update_division_endpoint(
    division_id: int = Path(gt=0),
    division_data: DivisionGastoUpdate = None,
    db: Session = Depends(get_db),
) -> DivisionGastoMessageResponse:
    """
    Actualiza una división existente (nombre, monto total, y/o participantes).
    
    Permite redistribuir los montos entre participantes manteniendo el balance exacto.
    
    Ejemplo de request:
    {
        "nombre": "Daniel Invita - Actualizado",
        "monto_total": "60.00",
        "participantes": [
            {"id_usuario": 1, "monto": "50.00"},
            {"id_usuario": 2, "monto": "10.00"}
        ]
    }
    """
    print(f"\n[INFO] Iniciando actualización de división con ID: {division_id}")
    
    try:
        division_obj = division_gasto.get_division_by_id(db, division_id)
        
        if not division_obj:
            print(f"[ERROR] División con ID {division_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una división con ese identificador",
            )
        
        # Convertir participantes a lista de dicts si se proporcionan
        participantes_dict = None
        if division_data.participantes:
            participantes_dict = [
                {"id_usuario": p.id_usuario, "monto": p.monto}
                for p in division_data.participantes
            ]
        
        print("[INFO] División encontrada, procediendo a actualizar...")
        updated_division = division_gasto.update_division(
            db,
            division_obj,
            nombre=division_data.nombre,
            monto_total=division_data.monto_total,
            participantes=participantes_dict
        )
        
        division_response = construir_respuesta_division(updated_division)
        
        return DivisionGastoMessageResponse(
            message="División actualizada exitosamente",
            data=division_response,
        )
        
    except HTTPException:
        raise
    except GastoValidationError as exc:
        print(f"[ERROR] Validación: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        print(f"[ERROR] Error de validación Pydantic: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al actualizar la división",
        ) from exc


# ============================================================================
# ENDPOINTS DELETE - ELIMINAR DIVISIÓN
# ============================================================================

@router.delete(
    "/{division_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_division_endpoint(
    division_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> None:
    """Elimina una división y todos sus participantes."""
    print(f"\n[INFO] Iniciando eliminación de división con ID: {division_id}")
    
    try:
        division_obj = division_gasto.get_division_by_id(db, division_id)
        
        if not division_obj:
            print(f"[ERROR] División con ID {division_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una división con ese identificador",
            )
        
        print("[INFO] División encontrada, procediendo a eliminar...")
        division_gasto.delete_division(db, division_obj)
        print(f"[SUCCESS] División eliminada exitosamente")
        
    except HTTPException:
        raise
    except GastoValidationError as exc:
        print(f"[ERROR] Validación: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al eliminar la división",
        ) from exc


# ============================================================================
# FUNCIONES DE VALIDACIÓN
# ============================================================================

def validar_division_id(division_id: int) -> tuple[bool, str]:
    """Valida que el ID de división sea válido."""
    if not isinstance(division_id, int) or division_id <= 0:
        print(f"[ERROR] division_id debe ser entero positivo, se recibió: {division_id}")
        return False, "El ID de división debe ser un entero positivo"
    return True, ""


def validar_gasto_id(gasto_id: int) -> tuple[bool, str]:
    """Valida que el ID de gasto sea válido."""
    if not isinstance(gasto_id, int) or gasto_id <= 0:
        print(f"[ERROR] gasto_id debe ser entero positivo, se recibió: {gasto_id}")
        return False, "El ID de gasto debe ser un entero positivo"
    return True, ""


# ============================================================================
# ENDPOINTS CRUD - DIVISIONES DE GASTOS
# ============================================================================

@router.get("", response_model=list[DivisionGastoResponse])
def list_divisiones(
    gasto_id: int | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[DivisionGastoResponse]:
    """
    Lista divisiones de gastos.
    - Si se proporciona `gasto_id`: obtiene divisiones de un gasto específico
    - Si se proporciona `user_id`: obtiene divisiones donde participa el usuario
    """
    print(f"\n[INFO] Obteniendo divisiones" + 
          (f" del gasto {gasto_id}" if gasto_id else "") + 
          (f" del usuario {user_id}" if user_id else ""))
    
    try:
        if gasto_id:
            es_valido, mensaje = validar_gasto_id(gasto_id)
            if not es_valido:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=mensaje,
                )
            divisiones_list = division_gasto.get_divisiones_by_gasto(db, gasto_id)
        elif user_id:
            if not isinstance(user_id, int) or user_id <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ID de usuario debe ser un entero positivo",
                )
            divisiones_list = division_gasto.get_divisiones_by_usuario(db, user_id)
        else:
            # Si no se proporciona filtro, listar todas (límite razonable por performance)
            # En producción, implementar paginación
            divisiones_list = db.query(DivisionGastoResponse).limit(100).all()
        
        print(f"[SUCCESS] Se obtuvieron {len(divisiones_list)} división(es)")
        
        respuesta = [DivisionGastoResponse.model_validate(d) for d in divisiones_list]
        return respuesta
        
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener divisiones: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las divisiones",
        ) from exc


@router.get("/{division_id}", response_model=DivisionGastoResponse)
def get_division(
    division_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> DivisionGastoResponse:
    """Obtiene una división específica por ID."""
    print(f"\n[INFO] Obteniendo división con ID: {division_id}")
    
    try:
        division_obj = division_gasto.get_division_by_id(db, division_id)
        
        if not division_obj:
            print(f"[ERROR] División con ID {division_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una división con ese identificador",
            )
        
        print(f"[SUCCESS] División encontrada: Usuario {division_obj.id_usuario} - ${division_obj.monto}")
        
        return DivisionGastoResponse.model_validate(division_obj)
        
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener división: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener la división",
        ) from exc


@router.get("/gasto/{gasto_id}/resumen")
def get_resumen_divisiones(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> dict:
    """
    Obtiene un resumen de las divisiones de un gasto.
    Incluye: cantidad de participantes, montos, validación de suma.
    """
    print(f"\n[INFO] Obteniendo resumen de divisiones del gasto {gasto_id}")
    
    try:
        # Validar que el gasto exista
        gasto_obj = gasto.get_gasto_by_id(db, gasto_id)
        if not gasto_obj:
            print(f"[ERROR] Gasto con ID {gasto_id} no encontrado")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un gasto con ese identificador",
            )
        
        divisiones = division_gasto.get_divisiones_by_gasto(db, gasto_id)
        
        if not divisiones:
            print(f"[WARNING] No hay divisiones para el gasto {gasto_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay divisiones para este gasto",
            )
        
        suma_divisiones = sum(Decimal(str(d.monto)) for d in divisiones)
        monto_gasto = Decimal(str(gasto_obj.monto))
        es_congruente = suma_divisiones == monto_gasto
        
        print(f"[SUCCESS] Resumen calculado: {len(divisiones)} participantes, suma: ${suma_divisiones}")
        
        return {
            "id_gasto": gasto_id,
            "monto_gasto": str(monto_gasto),
            "cantidad_participantes": len(divisiones),
            "suma_divisiones": str(suma_divisiones),
            "es_congruente": es_congruente,
            "diferencia": str(suma_divisiones - monto_gasto) if not es_congruente else "0.00",
            "divisiones": [DivisionGastoResponse.model_validate(d) for d in divisiones]
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener resumen: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el resumen de divisiones",
        ) from exc


@router.get("/usuario/{user_id}/balance")
def get_balance_usuario(
    user_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> dict:
    """
    Obtiene el balance total de divisiones de un usuario.
    Muestra cuánto ha pagado en divisiones.
    """
    print(f"\n[INFO] Obteniendo balance para usuario {user_id}")
    
    try:
        divisiones = division_gasto.get_divisiones_by_usuario(db, user_id)
        
        if not divisiones:
            print(f"[INFO] Usuario {user_id} sin divisiones")
            return {
                "id_usuario": user_id,
                "cantidad_divisiones": 0,
                "monto_total": "0.00",
                "divisiones": []
            }
        
        monto_total = sum(Decimal(str(d.monto)) for d in divisiones)
        
        print(f"[SUCCESS] Balance calculado: {len(divisiones)} divisiones, total: ${monto_total}")
        
        return {
            "id_usuario": user_id,
            "cantidad_divisiones": len(divisiones),
            "monto_total": str(monto_total),
            "divisiones": [DivisionGastoResponse.model_validate(d) for d in divisiones]
        }
        
    except Exception as exc:
        print(f"[ERROR] Error al obtener balance: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener el balance del usuario",
        ) from exc


# ============================================================================
# CRUD COMPLETO - CREAR, ACTUALIZAR, ELIMINAR DIVISIONES
# ============================================================================

@router.post(
    "",
    response_model=DivisionGastoMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_division_endpoint(
    division_data: DivisionGastoCreate,
    db: Session = Depends(get_db),
) -> DivisionGastoMessageResponse:
    """Crea una nueva división de gasto manualmente."""
    print(f"\n[INFO] Iniciando creación de división: gasto {division_data.id_gasto}, usuario {division_data.id_usuario}")
    
    # Validar datos
    if division_data.id_gasto <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID del gasto debe ser mayor a 0",
        )
    
    if division_data.id_usuario <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID del usuario debe ser mayor a 0",
        )
    
    if division_data.monto <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El monto debe ser mayor a 0",
        )
    
    try:
        division_obj = division_gasto.create_division(
            db,
            division_data.id_gasto,
            division_data.id_usuario,
            division_data.monto
        )
        
        division_response = DivisionGastoResponse.model_validate(division_obj)
        
        return DivisionGastoMessageResponse(
            message="División creada correctamente",
            data=division_response,
        )
        
    except GastoValidationError as exc:
        print(f"[ERROR] Validación: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al crear la división",
        ) from exc


@router.put(
    "/{division_id}",
    response_model=DivisionGastoMessageResponse,
)
def update_division_endpoint(
    division_id: int = Path(gt=0),
    division_data: DivisionGastoUpdate = None,
    db: Session = Depends(get_db),
) -> DivisionGastoMessageResponse:
    """Actualiza una división existente."""
    print(f"\n[INFO] Iniciando actualización de división con ID: {division_id}")
    
    # Validar que se envíen datos
    if division_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requieren datos para actualizar",
        )
    
    try:
        division_obj = division_gasto.get_division_by_id(db, division_id)
        
        if not division_obj:
            print(f"[ERROR] División con ID {division_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una división con ese identificador",
            )
        
        # Validar datos si se proporcionan
        if division_data.id_usuario is not None and division_data.id_usuario <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ID del usuario debe ser mayor a 0",
            )
        
        if division_data.monto is not None and division_data.monto <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El monto debe ser mayor a 0",
            )
        
        print("[INFO] División encontrada, procediendo a actualizar...")
        updated_division = division_gasto.update_division(
            db,
            division_obj,
            division_data.id_usuario,
            division_data.monto
        )
        
        division_response = DivisionGastoResponse.model_validate(updated_division)
        
        return DivisionGastoMessageResponse(
            message="División actualizada correctamente",
            data=division_response,
        )
        
    except HTTPException:
        raise
    except GastoValidationError as exc:
        print(f"[ERROR] Validación: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al actualizar la división",
        ) from exc


@router.delete(
    "/{division_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_division_endpoint(
    division_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> None:
    """Elimina una división existente."""
    print(f"\n[INFO] Iniciando eliminación de división con ID: {division_id}")
    
    try:
        division_obj = division_gasto.get_division_by_id(db, division_id)
        
        if not division_obj:
            print(f"[ERROR] División con ID {division_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una división con ese identificador",
            )
        
        print("[INFO] División encontrada, procediendo a eliminar...")
        division_gasto.delete_division(db, division_obj)
        print(f"[SUCCESS] División eliminada exitosamente")
        
    except HTTPException:
        raise
    except GastoValidationError as exc:
        print(f"[ERROR] Validación: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al eliminar la división",
        ) from exc
