from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ============================================================================
# ESQUEMA DE PARTICIPANTE EN DIVISIÓN
# ============================================================================

class ParticipanteEnDivision(BaseModel):
    """Participante en una división de gasto con monto asignado."""
    id_usuario: int = Field(gt=0, examples=[1], description="ID del usuario participante.")
    monto: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        examples=["50.00"],
        description="Monto que paga este participante."
    )

    @model_validator(mode="after")
    def validate_monto(self) -> Self:
        """Valida que el monto sea positivo."""
        if self.monto <= 0:
            raise ValueError("El monto debe ser mayor a 0.")
        return self


# ============================================================================
# ESQUEMA DE CREACIÓN DE DIVISIÓN
# ============================================================================

class DivisionGastoCreate(BaseModel):
    """Request para crear una división de gasto con nombre y participantes."""
    id_gasto: int = Field(gt=0, examples=[1], description="ID del gasto asociado.")
    nombre: str = Field(min_length=1, max_length=128, examples=["Daniel invita"], description="Nombre de la división.")
    monto_total: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        examples=["50.00"],
        description="Monto total de la división."
    )
    participantes: list[ParticipanteEnDivision] = Field(
        min_length=1,
        examples=[[{"id_usuario": 1, "monto": "40.00"}, {"id_usuario": 2, "monto": "10.00"}]],
        description="Lista de participantes con sus montos."
    )

    @model_validator(mode="after")
    def validate_balance(self) -> Self:
        """Valida que la suma de montos coincida exactamente con monto_total."""
        if not self.participantes:
            raise ValueError("Debe haber al menos un participante.")
        
        suma_montos = sum(p.monto for p in self.participantes)
        
        # Validar que la suma sea exacta (con tolerancia de 0.01 por redondeo)
        if abs(suma_montos - self.monto_total) > Decimal("0.01"):
            raise ValueError(
                f"La suma de montos ({suma_montos}) no coincide con el monto_total ({self.monto_total}). "
                f"Diferencia: {suma_montos - self.monto_total}."
            )
        
        # Validar sin duplicados de usuarios
        usuario_ids = [p.id_usuario for p in self.participantes]
        if len(usuario_ids) != len(set(usuario_ids)):
            raise ValueError("No puede haber usuarios duplicados en los participantes.")
        
        return self


# ============================================================================
# ESQUEMA DE ACTUALIZACIÓN DE DIVISIÓN
# ============================================================================

class DivisionGastoUpdate(BaseModel):
    """Request para actualizar una división (permite redistribuir montos)."""
    nombre: str | None = Field(default=None, min_length=1, max_length=128, description="Nuevo nombre.")
    monto_total: Decimal | None = Field(
        default=None,
        max_digits=10,
        decimal_places=2,
        description="Nuevo monto total."
    )
    participantes: list[ParticipanteEnDivision] | None = Field(
        default=None,
        min_length=1,
        description="Nueva lista de participantes con montos redistribuidos."
    )

    @model_validator(mode="after")
    def validate_has_updates(self) -> Self:
        """Valida que haya al menos un campo para actualizar."""
        if not self.model_fields_set:
            raise ValueError("Debes enviar al menos un campo para actualizar.")
        return self

    @model_validator(mode="after")
    def validate_balance_on_update(self) -> Self:
        """Si se actualiza monto_total y participantes, valida el balance."""
        if self.participantes and self.monto_total:
            suma_montos = sum(p.monto for p in self.participantes)
            if abs(suma_montos - self.monto_total) > Decimal("0.01"):
                raise ValueError(
                    f"La suma de montos ({suma_montos}) no coincide con el monto_total ({self.monto_total}). "
                    f"Diferencia: {suma_montos - self.monto_total}."
                )
            
            usuario_ids = [p.id_usuario for p in self.participantes]
            if len(usuario_ids) != len(set(usuario_ids)):
                raise ValueError("No puede haber usuarios duplicados en los participantes.")
        
        return self


# ============================================================================
# ESQUEMA DE RESPUESTA
# ============================================================================

class DivisionGastoResponse(BaseModel):
    """Respuesta con detalles de una división de gasto."""
    id_division: int = Field(examples=[1], description="ID de la división.")
    id_gasto: int = Field(examples=[1], description="ID del gasto asociado.")
    nombre: str = Field(examples=["Daniel invita"], description="Nombre de la división.")
    monto_total: Decimal = Field(examples=["50.00"], description="Monto total.")
    participantes: list[ParticipanteEnDivision] = Field(description="Lista de participantes con sus montos.")
    fecha_creacion: str | None = Field(default=None, description="Fecha de creación (formato ISO).")

    model_config = ConfigDict(from_attributes=True)


class DivisionGastoMessageResponse(BaseModel):
    """Respuesta con mensaje para operaciones sobre divisiones."""
    message: str = Field(examples=["División creada exitosamente."], description="Mensaje de operación.")
    data: DivisionGastoResponse = Field(description="Datos de la división.")
