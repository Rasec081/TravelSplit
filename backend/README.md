TravelSplit Backend
===================

Backend profesional con FastAPI, SQLAlchemy ORM, PostgreSQL y Pydantic.

Ejecucion local
---------------

1. Configura `backend/.env` con la contraseña real de PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/travelsplit
```

2. Instala/sincroniza dependencias:

```bash
uv sync --system-certs
```

3. Inicia la API:

```bash
uv run --system-certs uvicorn main:app --reload
```

La documentacion Swagger queda disponible en `http://127.0.0.1:8000/docs`.

Estructura
----------

- `main.py`: punto de entrada compatible con `uvicorn main:app`.
- `app/main.py`: configura FastAPI, CORS, Swagger, healthcheck, raiz y errores.
- `app/database/connection.py`: crea `engine`, `SessionLocal`, `Base` y `get_db()`.
- `app/database/models/user_model.py`: modelo ORM de la tabla existente `usuarios`.
- `app/schemas/user_schema.py`: schemas Pydantic para crear, actualizar y responder usuarios.
- `app/services/user_service.py`: lógica de negocio y operaciones CRUD con SQLAlchemy.
- `app/routes/user_routes.py`: endpoints `/usuarios`.
- `app/utils/security.py`: hashing y verificación de contraseñas para preparar autenticación futura.

Endpoints iniciales
-------------------

- `GET /`
- `GET /health`
- `POST /usuarios`
- `GET /usuarios`
- `GET /usuarios/{user_id}`
- `PUT /usuarios/{user_id}`
- `DELETE /usuarios/{user_id}`
