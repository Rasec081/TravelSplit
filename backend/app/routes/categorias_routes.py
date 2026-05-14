from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.categorias_schema import (
    CategoriaCreate,
    CategoriaMessageResponse,
    CategoriaResponse,
    CategoriaUpdate,
)
from app.services import categories
from app.services.exceptions import CategoriaConflictError

router = APIRouter(prefix="/categorias", tags=["Categorías"])


'''
aqui van las validaciones de datos que se reciben del frontend, y aqui se llaman a 
las funciones del servicio de categorias para insertar los datos en la db
'''

# ============================================================================
# FUNCIONES DE VALIDACIÓN
# ============================================================================

def validar_categoria_create(categoria_data: CategoriaCreate) -> tuple[bool, str]:
    """
    Valida que los datos para crear una categoría sean completos y correctos.
    Retorna: (es_válido, mensaje_error)
    """
    # Validar que nombre_categoria no sea vacío
    if not categoria_data.nombre_categoria or not isinstance(categoria_data.nombre_categoria, str):
        print("[ERROR] nombre_categoria es requerido y debe ser string")
        return False, "El campo 'nombre_categoria' es requerido y debe ser de tipo string"
    
    # Validar que nombre_categoria tenga contenido
    if not categoria_data.nombre_categoria.strip():
        print("[ERROR] nombre_categoria no puede estar vacío")
        return False, "El campo 'nombre_categoria' no puede estar vacío"
    
    # Validar que tipo no sea None
    if categoria_data.tipo is None:
        print("[ERROR] tipo es requerido")
        return False, "El campo 'tipo' es requerido"
    
    # Validar que tipo sea string
    if not isinstance(categoria_data.tipo, str):
        print("[ERROR] tipo debe ser string, se recibió:", type(categoria_data.tipo).__name__)
        return False, f"El campo 'tipo' debe ser de tipo string, se recibió {type(categoria_data.tipo).__name__}"
    
    # Validar que tipo sea "viaje" o "gasto"
    if categoria_data.tipo not in ["viaje", "gasto"]:
        print(f"[ERROR] tipo debe ser 'viaje' o 'gasto', se recibió: '{categoria_data.tipo}'")
        return False, "El campo 'tipo' debe ser 'viaje' o 'gasto'"
    
    return True, ""


def validar_categoria_update(categoria_data: CategoriaUpdate) -> tuple[bool, str]:
    """
    Valida que los datos para actualizar una categoría sean correctos.
    Retorna: (es_válido, mensaje_error)
    """
    # Validar nombre_categoria si es proporcionado
    if categoria_data.nombre_categoria is not None:
        if not isinstance(categoria_data.nombre_categoria, str):
            print(f"[ERROR] nombre_categoria debe ser string, se recibió: {type(categoria_data.nombre_categoria).__name__}")
            return False, f"El campo 'nombre_categoria' debe ser de tipo string, se recibió {type(categoria_data.nombre_categoria).__name__}"
        
        if not categoria_data.nombre_categoria.strip():
            print("[ERROR] nombre_categoria no puede estar vacío")
            return False, "El campo 'nombre_categoria' no puede estar vacío"
    
    # Validar tipo si es proporcionado
    if categoria_data.tipo is not None:
        if not isinstance(categoria_data.tipo, str):
            print(f"[ERROR] tipo debe ser string, se recibió: {type(categoria_data.tipo).__name__}")
            return False, f"El campo 'tipo' debe ser de tipo string, se recibió {type(categoria_data.tipo).__name__}"
        
        if categoria_data.tipo not in ["viaje", "gasto"]:
            print(f"[ERROR] tipo debe ser 'viaje' o 'gasto', se recibió: '{categoria_data.tipo}'")
            return False, "El campo 'tipo' debe ser 'viaje' o 'gasto'"
    
    # Validar que al menos un campo sea proporcionado
    if categoria_data.nombre_categoria is None and categoria_data.tipo is None:
        print("[ERROR] Debe proporcionar al menos un campo para actualizar")
        return False, "Debe proporcionar al menos un campo (nombre_categoria o tipo) para actualizar"
    
    return True, ""



# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post(
    "",
    response_model=CategoriaMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_categoria(
    categoria_data: CategoriaCreate,
    db: Session = Depends(get_db),
) -> CategoriaMessageResponse:
    """Crea una nueva categoría."""
    print(f"\n[INFO] Iniciando creación de categoría con datos: {categoria_data}")
    
    # Validar datos
    es_valido, mensaje_error = validar_categoria_create(categoria_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        print("[INFO] Datos válidos, llamando a servicio de creación...")
        categoria = categories.create_categoria(db, categoria_data)
        print(f"[SUCCESS] Categoría creada exitosamente con ID: {categoria.id_categoria}")
        
        return CategoriaMessageResponse(
            message="Categoría creada correctamente",
            data=categoria,
        )
    except CategoriaConflictError as exc:
        print(f"[ERROR] Conflicto en base de datos: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al crear categoría: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al crear la categoría",
        ) from exc


@router.get("", response_model=list[CategoriaResponse])
def list_categorias(
    tipo: str | None = Query(None, description="Filtrar por tipo: 'viaje' o 'gasto'"),
    db: Session = Depends(get_db),
) -> list[CategoriaResponse]:
    """Lista todas las categorías, opcionalmente filtradas por tipo."""
    print(f"\n[INFO] Iniciando obtención de categorías con filtro tipo: {tipo}")
    
    # Validar tipo si es proporcionado
    if tipo is not None:
        if not isinstance(tipo, str):
            print(f"[ERROR] Parámetro 'tipo' debe ser string, se recibió: {type(tipo).__name__}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El parámetro 'tipo' debe ser string, se recibió {type(tipo).__name__}",
            )
        
        if tipo not in ["viaje", "gasto"]:
            print(f"[ERROR] 'tipo' debe ser 'viaje' o 'gasto', se recibió: '{tipo}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El parámetro 'tipo' debe ser 'viaje' o 'gasto'",
            )
    
    try:
        print("[INFO] Filtrando categorías...")
        categorias = categories.get_categorias(db, tipo)
        print(f"[SUCCESS] Se obtuvieron {len(categorias)} categoría(s)")
        return categorias
    except Exception as exc:
        print(f"[ERROR] Error al obtener categorías: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las categorías",
        ) from exc


@router.get("/{categoria_id}", response_model=CategoriaResponse)
def get_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
) -> CategoriaResponse:
    """Obtiene una categoría por ID."""
    print(f"\n[INFO] Iniciando obtención de categoría con ID: {categoria_id}")
    
    # Validar que categoria_id sea entero positivo
    if not isinstance(categoria_id, int):
        print(f"[ERROR] categoria_id debe ser entero, se recibió: {type(categoria_id).__name__}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El parámetro 'categoria_id' debe ser de tipo entero",
        )
    
    if categoria_id <= 0:
        print(f"[ERROR] categoria_id debe ser mayor a 0, se recibió: {categoria_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'categoria_id' debe ser mayor a 0",
        )
    
    try:
        print(f"[INFO] Buscando categoría con ID: {categoria_id}")
        categoria = categories.get_categoria_by_id(db, categoria_id)
        
        if not categoria:
            print(f"[ERROR] Categoría con ID {categoria_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una categoría con ese identificador.",
            )
        
        print(f"[SUCCESS] Categoría encontrada: {categoria.nombre_categoria}")
        return categoria
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error al obtener categoría: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener la categoría",
        ) from exc


@router.put("/{categoria_id}", response_model=CategoriaMessageResponse)
def update_categoria(
    categoria_id: int,
    categoria_data: CategoriaUpdate,
    db: Session = Depends(get_db),
) -> CategoriaMessageResponse:
    """Actualiza una categoría existente."""
    print(f"\n[INFO] Iniciando actualización de categoría con ID: {categoria_id}")
    print(f"[INFO] Datos de actualización: {categoria_data}")
    
    # Validar categoria_id
    if not isinstance(categoria_id, int):
        print(f"[ERROR] categoria_id debe ser entero, se recibió: {type(categoria_id).__name__}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'categoria_id' debe ser de tipo entero",
        )
    
    if categoria_id <= 0:
        print(f"[ERROR] categoria_id debe ser mayor a 0, se recibió: {categoria_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'categoria_id' debe ser mayor a 0",
        )
    
    # Validar datos de actualización
    es_valido, mensaje_error = validar_categoria_update(categoria_data)
    if not es_valido:
        print(f"[ERROR] Validación fallida: {mensaje_error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje_error,
        )
    
    try:
        print(f"[INFO] Buscando categoría existente con ID: {categoria_id}")
        categoria = categories.get_categoria_by_id(db, categoria_id)
        
        if not categoria:
            print(f"[ERROR] Categoría con ID {categoria_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una categoría con ese identificador.",
            )
        
        print("[INFO] Categoría encontrada, procediendo a actualizar...")
        updated_categoria = categories.update_categoria(db, categoria, categoria_data)
        print(f"[SUCCESS] Categoría actualizada exitosamente: {updated_categoria.nombre_categoria}")
        
        return CategoriaMessageResponse(
            message="Categoría actualizada correctamente",
            data=updated_categoria,
        )
    except CategoriaConflictError as exc:
        print(f"[ERROR] Conflicto en base de datos: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al actualizar categoría: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al actualizar la categoría",
        ) from exc


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Elimina una categoría."""
    print(f"\n[INFO] Iniciando eliminación de categoría con ID: {categoria_id}")
    
    # Validar categoria_id
    if not isinstance(categoria_id, int):
        print(f"[ERROR] categoria_id debe ser entero, se recibió: {type(categoria_id).__name__}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'categoria_id' debe ser de tipo entero",
        )
    
    if categoria_id <= 0:
        print(f"[ERROR] categoria_id debe ser mayor a 0, se recibió: {categoria_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro 'categoria_id' debe ser mayor a 0",
        )
    
    try:
        print(f"[INFO] Buscando categoría existente con ID: {categoria_id}")
        categoria = categories.get_categoria_by_id(db, categoria_id)
        
        if not categoria:
            print(f"[ERROR] Categoría con ID {categoria_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró una categoría con ese identificador.",
            )
        
        print(f"[INFO] Categoría encontrada: {categoria.nombre_categoria}, procediendo a eliminar...")
        categories.delete_categoria(db, categoria)
        print(f"[SUCCESS] Categoría eliminada exitosamente")
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] Error inesperado al eliminar categoría: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado al eliminar la categoría",
        ) from exc
