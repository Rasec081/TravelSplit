from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base

'''
pasa la tabla de viajes a un objeto en python, con sus respectivas columnas y tipos de datos
'''

class Travel(Base):
    __tablename__ = "viajes"

    id_travel: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(128), nullable=False)
    id_categoria: Mapped[int | None] = mapped_column(ForeignKey("categorias.id_categoria"), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# representa la relación entre usuarios y viajes, con su rol y balance
#como se distingue cual es admin? se le asigna un rol de "admin" al usuario que crea el viaje, y los demás son "participantes"
class UserTravel(Base):
    __tablename__ = "usuarios_viajes"

    id_user_travel: Mapped[int] = mapped_column(primary_key=True, index=True)
    id_travel: Mapped[int] = mapped_column(ForeignKey("viajes.id_viaje"), nullable=False)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    balance: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    rol: Mapped[str] = mapped_column(String(16), nullable=False)
