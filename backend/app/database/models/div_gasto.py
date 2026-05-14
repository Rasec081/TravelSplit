from decimal import Decimal
from datetime import datetime

from sqlalchemy import ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


class DivisionGasto(Base):
    __tablename__ = "division_gastos"

    id_division: Mapped[int] = mapped_column("id_division", primary_key=True, index=True)
    id_gasto: Mapped[int] = mapped_column(
        ForeignKey("gastos.id_gasto", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(128), nullable=False)
    monto_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.current_timestamp()
    )
    
    # Relación con participantes
    participantes: Mapped[list["DivisionGastoParticipante"]] = relationship(
        back_populates="division",
        cascade="all, delete-orphan"
    )


class DivisionGastoParticipante(Base):
    __tablename__ = "division_gastos_participantes"

    id_participante: Mapped[int] = mapped_column("id_participante", primary_key=True, index=True)
    id_division: Mapped[int] = mapped_column(
        ForeignKey("division_gastos.id_division", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    # Relación con DivisionGasto
    division: Mapped["DivisionGasto"] = relationship(
        back_populates="participantes"
    )