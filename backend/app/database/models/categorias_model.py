from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base

'''
pasa la tabla de categorias a un objeto en python, con sus respectivas columnas y tipos de datos
'''
class Categoria(Base):
    __tablename__ = "categorias"

    id_categoria: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre_categoria: Mapped[str] = mapped_column(String(256), nullable=False)
    tipo: Mapped[str] = mapped_column(String(16), nullable=False)
