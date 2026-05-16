from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Payment(Base):
    __tablename__ = "pagos"

    id_pago: Mapped[int] = mapped_column(primary_key=True, index=True)
    id_viaje: Mapped[int] = mapped_column(ForeignKey("viajes.id_viaje"), nullable=False, index=True)
    id_usuario_from: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False, index=True)
    id_usuario_to: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False, index=True)
    monto: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

