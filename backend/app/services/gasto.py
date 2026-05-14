from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models.gasto_model import Gasto
from app.schemas.gasto_schema import GastoCreate, GastoUpdate
from app.services.exceptions import GastoValidationError


def get_gastos(db: Session, travel_id: int | None = None) -> list[Gasto]:
    """Obtiene todos los gastos, opcionalmente filtrados por viaje."""
    query = db.query(Gasto)
    if travel_id:
        query = query.filter(Gasto.id_viaje == travel_id)
    return query.order_by(Gasto.id_gasto).all()


def get_gasto_by_id(db: Session, gasto_id: int) -> Gasto | None:
    """Obtiene un gasto por su ID."""
    return db.query(Gasto).filter(Gasto.id_gasto == gasto_id).first()


def create_gasto(db: Session, gasto_data: GastoCreate) -> Gasto:
    """
    Crea un nuevo gasto.
    
    NOTA: Las divisiones se crean de forma independiente via POST /divisiones-gastos
    """
    try:
        print(f"[INFO] Creando gasto: {gasto_data.descripcion}")
        print(f"[INFO] Monto total: ${gasto_data.monto}")
        
        # Crear el gasto
        gasto = Gasto(
            id_viaje=gasto_data.id_viaje,
            id_usuario=gasto_data.id_usuario,
            id_categoria=gasto_data.id_categoria,
            monto=gasto_data.monto,
            descripcion=gasto_data.descripcion.strip(),
        )
        
        db.add(gasto)
        db.commit()
        db.refresh(gasto)
        
        print(f"[SUCCESS] Gasto creado exitosamente con ID: {gasto.id_gasto}")
        print(f"[INFO] Ahora puedes crear divisiones con POST /divisiones-gastos")
        return gasto
        
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al crear gasto: {exc}")
        db.rollback()
        raise GastoValidationError(
            "No se pudo crear el gasto con los datos proporcionados."
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al crear gasto: {exc}")
        db.rollback()
        raise GastoValidationError(
            f"Error al crear el gasto: {str(exc)}"
        ) from exc


def update_gasto(db: Session, gasto: Gasto, gasto_data: GastoUpdate) -> Gasto:
    """Actualiza un gasto existente (solo campos básicos, no divisiones)."""
    updates = gasto_data.model_dump(exclude_unset=True)
    
    if "descripcion" in updates and updates["descripcion"] is not None:
        gasto.descripcion = updates["descripcion"].strip()
    
    if "monto" in updates and updates["monto"] is not None:
        gasto.monto = updates["monto"]
    
    if "id_categoria" in updates and updates["id_categoria"] is not None:
        gasto.id_categoria = updates["id_categoria"]
    
    if "id_viaje" in updates and updates["id_viaje"] is not None:
        gasto.id_viaje = updates["id_viaje"]
    
    if "id_usuario" in updates and updates["id_usuario"] is not None:
        gasto.id_usuario = updates["id_usuario"]
    
    try:
        print(f"[INFO] Actualizando gasto con ID: {gasto.id_gasto}")
        db.commit()
        db.refresh(gasto)
        print(f"[SUCCESS] Gasto actualizado exitosamente")
        return gasto
    except IntegrityError as exc:
        print(f"[ERROR] Error de integridad al actualizar gasto: {exc}")
        db.rollback()
        raise GastoValidationError(
            "No se pudo actualizar el gasto con los datos proporcionados."
        ) from exc


def delete_gasto(db: Session, gasto: Gasto) -> None:
    """Elimina un gasto y sus divisiones asociadas (cascade)."""
    try:
        print(f"[INFO] Eliminando gasto con ID: {gasto.id_gasto}")
        
        # Las divisiones se eliminan automáticamente por CASCADE en la BD
        db.delete(gasto)
        db.commit()
        print(f"[SUCCESS] Gasto eliminado exitosamente (divisiones eliminadas por CASCADE)")
    except IntegrityError as exc:
        print(f"[ERROR] Error al eliminar gasto: {exc}")
        db.rollback()
        raise GastoValidationError(
            "No se pudo eliminar el gasto."
        ) from exc
    except Exception as exc:
        print(f"[ERROR] Error inesperado al eliminar gasto: {exc}")
        db.rollback()
        raise GastoValidationError(
            f"Error al eliminar el gasto: {str(exc)}"
        ) from exc
        raise GastoValidationError(
            "No se pudo eliminar el gasto."
        ) from exc

