from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TravelBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=128,
        examples=["Viaje a Costa Rica"],
        description="Nombre descriptivo del viaje.",
    )
    id_categoria: int | None = Field(
        default=None,
        examples=[1],
        description="ID de la categoría del viaje (opcional).",
    )


class TravelCreate(TravelBase):
    id_usuario: int = Field(
        examples=[1],
        description="ID del usuario que crea el viaje (se convierte en admin).",
    )


class TravelUpdate(BaseModel):
    nombre: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
    )
    id_categoria: int | None = Field(
        default=None,
    )


class TravelResponse(TravelBase):
    id_travel: int
    id_usuario_creador: int = Field(
        description="ID del usuario que creó el viaje (admin del viaje)."
    )
    fecha_creacion: datetime = Field(
        description="Fecha y hora cuando se creó el viaje (automática)."
    )
    fecha_cierre: datetime | None = Field(
        default=None,
        description="Fecha y hora cuando se cerró el viaje (automática cuando se cierra)."
    )

    class Config:
        from_attributes = True


class TravelMessageResponse(BaseModel):
    message: str
    data: TravelResponse
