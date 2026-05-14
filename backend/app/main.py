from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.routes.gasto_routes import router as gasto_router
from app.routes.categorias_routes import router as categorias_router
from app.routes.user_routes import router as user_router

app = FastAPI(
    title="TravelSplit API",
    description="Backend de TravelSplit para gestion de usuarios, viajes y gastos compartidos.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(gasto_router)
app.include_router(categorias_router)


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
            "error": "Los datos enviados no son validos.",
            "details": errors,
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "No se pudo completar la operacion en la base de datos. Intenta nuevamente."
        },
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Ocurrio un error inesperado. Intenta nuevamente."},
    )


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Bienvenido a TravelSplit Backend"}


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "message": "TravelSplit API disponible"}
