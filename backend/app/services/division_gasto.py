from decimal import Decimal

from sqlalchemy.orm import Session

from app.database.models.gasto_model import Gasto
from app.database.models.div_gasto import DivisionGasto, DivisionGastoParticipante
from app.services.exceptions import GastoValidationError


# ============================================================================
# FUNCIONES DE CONSULTA
# ============================================================================

def get_divisiones_by_gasto(db: Session, gasto_id: int) -> list[DivisionGasto]:
    """Obtiene todas las divisiones de un gasto con sus participantes."""
    print(f"[INFO] Obteniendo divisiones del gasto {gasto_id}")
    divisiones = db.query(DivisionGasto).filter(DivisionGasto.id_gasto == gasto_id).all()
    print(f"[SUCCESS] Se encontraron {len(divisiones)} divisiones")
    return divisiones


def get_division_by_id(db: Session, division_id: int) -> DivisionGasto | None:
    """Obtiene una división por su ID con sus participantes."""
    print(f"[INFO] Obteniendo división con ID: {division_id}")
    return db.query(DivisionGasto).filter(DivisionGasto.id_division == division_id).first()


def get_divisiones_by_usuario(db: Session, user_id: int) -> list[DivisionGasto]:
    """Obtiene todas las divisiones donde participa un usuario."""
    print(f"[INFO] Obteniendo divisiones del usuario {user_id}")
    divisiones = (
        db.query(DivisionGasto)
        .join(DivisionGastoParticipante)
        .filter(DivisionGastoParticipante.id_usuario == user_id)
        .all()
    )
    print(f"[SUCCESS] Se encontraron {len(divisiones)} divisiones")
    return divisiones


# ============================================================================
# CRUD DE DIVISIONES
# ============================================================================

def create_division(
    db: Session,
    id_gasto: int,
    nombre: str,
    monto_total: Decimal,
    participantes: list[dict]  # [{"id_usuario": 1, "monto": Decimal("50.00")}, ...]
) -> DivisionGasto:
    """
    Crea una nueva división de gasto con nombre y participantes.
    
    Args:
        db: Sesión de base de datos
        id_gasto: ID del gasto asociado
        nombre: Nombre de la división (ej: "Daniel invita")
        monto_total: Monto total de la división
        participantes: Lista de participantes con monto cada uno
    
    Returns:
        DivisionGasto con los participantes creados
    """
    try:
        print(f"[INFO] Creando división: '{nombre}' para gasto {id_gasto}, monto {monto_total}")
        
        # Validar que el gasto exista
        gasto = db.query(Gasto).filter(Gasto.id_gasto == id_gasto).first()
        if not gasto:
            raise GastoValidationError(f"El gasto con ID {id_gasto} no existe")
        
        # Crear la división
        division = DivisionGasto(
            id_gasto=id_gasto,
            nombre=nombre,
            monto_total=monto_total
        )
        db.add(division)
        db.flush()  # Para obtener id_division
        
        # Crear participantes
        print(f"  → Agregando {len(participantes)} participantes")
        for part in participantes:
            participante = DivisionGastoParticipante(
                id_division=division.id_division,
                id_usuario=part["id_usuario"],
                monto=part["monto"]
            )
            db.add(participante)
            print(f"    • Usuario {part['id_usuario']}: {part['monto']}")
        
        db.commit()
        db.refresh(division)
        
        print(f"[SUCCESS] División creada con ID: {division.id_division}")
        return division
        
    except GastoValidationError:
        db.rollback()
        raise
    except Exception as exc:
        print(f"[ERROR] Error al crear división: {exc}")
        db.rollback()
        raise GastoValidationError(f"Error al crear división: {str(exc)}") from exc


def update_division(
    db: Session,
    division: DivisionGasto,
    nombre: str | None = None,
    monto_total: Decimal | None = None,
    participantes: list[dict] | None = None
) -> DivisionGasto:
    """
    Actualiza una división existente (nombre, monto, y/o participantes).
    
    Args:
        db: Sesión de base de datos
        division: División a actualizar
        nombre: Nuevo nombre (opcional)
        monto_total: Nuevo monto total (opcional)
        participantes: Nueva lista de participantes (opcional)
    
    Returns:
        División actualizada
    """
    try:
        print(f"[INFO] Actualizando división con ID: {division.id_division}")
        
        if nombre is not None:
            division.nombre = nombre
            print(f"  → Nombre actualizado a: '{nombre}'")
        
        if monto_total is not None:
            division.monto_total = monto_total
            print(f"  → Monto total actualizado a: {monto_total}")
        
        if participantes is not None:
            print(f"  → Reemplazando participantes ({len(participantes)} nuevos)")
            # Eliminar participantes antiguos
            db.query(DivisionGastoParticipante).filter(
                DivisionGastoParticipante.id_division == division.id_division
            ).delete()
            
            # Agregar nuevos participantes
            for part in participantes:
                participante = DivisionGastoParticipante(
                    id_division=division.id_division,
                    id_usuario=part["id_usuario"],
                    monto=part["monto"]
                )
                db.add(participante)
                print(f"    • Usuario {part['id_usuario']}: {part['monto']}")
        
        db.commit()
        db.refresh(division)
        
        print(f"[SUCCESS] División actualizada exitosamente")
        return division
        
    except Exception as exc:
        print(f"[ERROR] Error al actualizar división: {exc}")
        db.rollback()
        raise GastoValidationError(f"Error al actualizar división: {str(exc)}") from exc


def delete_division(db: Session, division: DivisionGasto) -> None:
    """
    Elimina una división y todos sus participantes.
    
    Args:
        db: Sesión de base de datos
        division: División a eliminar
    """
    try:
        print(f"[INFO] Eliminando división con ID: {division.id_division}")
        
        db.delete(division)  # El CASCADE se encarga de participantes
        db.commit()
        
        print(f"[SUCCESS] División eliminada exitosamente")
        
    except Exception as exc:
        print(f"[ERROR] Error al eliminar división: {exc}")
        db.rollback()
        raise GastoValidationError(f"Error al eliminar división: {str(exc)}") from exc
