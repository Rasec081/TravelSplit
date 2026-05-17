from decimal import Decimal
from pydantic import BaseModel, Field


class SettlementCounterparty(BaseModel):
    id_usuario: int = Field(gt=0)
    nombre: str
    correo: str


class SettlementItem(BaseModel):
    tipo: str = Field(description="pagar_a o recibir_de")
    contraparte: SettlementCounterparty
    monto: Decimal = Field(gt=0)


class SettlementResponse(BaseModel):
    id_viaje: int = Field(gt=0)
    nombre_viaje: str
    id_usuario: int = Field(gt=0, description="Usuario consultado")
    items: list[SettlementItem]


class SettlementMessageResponse(BaseModel):
    message: str
    data: SettlementResponse

