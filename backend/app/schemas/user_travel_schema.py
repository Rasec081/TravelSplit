from pydantic import BaseModel, Field


class UserTravelCreate(BaseModel):
    """Schema para crear una relación usuario-viaje."""
    id_viaje: int = Field(gt=0, description="ID del viaje")
    id_usuario: int = Field(gt=0, description="ID del usuario a agregar")


class UserTravelUpdate(BaseModel):
    """Schema para actualizar una relación usuario-viaje."""
    balance: float | None = Field(default=None, description="Balance del usuario en el viaje")
    rol: str | None = Field(default=None, description="Rol del usuario (admin o participante)")


class UserTravelResponse(BaseModel):
    """Schema para responder con datos de una relación usuario-viaje."""
    id_user_travel: int = Field(description="ID de la relación usuario-viaje")
    id_viaje: int = Field(description="ID del viaje")
    id_usuario: int = Field(description="ID del usuario")
    balance: float = Field(description="Balance actual del usuario en el viaje")
    rol: str = Field(description="Rol del usuario en el viaje (admin o participante)")

    class Config:
        from_attributes = True


class UserTravelMessageResponse(BaseModel):
    """Schema para responder con mensaje y datos de usuario-viaje."""
    message: str = Field(description="Mensaje de respuesta")
    data: UserTravelResponse = Field(description="Datos del usuario-viaje")
