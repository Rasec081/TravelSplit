from sqlalchemy import inspect, text

from app.database.connection import Base, engine

# Importa los modelos para que SQLAlchemy registre las tablas en el metadata.
# Esto permite que `Base.metadata.create_all()` cree el esquema cuando falte.
from app.database.models.categorias_model import Categoria  # noqa: F401
from app.database.models.div_gasto import DivisionGasto, DivisionGastoParticipante  # noqa: F401
from app.database.models.gasto_model import Gasto  # noqa: F401
from app.database.models.payment_model import Payment  # noqa: F401
from app.database.models.password_reset_model import PasswordResetToken  # noqa: F401
from app.database.models.travel_model import Travel, UserTravel  # noqa: F401
from app.database.models.user_model import User  # noqa: F401


DEFAULT_CATEGORIES = [
    ("Vacaciones", "viaje"),
    ("Trabajo", "viaje"),
    ("Familia", "viaje"),
    ("Amigos", "viaje"),
    ("Académico", "viaje"),
    ("Transporte", "gasto"),
    ("Hospedaje", "gasto"),
    ("Alimentación", "gasto"),
    ("Compras", "gasto"),
    ("Entretenimiento", "gasto"),
    ("Emergencias", "gasto"),
]


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "categorias" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("categorias")}
    if "id_usuario" not in column_names:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE categorias "
                    "ADD COLUMN id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE"
                )
            )

    user_column_names = {column["name"] for column in inspector.get_columns("usuarios")}
    if "foto_perfil" not in user_column_names:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT"))

    with engine.begin() as connection:
        for name, category_type in DEFAULT_CATEGORIES:
            connection.execute(
                text(
                    """
                    INSERT INTO categorias (nombre_categoria, tipo, id_usuario)
                    SELECT :name, :category_type, NULL
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM categorias
                        WHERE nombre_categoria = :name
                          AND tipo = :category_type
                          AND id_usuario IS NULL
                    )
                    """
                ),
                {"name": name, "category_type": category_type},
            )

