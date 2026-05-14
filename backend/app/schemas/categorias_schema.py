from typing import Literal

from pydantic import BaseModel, Field

'''
son como los metodos de una clase pero esto es para validar los datos que se reciben en las rutas
(validaciones de input) y para definir la estructura de los datos que se van a enviar en las respuestas
'''

class CategoriaBase(BaseModel):
    nombre_categoria: str = Field(
        min_length=1,
        max_length=256,
        examples=["Alimentación"],
        description="Nombre descriptivo de la categoría.",
    )
    tipo: Literal["viaje", "gasto"] = Field(
        examples=["viaje"],
        description="Tipo de categoría: 'viaje' o 'gasto'.",
    )


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nombre_categoria: str | None = Field(
        default=None,
        min_length=1,
        max_length=256,
    )
    tipo: Literal["viaje", "gasto"] | None = Field(
        default=None,
    )


class CategoriaResponse(CategoriaBase):
    id_categoria: int

    class Config:
        from_attributes = True


class CategoriaMessageResponse(BaseModel):
    message: str
    data: CategoriaResponse
