from datetime import datetime
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class GastoBase(BaseModel):
    id_viaje: int = Field(gt=0, examples=[1], description="Identificador del viaje.")
    id_usuario: int = Field(gt=0, examples=[1], description="Usuario que pago el gasto.")
    id_categoria: int | None = Field(
        default=None,
        gt=0,
        examples=[2],
        description="Categoria opcional del gasto.",
    )
    monto: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        examples=["125.50"],
        description="Monto pagado. Debe ser mayor que cero.",
    )
    descripcion: str = Field(
        max_length=256,
        examples=["Cena del primer dia"],
        description="Descripcion breve del gasto.",
    )

    @field_validator("descripcion")
    @classmethod
    def normalize_descripcion(cls, value: str) -> str:
        return value.strip()


class GastoCreate(GastoBase):
    pass


class GastoUpdate(BaseModel):
    id_viaje: int | None = Field(default=None, gt=0)
    id_usuario: int | None = Field(default=None, gt=0)
    id_categoria: int | None = Field(default=None, gt=0)
    monto: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    descripcion: str | None = Field(default=None, max_length=256)

    @field_validator("descripcion")
    @classmethod
    def normalize_descripcion(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.strip()

    @model_validator(mode="after")
    def validate_has_updates(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Debes enviar al menos un campo para actualizar.")
        return self


class GastoResponse(GastoBase):
    id_gasto: int
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


class GastoMessageResponse(BaseModel):
    message: str
