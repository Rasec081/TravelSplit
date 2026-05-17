from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.models.travel_model import Travel, UserTravel
from app.database.models.gasto_model import Gasto
from app.database.models.div_gasto import DivisionGasto, DivisionGastoParticipante
from app.database.models.payment_model import Payment
from app.database.models.user_model import User
from app.services.exceptions import TravelConflictError, TravelValidationError


def calculate_balance_by_travel(db: Session, travel_id: int) -> dict:
    """
    Calcula el balance de todos los usuarios para un viaje específico.
    
    Lógica:
    - Para cada usuario en el viaje:
      - total_pagado = suma de gastos donde el usuario fue quien pagó
      - total_debido = suma de divisiones donde el usuario es participante
      - balance = total_pagado - total_debido
    
    Args:
        db: Sesión de base de datos
        travel_id: ID del viaje a calcular
        
    Returns:
        dict con estructura: {
            "travel": objeto viaje,
            "usuarios_balance": lista de dicts con id_usuario, nombre, correo, total_pagado, total_debido, balance_final, estado
        }
        
    Raises:
        TravelValidationError: Si el viaje no existe
    """
    print(f"\n[INFO] Calculando balance para viaje {travel_id}")
    
    # Validar que el viaje existe
    travel = db.query(Travel).filter(Travel.id_travel == travel_id).first()
    if not travel:
        print(f"[ERROR] Viaje con ID {travel_id} no encontrado")
        raise TravelValidationError(f"El viaje con ID {travel_id} no existe")
    
    print(f"[INFO] Viaje encontrado: {travel.nombre}")
    
    # Obtener todos los usuarios del viaje (usuarios_viaje)
    usuarios_viaje = db.query(UserTravel).filter(UserTravel.id_travel == travel_id).all()
    
    # no esta econtrando usuarios
    if not usuarios_viaje:
        print(f"[INFO] Viaje {travel_id} sin usuarios participantes")
        return {
            "travel": travel,
            "usuarios_balance": [],
            "total_pagado_viaje": Decimal("0"),
            "total_debido_viaje": Decimal("0"),
        }
    
    print(f"[INFO] Viaje tiene {len(usuarios_viaje)} usuario(s)")
    
    usuarios_balance = []
    total_pagado_viaje = Decimal("0")
    total_debido_viaje = Decimal("0")
    
    # Procesar cada usuario del viaje
    for user_travel in usuarios_viaje:
        user_id = user_travel.id_usuario
        
        print(f"[INFO] Procesando usuario {user_id}")
        
        # Obtener datos del usuario
        usuario = db.query(User).filter(User.id_usuario == user_id).first()
        if not usuario:
            print(f"[WARNING] Usuario {user_id} no encontrado en BD")
            continue
        
        # ===== TOTAL PAGADO =====
        # Suma de todos los gastos donde este usuario fue quien pagó, en el viaje especificado
        total_pagado = db.query(func.sum(Gasto.monto)).filter(
            Gasto.id_viaje == travel_id,
            Gasto.id_usuario == user_id,
        ).scalar()
        total_pagado = Decimal(str(total_pagado)) if total_pagado else Decimal("0")
        
        print(f"[INFO] Usuario {user_id} pagó: ${total_pagado}")
        
        # ===== TOTAL DEBIDO =====
        # Suma de montos en division_gastos_participantes donde:
        # 1. El usuario es participante
        # 2. La división pertenece a un gasto del viaje especificado
        total_debido = db.query(func.sum(DivisionGastoParticipante.monto)).join(
            DivisionGasto, DivisionGastoParticipante.id_division == DivisionGasto.id_division
        ).join(
            Gasto, DivisionGasto.id_gasto == Gasto.id_gasto
        ).filter(
            Gasto.id_viaje == travel_id,
            DivisionGastoParticipante.id_usuario == user_id,
        ).scalar()
        total_debido = Decimal(str(total_debido)) if total_debido else Decimal("0")
        
        print(f"[INFO] Usuario {user_id} debe pagar: ${total_debido}")
        
        # ===== BALANCE Y ESTADO =====
        balance_final = total_pagado - total_debido
        
        # Determinar estado
        if balance_final > 0:
            estado = "debe_recibir"
        elif balance_final < 0:
            estado = "debe_pagar"
        else:
            estado = "saldado"
        
        print(f"[INFO] Usuario {user_id} balance: ${balance_final} ({estado})")
        
        usuarios_balance.append({
            "id_usuario": user_id,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "total_pagado": total_pagado,
            "total_debido": total_debido,
            "balance_final": balance_final,
            "estado": estado,
        })
        
        total_pagado_viaje += total_pagado
        total_debido_viaje += total_debido
    
    diferencia_viaje = total_pagado_viaje - total_debido_viaje

    # ===== AJUSTE POR PAGOS (LIQUIDACIONES) =====
    # Un pago representa dinero movido entre usuarios para saldar el balance calculado por gastos/divisiones.
    # Regla:
    # - Quien paga (from) aumenta su balance (menos negativo / más cercano a 0).
    # - Quien recibe (to) disminuye su balance (menos positivo / más cercano a 0).
    pagos = db.query(Payment).filter(Payment.id_viaje == travel_id).all()
    if pagos:
        print(f"[INFO] Aplicando {len(pagos)} pago(s) al balance")
        balance_by_id = {entry["id_usuario"]: entry for entry in usuarios_balance}

        for pago in pagos:
            monto = Decimal(str(pago.monto))
            from_id = pago.id_usuario_from
            to_id = pago.id_usuario_to

            if from_id in balance_by_id:
                balance_by_id[from_id]["balance_final"] = Decimal(str(balance_by_id[from_id]["balance_final"])) + monto
            if to_id in balance_by_id:
                balance_by_id[to_id]["balance_final"] = Decimal(str(balance_by_id[to_id]["balance_final"])) - monto

        # Recalcular estado post-pagos
        for entry in usuarios_balance:
            numeric = Decimal(str(entry["balance_final"]))
            if numeric > 0:
                entry["estado"] = "debe_recibir"
            elif numeric < 0:
                entry["estado"] = "debe_pagar"
            else:
                entry["estado"] = "saldado"
    
    print(f"[SUCCESS] Balance calculado:")
    print(f"  Total pagado: ${total_pagado_viaje}")
    print(f"  Total debido: ${total_debido_viaje}")
    print(f"  Diferencia: ${diferencia_viaje}")
    
    return {
        "travel": travel,
        "usuarios_balance": usuarios_balance,
        "total_pagado_viaje": total_pagado_viaje,
        "total_debido_viaje": total_debido_viaje,
        "diferencia_viaje": diferencia_viaje,
    }
