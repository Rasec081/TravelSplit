from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models.categorias_model import Categoria
from app.schemas.categorias_schema import CategoriaCreate, CategoriaUpdate
from app.services.exceptions import CategoriaConflictError

'''
aqui van los cruds y aqui es donde insertamos los datos en la db
'''
def get_categorias(db: Session, tipo: str | None = None) -> list[Categoria]: 
    #da la opcion de filtrar por tipo, por default van todas
    query = db.query(Categoria)
    if tipo:
        query = query.filter(Categoria.tipo == tipo)
    return query.order_by(Categoria.id_categoria).all()


def get_categoria_by_id(db: Session, categoria_id: int) -> Categoria | None:
    """Obtiene una categoría por su ID."""
    return db.query(Categoria).filter(Categoria.id_categoria == categoria_id).first()


def create_categoria(db: Session, categoria_data: CategoriaCreate) -> Categoria:
    """Crea una nueva categoría."""
    categoria = Categoria(
        nombre_categoria=categoria_data.nombre_categoria.strip(),
        tipo=categoria_data.tipo,
    )

    try:
        db.add(categoria)
        print("Intentando crear categoría:", categoria.nombre_categoria, "Tipo:", categoria.tipo)
        db.commit()
        print("Categoría creada con ID(se hizo el commit):", categoria.id_categoria)
        db.refresh(categoria)
        print("Categoría después del refresh:", categoria.id_categoria, categoria.nombre_categoria, categoria.tipo)
        return categoria
    except IntegrityError as exc:
        print("no se creo la categoría, hubo un error de integridad:", exc)
        db.rollback()
        raise CategoriaConflictError(
            "No se pudo crear la categoría con los datos proporcionados."
        ) from exc


def update_categoria(db: Session, categoria: Categoria, categoria_data: CategoriaUpdate) -> Categoria:
    """Actualiza una categoría existente."""
    updates = categoria_data.model_dump(exclude_unset=True)

    if "nombre_categoria" in updates and updates["nombre_categoria"] is not None:
        categoria.nombre_categoria = updates["nombre_categoria"].strip()

    if "tipo" in updates and updates["tipo"] is not None:
        categoria.tipo = updates["tipo"]

    try:
        db.commit()
        db.refresh(categoria)
        return categoria
    except IntegrityError as exc:
        db.rollback()
        raise CategoriaConflictError(
            "No se pudo actualizar la categoría con los datos proporcionados."
        ) from exc


def delete_categoria(db: Session, categoria: Categoria) -> None:
    """Elimina una categoría."""
    db.delete(categoria)
    db.commit()


