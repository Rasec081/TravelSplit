from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from os import getenv
from sqlalchemy.exc import SQLAlchemyError

from app.database.init_db import init_db
from app.routes.gasto_routes import router as gasto_router
from app.routes.division_gasto_routes import router as division_gasto_router
from app.routes.categorias_routes import router as categorias_router
from app.routes.travel_routes import router as travel_router
from app.routes.user_travel_routes import router as user_travel_router
from app.routes.user_routes import router as user_router

app = FastAPI(
    title="TravelSplit API",
    description="Backend de TravelSplit para gestión de usuarios, viajes y gastos compartidos.",
    version="0.1.0",
    openapi_tags=[
        {
            "name": "Usuarios",
            "description": "Operaciones relacionadas con usuarios",
        },
        {
            "name": "Categorías",
            "description": "Operaciones relacionadas con categorías",
        },
        {
            "name": "Viajes",
            "description": "Operaciones relacionadas con viajes",
        },
        {
            "name": "Usuarios en Viajes",
            "description": "Gestión de participantes en viajes",
        },
        {
            "name": "Gastos",
            "description": "Operaciones relacionadas con gastos",
        },
        {
            "name": "Divisiones de Gastos",
            "description": "Operaciones para dividir gastos entre participantes",
        },
    ],
)

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

configured_origins = [
    origin.strip()
    for origin in getenv("FRONTEND_URLS", getenv("FRONTEND_URL", "")).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ALLOWED_ORIGINS + configured_origins,
    allow_origin_regex=r"https://.*\.devtunnels\.ms",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(categorias_router)
app.include_router(travel_router)
app.include_router(user_travel_router)
app.include_router(gasto_router)
app.include_router(division_gasto_router)

@app.on_event("startup")
def _startup_init_db() -> None:
    init_db()


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = ".".join(str(location) for location in error["loc"] if location != "body")
        errors.append(
            {
                "field": field or "request",
                "message": error["msg"],
            }
        )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Los datos enviados no son válidos.",
            "details": errors,
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "No se pudo completar la operación en la base de datos. Intenta nuevamente."
        },
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Ocurrió un error inesperado. Intenta nuevamente."},
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Bienvenido a TravelSplit Backend"}


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "message": "TravelSplit API disponible"}
