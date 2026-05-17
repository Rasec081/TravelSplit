from decimal import Decimal

from sqlalchemy.orm import Session

from app.database.models.payment_model import Payment
from app.database.models.travel_model import Travel, UserTravel
from app.services.exceptions import TravelConflictError, TravelValidationError


def _validate_users_in_travel(db: Session, travel_id: int, user_id: int) -> None:
    exists = db.query(UserTravel).filter(UserTravel.id_travel == travel_id, UserTravel.id_usuario == user_id).first()
    if not exists:
        raise TravelValidationError(f"El usuario {user_id} no pertenece al viaje {travel_id}")


def list_payments_by_travel(db: Session, travel_id: int) -> list[Payment]:
    travel = db.query(Travel).filter(Travel.id_travel == travel_id).first()
    if not travel:
        raise TravelValidationError(f"El viaje con ID {travel_id} no existe")

    return (
        db.query(Payment)
        .filter(Payment.id_viaje == travel_id)
        .order_by(Payment.fecha_creacion.desc(), Payment.id_pago.desc())
        .all()
    )


def create_payment(db: Session, travel_id: int, user_from: int, user_to: int, monto: Decimal) -> Payment:
    if user_from == user_to:
        raise TravelValidationError("El usuario que paga y quien recibe deben ser distintos")
    if monto is None or Decimal(str(monto)) <= 0:
        raise TravelValidationError("El monto debe ser mayor a 0")

    travel = db.query(Travel).filter(Travel.id_travel == travel_id).first()
    if not travel:
        raise TravelValidationError(f"El viaje con ID {travel_id} no existe")

    _validate_users_in_travel(db, travel_id, user_from)
    _validate_users_in_travel(db, travel_id, user_to)

    pago = Payment(
        id_viaje=travel_id,
        id_usuario_from=user_from,
        id_usuario_to=user_to,
        monto=monto,
    )

    try:
        db.add(pago)
        db.commit()
        db.refresh(pago)
        return pago
    except Exception as exc:
        db.rollback()
        raise TravelConflictError("No se pudo registrar el pago") from exc

