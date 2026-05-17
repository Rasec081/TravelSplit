from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.models.gasto_model import Gasto
from app.schemas.gasto_schema import GastoCreate, GastoUpdate
from app.services.exceptions import GastoNotFoundError, GastoValidationError


def get_gastos(db: Session) -> list[Gasto]:
    return db.query(Gasto).order_by(Gasto.id_gasto).all()


def get_gasto_by_id(db: Session, gasto_id: int) -> Gasto | None:
    return db.query(Gasto).filter(Gasto.id_gasto == gasto_id).first()


def get_gastos_by_viaje(db: Session, id_viaje: int) -> list[Gasto]:
    _validate_viaje_exists(db, id_viaje)
    return (
        db.query(Gasto)
        .filter(Gasto.id_viaje == id_viaje)
        .order_by(Gasto.id_gasto)
        .all()
    )


def create_gasto(db: Session, gasto_data: GastoCreate) -> Gasto:
    _validate_gasto_payload(
        db=db,
        id_viaje=gasto_data.id_viaje,
        id_usuario=gasto_data.id_usuario,
        id_categoria=gasto_data.id_categoria,
        monto=gasto_data.monto,
        descripcion=gasto_data.descripcion,
    )

    gasto = Gasto(
        id_viaje=gasto_data.id_viaje,
        id_usuario=gasto_data.id_usuario,
        id_categoria=gasto_data.id_categoria,
        monto=gasto_data.monto,
        descripcion=gasto_data.descripcion,
    )

    try:
        db.add(gasto)
        db.commit()
        db.refresh(gasto)
        return gasto
    except IntegrityError as exc:
        db.rollback()
        raise GastoValidationError("No se pudo crear el gasto con los datos enviados.") from exc
    except SQLAlchemyError:
        db.rollback()
        raise


def update_gasto(db: Session, gasto: Gasto, gasto_data: GastoUpdate) -> Gasto:
    updates = gasto_data.model_dump(exclude_unset=True)

    id_viaje = updates.get("id_viaje", gasto.id_viaje)
    id_usuario = updates.get("id_usuario", gasto.id_usuario)
    id_categoria = updates.get("id_categoria", gasto.id_categoria)
    monto = updates.get("monto", gasto.monto)
    descripcion = updates.get("descripcion", gasto.descripcion)

    _validate_gasto_payload(
        db=db,
        id_viaje=id_viaje,
        id_usuario=id_usuario,
        id_categoria=id_categoria,
        monto=monto,
        descripcion=descripcion,
    )

    for field, value in updates.items():
        setattr(gasto, field, value)

    try:
        db.commit()
        db.refresh(gasto)
        return gasto
    except IntegrityError as exc:
        db.rollback()
        raise GastoValidationError("No se pudo actualizar el gasto con los datos enviados.") from exc
    except SQLAlchemyError:
        db.rollback()
        raise


def delete_gasto(db: Session, gasto: Gasto) -> None:
    try:
        db.delete(gasto)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise GastoValidationError("No se pudo eliminar el gasto.") from exc
    except SQLAlchemyError:
        db.rollback()
        raise


def _validate_gasto_payload(
    db: Session,
    id_viaje: int,
    id_usuario: int,
    id_categoria: int | None,
    monto: Decimal,
    descripcion: str,
) -> None:
    if monto <= 0:
        raise GastoValidationError("El monto debe ser mayor que cero.")

    if not descripcion.strip():
        raise GastoValidationError("La descripción no puede estar vacía.")

    _validate_viaje_exists(db, id_viaje)
    _validate_usuario_exists(db, id_usuario)

    if id_categoria is not None:
        _validate_categoria_exists(db, id_categoria)


def _validate_viaje_exists(db: Session, id_viaje: int) -> None:
    if not _record_exists(db, "viajes", "id_viaje", id_viaje):
        raise GastoNotFoundError("Viaje no encontrado.")


def _validate_usuario_exists(db: Session, id_usuario: int) -> None:
    if not _record_exists(db, "usuarios", "id_usuario", id_usuario):
        raise GastoNotFoundError("Usuario no encontrado.")


def _validate_categoria_exists(db: Session, id_categoria: int) -> None:
    if not _record_exists(db, "categorias", "id_categoria", id_categoria):
        raise GastoNotFoundError("Categoría no encontrada.")


def _record_exists(db: Session, table_name: str, id_column: str, id_value: int) -> bool:
    query = text(f"SELECT 1 FROM {table_name} WHERE {id_column} = :id_value LIMIT 1")
    return db.execute(query, {"id_value": id_value}).first() is not None
