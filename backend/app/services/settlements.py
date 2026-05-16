from decimal import Decimal

from sqlalchemy.orm import Session

from app.services import balance as balance_service
from app.services.exceptions import TravelValidationError


def calculate_settlements_for_user(db: Session, travel_id: int, user_id: int) -> dict:
    """
    Calcula un plan de liquidación (a quién pagar / de quién recibir) para un usuario específico,
    basado en los balances actuales del viaje (incluyendo pagos registrados).

    Devuelve únicamente las contrapartes necesarias para saldar el balance del usuario consultado.
    """
    balance_result = balance_service.calculate_balance_by_travel(db, travel_id)
    travel = balance_result["travel"]
    usuarios = balance_result["usuarios_balance"]

    by_id = {u["id_usuario"]: u for u in usuarios}
    me = by_id.get(user_id)
    if not me:
        raise TravelValidationError(f"El usuario {user_id} no pertenece al viaje {travel_id}")

    my_balance = Decimal(str(me["balance_final"]))
    if my_balance == 0:
        return {"travel": travel, "user_id": user_id, "items": []}

    creditors = [
        {
            "id_usuario": u["id_usuario"],
            "nombre": u["nombre"],
            "correo": u["correo"],
            "balance": Decimal(str(u["balance_final"])),
        }
        for u in usuarios
        if Decimal(str(u["balance_final"])) > 0 and u["id_usuario"] != user_id
    ]
    debtors = [
        {
            "id_usuario": u["id_usuario"],
            "nombre": u["nombre"],
            "correo": u["correo"],
            "balance": Decimal(str(u["balance_final"])),
        }
        for u in usuarios
        if Decimal(str(u["balance_final"])) < 0 and u["id_usuario"] != user_id
    ]

    creditors.sort(key=lambda u: (u["nombre"], u["id_usuario"]))
    debtors.sort(key=lambda u: (u["nombre"], u["id_usuario"]))

    items: list[dict] = []

    if my_balance < 0:
        remaining = abs(my_balance)
        for creditor in creditors:
            if remaining <= 0:
                break
            available = creditor["balance"]
            if available <= 0:
                continue
            pay_amount = min(remaining, available)
            if pay_amount <= 0:
                continue
            items.append(
                {
                    "tipo": "pagar_a",
                    "contraparte": {
                        "id_usuario": creditor["id_usuario"],
                        "nombre": creditor["nombre"],
                        "correo": creditor["correo"],
                    },
                    "monto": pay_amount,
                }
            )
            remaining -= pay_amount
            creditor["balance"] -= pay_amount

        return {"travel": travel, "user_id": user_id, "items": items}

    # my_balance > 0
    remaining = my_balance
    for debtor in debtors:
        if remaining <= 0:
            break
        available = abs(debtor["balance"])
        if available <= 0:
            continue
        receive_amount = min(remaining, available)
        if receive_amount <= 0:
            continue
        items.append(
            {
                "tipo": "recibir_de",
                "contraparte": {
                    "id_usuario": debtor["id_usuario"],
                    "nombre": debtor["nombre"],
                    "correo": debtor["correo"],
                },
                "monto": receive_amount,
            }
        )
        remaining -= receive_amount
        debtor["balance"] += receive_amount

    return {"travel": travel, "user_id": user_id, "items": items}

