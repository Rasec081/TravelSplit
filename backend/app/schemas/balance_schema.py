from decimal import Decimal
from pydantic import BaseModel, Field


class UsuarioBalance(BaseModel):
    """Información de balance para un usuario en un viaje específico."""
    
    id_usuario: int = Field(gt=0, description="ID del usuario")
    nombre: str = Field(description="Nombre del usuario")
    correo: str = Field(description="Correo del usuario")
    total_pagado: Decimal = Field(ge=0, description="Monto total que pagó el usuario en el viaje")
    total_debido: Decimal = Field(ge=0, description="Monto total que le corresponde pagar según divisiones")
    balance_final: Decimal = Field(description="Balance final: total_pagado - total_debido. Positivo=debe recibir, Negativo=debe pagar")
    estado: str = Field(
        description="Estado del balance: 'saldado' (balance=0), 'debe_recibir' (balance>0), 'debe_pagar' (balance<0)"
    )
    
    class Config:
        from_attributes = True


class BalanceViajeResponse(BaseModel):
    """Respuesta con el desglose de balance de todos los usuarios en un viaje."""
    
    id_viaje: int = Field(gt=0, description="ID del viaje")
    nombre_viaje: str = Field(description="Nombre del viaje")
    cantidad_usuarios: int = Field(ge=0, description="Cantidad de participantes en el viaje")
    usuarios: list[UsuarioBalance] = Field(description="Lista de usuarios con sus balances")
    total_pagado_viaje: Decimal = Field(ge=0, description="Total pagado en el viaje (suma de all total_pagado)")
    total_debido_viaje: Decimal = Field(ge=0, description="Total debido en el viaje (suma de all total_debido)")
    diferencia: Decimal = Field(description="Diferencia total: total_pagado - total_debido (debe ser ~0)")
    
    class Config:
        from_attributes = True


class BalanceViajeMessageResponse(BaseModel):
    """Respuesta con mensaje y datos de balance."""
    
    message: str = Field(description="Mensaje descriptivo")
    data: BalanceViajeResponse = Field(description="Datos del balance del viaje")
