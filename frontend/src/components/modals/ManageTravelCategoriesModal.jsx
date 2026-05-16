import { useEffect, useMemo, useRef, useState } from "react";

import { TextInput } from "../forms/TextInput";
import { Modal } from "./Modal";
import {
  createTravelCategory,
  deleteCategory,
  listTravelCategories,
  updateCategory,
} from "../../services/categoriesService";

export function ManageTravelCategoriesModal({ isOpen, onClose, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const editingInputId = useMemo(() => (editingId ? `edit-category-${editingId}` : "edit-category"), [editingId]);

  const isLoadingRef = useRef(false);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const sortedCategories = useMemo(() => {
    return [...(categories ?? [])].sort((a, b) =>
      String(a.nombre_categoria).localeCompare(String(b.nombre_categoria), "es"),
    );
  }, [categories]);

  async function refresh() {
    setIsLoading(true);
    setErrors({});
    setStatusMessage("Cargando categorias...");
    try {
      const response = await listTravelCategories();
      setCategories(response ?? []);
      setStatusMessage("");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    refresh();
  }, [isOpen]);

  function handleClose() {
    if (isLoadingRef.current) return;
    setErrors({});
    setStatusMessage("");
    setNewCategoryName("");
    setEditingId(null);
    setEditingName("");
    onClose();
  }

  async function handleCreate(event) {
    event.preventDefault();
    const name = newCategoryName.trim();
    const nextErrors = {};

    if (!name) {
      nextErrors.newCategoryName = "Ingresa el nombre de la categoria.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsLoading(true);
      setStatusMessage("Agregando categoria...");
      await createTravelCategory(name);
      setNewCategoryName("");
      await refresh();
      onChanged?.();
      setStatusMessage("Categoria agregada correctamente.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function startEditing(category) {
    setEditingId(category.id_categoria);
    setEditingName(category.nombre_categoria ?? "");
    setErrors({});
    setStatusMessage(`Editando categoria ${category.nombre_categoria}.`);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
    setStatusMessage("Edicion cancelada.");
  }

  async function saveEditing() {
    const name = editingName.trim();
    if (!editingId) return;

    const nextErrors = {};
    if (!name) {
      nextErrors.editingName = "El nombre no puede estar vacio.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsLoading(true);
      setStatusMessage("Guardando cambios...");
      await updateCategory(editingId, name);
      setEditingId(null);
      setEditingName("");
      await refresh();
      onChanged?.();
      setStatusMessage("Categoria actualizada correctamente.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(category) {
    if (!category?.id_categoria) return;
    const confirmDelete = window.confirm(
      `Eliminar la categoria "${category.nombre_categoria}"? Esta accion no se puede deshacer.`,
    );
    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      setStatusMessage("Eliminando categoria...");
      await deleteCategory(category.id_categoria);
      await refresh();
      onChanged?.();
      setStatusMessage("Categoria eliminada.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      description="Administra las categorias disponibles para viajes. Usa Tab para navegar y Escape para cerrar."
      isOpen={isOpen}
      onClose={handleClose}
      title="Categorias de viaje"
      footer={
        <>
          <button className="secondary-button" type="button" onClick={handleClose}>
            Cerrar
          </button>
        </>
      }
    >
      <div className="sr-only" aria-live="polite" role="status">
        {statusMessage}
      </div>

      <section className="modal-form" aria-label="Listado de categorias">
        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}

        {sortedCategories.length === 0 && !isLoading ? (
          <p className="hint-text">No hay categorias de viaje registradas.</p>
        ) : (
          <ul className="category-list" aria-label="Categorias registradas">
            {sortedCategories.map((category) => {
              const isEditing = editingId === category.id_categoria;
              return (
                <li key={category.id_categoria} className="category-card">
                  {isEditing ? (
                    <div className="category-edit">
                      <TextInput
                        autoFocus
                        error={errors.editingName}
                        id={editingInputId}
                        label="Nombre de categoria"
                        onChange={(event) => setEditingName(event.target.value)}
                        value={editingName}
                      />
                      <div className="category-actions">
                        <button
                          className="primary-button"
                          type="button"
                          onClick={saveEditing}
                          disabled={isLoading}
                        >
                          Guardar
                        </button>
                        <button className="secondary-button" type="button" onClick={cancelEditing}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="category-row">
                      <span className="category-name">{category.nombre_categoria}</span>
                      <div className="category-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => startEditing(category)}
                          disabled={isLoading}
                        >
                          Editar
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={isLoading}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form className="modal-form" onSubmit={handleCreate} aria-label="Agregar categoria">
        <TextInput
          autoFocus={editingId === null}
          error={errors.newCategoryName}
          id="new-travel-category"
          label="Agregar categoria"
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder="Ej: Academico"
          value={newCategoryName}
        />
        <div className="modal-actions-inline">
          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "Agregando..." : "Agregar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
