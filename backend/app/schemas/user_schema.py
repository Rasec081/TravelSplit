from typing import Self

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserBase(BaseModel):
    nombre: str = Field(
        min_length=2,
        max_length=64,
        examples=["Ana Martinez"],
        description="Nombre visible del usuario.",
    )
    correo: EmailStr = Field(
        max_length=64,
        examples=["ana@example.com"],
        description="Correo electronico unico del usuario.",
    )

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, value: str) -> str:
        normalized_value = value.strip()
        if len(normalized_value) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres utiles.")
        return normalized_value


class UserCreate(UserBase):
    contrasena: str = Field(
        min_length=8,
        max_length=128,
        examples=["UnaClaveSegura123"],
        description="Contrasena del usuario. Se almacena hasheada.",
    )


class UserUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=64)
    correo: EmailStr | None = Field(default=None, max_length=64)
    contrasena: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, value: str | None) -> str | None:
        if value is None:
            return value

        normalized_value = value.strip()
        if len(normalized_value) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres utiles.")
        return normalized_value

    @model_validator(mode="after")
    def validate_has_updates(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Debes enviar al menos un campo para actualizar.")
        return self


class UserResponse(UserBase):
    id_usuario: int

    model_config = ConfigDict(from_attributes=True)


class UserMessageResponse(BaseModel):
    message: str
    data: UserResponse | None = None
