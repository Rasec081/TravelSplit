from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    id_usuario_from: int = Field(gt=0, description="Usuario que realiza el pago")
    id_usuario_to: int = Field(gt=0, description="Usuario que recibe el pago")
    monto: Decimal = Field(gt=0, description="Monto del pago (debe ser mayor a 0)")


class PaymentResponse(BaseModel):
    id_pago: int = Field(gt=0)
    id_viaje: int = Field(gt=0)
    id_usuario_from: int = Field(gt=0)
    id_usuario_to: int = Field(gt=0)
    monto: Decimal = Field(gt=0)
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class PaymentMessageResponse(BaseModel):
    message: str
    data: PaymentResponse


class PaymentListResponse(BaseModel):
    id_viaje: int = Field(gt=0)
    pagos: list[PaymentResponse]


class PaymentListMessageResponse(BaseModel):
    message: str
    data: PaymentListResponse

