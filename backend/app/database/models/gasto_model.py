from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Gasto(Base):
    __tablename__ = "gastos"

    id_gasto: Mapped[int] = mapped_column(primary_key=True, index=True)
    id_viaje: Mapped[int] = mapped_column(
        ForeignKey("viajes.id_viaje", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_categoria: Mapped[int | None] = mapped_column(
        ForeignKey("categorias.id_categoria", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(256), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
    )
