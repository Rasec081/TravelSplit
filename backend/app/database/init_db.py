from app.database.connection import Base, engine

# Importa los modelos para que SQLAlchemy registre las tablas en el metadata.
# Esto permite que `Base.metadata.create_all()` cree el esquema cuando falte.
from app.database.models.categorias_model import Categoria  # noqa: F401
from app.database.models.div_gasto import DivisionGasto, DivisionGastoParticipante  # noqa: F401
from app.database.models.gasto_model import Gasto  # noqa: F401
from app.database.models.password_reset_model import PasswordResetToken  # noqa: F401
from app.database.models.travel_model import Travel, UserTravel  # noqa: F401
from app.database.models.user_model import User  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

