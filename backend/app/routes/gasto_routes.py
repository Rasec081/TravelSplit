from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.gasto_schema import (
    GastoCreate,
    GastoMessageResponse,
    GastoResponse,
    GastoUpdate,
)
from app.services import gasto_service
from app.services.exceptions import GastoNotFoundError, GastoValidationError

router = APIRouter(prefix="/gastos", tags=["Gastos"])


@router.post(
    "",
    response_model=GastoMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_gasto(
    gasto_data: GastoCreate,
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    try:
        gasto_service.create_gasto(db, gasto_data)
    except GastoValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except GastoNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return GastoMessageResponse(message="Gasto creado correctamente")


@router.get("", response_model=list[GastoResponse])
def list_gastos(db: Session = Depends(get_db)) -> list[GastoResponse]:
    return gasto_service.get_gastos(db)


@router.get("/viaje/{id_viaje}", response_model=list[GastoResponse])
def list_gastos_by_viaje(
    id_viaje: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> list[GastoResponse]:
    try:
        return gasto_service.get_gastos_by_viaje(db, id_viaje)
    except GastoNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{gasto_id}", response_model=GastoResponse)
def get_gasto(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> GastoResponse:
    gasto = gasto_service.get_gasto_by_id(db, gasto_id)
    if not gasto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto no encontrado.",
        )
    return gasto


@router.put("/{gasto_id}", response_model=GastoMessageResponse)
def update_gasto(
    gasto_data: GastoUpdate,
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    gasto = gasto_service.get_gasto_by_id(db, gasto_id)
    if not gasto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto no encontrado.",
        )

    try:
        gasto_service.update_gasto(db, gasto, gasto_data)
    except GastoValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except GastoNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return GastoMessageResponse(message="Gasto actualizado correctamente")


@router.delete("/{gasto_id}", response_model=GastoMessageResponse)
def delete_gasto(
    gasto_id: int = Path(gt=0),
    db: Session = Depends(get_db),
) -> GastoMessageResponse:
    gasto = gasto_service.get_gasto_by_id(db, gasto_id)
    if not gasto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto no encontrado.",
        )

    try:
        gasto_service.delete_gasto(db, gasto)
    except GastoValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return GastoMessageResponse(message="Gasto eliminado correctamente")
