from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Travel(Base):
    __tablename__ = "viajes"

    id_travel: Mapped[int] = mapped_column("id_viaje", primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(128), nullable=False)
    id_categoria: Mapped[int | None] = mapped_column(ForeignKey("categorias.id_categoria"), nullable=True)
    id_usuario_creador: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow, nullable=True)


class UserTravel(Base):
    __tablename__ = "usuarios_viajes"

    id_user_travel: Mapped[int] = mapped_column(primary_key=True, index=True)
    id_travel: Mapped[int] = mapped_column(ForeignKey("viajes.id_viaje"), nullable=False)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    balance: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    rol: Mapped[str] = mapped_column(String(16), nullable=False)

