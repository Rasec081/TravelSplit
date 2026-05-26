from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class User(Base):
    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(64), nullable=False)
    correo: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    contrasena: Mapped[str] = mapped_column(String(256), nullable=False)
    foto_perfil: Mapped[str | None] = mapped_column(Text, nullable=True)

