import { useEffect, useMemo, useRef, useState } from "react";

import { TextInput } from "../forms/TextInput";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  createTravelCategory,
  deleteCategory,
  listTravelCategories,
  updateCategory,
} from "../../services/categoriesService";

export function ManageTravelCategoriesModal({ currentUser, isOpen, onClose, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const editingInputId = useMemo(() => (editingId ? `edit-category-${editingId}` : "edit-category"), [editingId]);
  const [pendingDelete, setPendingDelete] = useState(null);

  const isLoadingRef = useRef(false);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const sortedCategories = useMemo(() => {
    return [...(categories ?? [])].sort((a, b) => {
      const aIsUserCategory = Boolean(a.id_usuario);
      const bIsUserCategory = Boolean(b.id_usuario);

      if (aIsUserCategory !== bIsUserCategory) {
        return aIsUserCategory ? 1 : -1;
      }

      return String(a.nombre_categoria).localeCompare(String(b.nombre_categoria), "es");
    });
  }, [categories]);

  async function refresh() {
    setIsLoading(true);
    setErrors({});
    setStatusMessage("Cargando categorías...");
    try {
      const response = await listTravelCategories(currentUser?.id_usuario);
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
    setPendingDelete(null);
    onClose();
  }

  async function handleCreate(event) {
    event.preventDefault();
    const name = newCategoryName.trim();
    const nextErrors = {};

    if (!name) {
      nextErrors.newCategoryName = "Ingresa el nombre de la categoría.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsLoading(true);
      setStatusMessage("Agregando categoría...");
      await createTravelCategory(name, currentUser?.id_usuario);
      setNewCategoryName("");
      await refresh();
      onChanged?.();
      setStatusMessage("Categoría agregada correctamente.");
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
    setStatusMessage(`Editando categoría ${category.nombre_categoria}.`);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
    setStatusMessage("Edición cancelada.");
  }

  async function saveEditing() {
    const name = editingName.trim();
    if (!editingId) return;

    const nextErrors = {};
    if (!name) {
      nextErrors.editingName = "El nombre no puede estar vacío.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsLoading(true);
      setStatusMessage("Guardando cambios...");
      await updateCategory(editingId, name, currentUser?.id_usuario);
      setEditingId(null);
      setEditingName("");
      await refresh();
      onChanged?.();
      setStatusMessage("Categoría actualizada correctamente.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function requestDelete(category) {
    setPendingDelete(category);
  }

  async function confirmDelete() {
    if (!pendingDelete?.id_categoria) return;
    try {
      setIsLoading(true);
      setStatusMessage("Eliminando categoría...");
      await deleteCategory(pendingDelete.id_categoria, currentUser?.id_usuario);
      setPendingDelete(null);
      await refresh();
      onChanged?.();
      setStatusMessage("Categoría eliminada.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Modal
        description="Administra las categorías disponibles para viajes. Usa Tab para navegar y Escape para cerrar."
        isOpen={isOpen}
        onClose={handleClose}
        title="Categorías de viaje"
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

        <section className="modal-form" aria-label="Listado de categorías">
          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          {sortedCategories.length === 0 && !isLoading ? (
            <p className="hint-text">No hay categorías de viaje registradas.</p>
          ) : (
            <ul className="category-list" aria-label="Categorías registradas">
              {sortedCategories.map((category) => {
                const isEditing = editingId === category.id_categoria;
                const canManageCategory = category.id_usuario === currentUser?.id_usuario;
                return (
                  <li key={category.id_categoria} className="category-card">
                    {isEditing ? (
                      <div className="category-edit">
                        <TextInput
                          autoFocus
                          error={errors.editingName}
                          id={editingInputId}
                          label="Nombre de categoría"
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
                        {canManageCategory ? (
                          <div className="category-actions">
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => startEditing(category)}
                              disabled={isLoading}
                              aria-label={`Editar categoría ${category.nombre_categoria}`}
                            >
                              Editar
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => requestDelete(category)}
                              disabled={isLoading}
                              aria-label={`Eliminar categoría ${category.nombre_categoria}`}
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form className="modal-form" onSubmit={handleCreate} aria-label="Agregar categoría">
          <TextInput
            autoFocus={editingId === null}
            error={errors.newCategoryName}
            id="new-travel-category"
            label="Agregar categoría"
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Ej: Académico"
            required
            value={newCategoryName}
          />
          <div className="modal-actions-inline">
            <button className="primary-button" disabled={isLoading} type="submit">
              {isLoading ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Eliminar categoría"
        description={
          pendingDelete
            ? `¿Eliminar la categoría "${pendingDelete.nombre_categoria}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isLoading}
        tone="danger"
      />
    </>
  );
}
