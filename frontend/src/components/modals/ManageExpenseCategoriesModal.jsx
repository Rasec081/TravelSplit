import { useEffect, useMemo, useRef, useState } from "react";

import { TextInput } from "../forms/TextInput";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  createExpenseCategory,
  deleteCategory,
  listExpenseCategories,
  updateCategory,
} from "../../services/categoriesService";

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        fill="currentColor"
        d="M6 7h12v14H6V7zm3-4h6l1 1h4v2H4V4h4l1-1z"
      />
    </svg>
  );
}

export function ManageExpenseCategoriesModal({ isOpen, onClose, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const editingInputId = useMemo(
    () => (editingId ? `edit-expense-category-${editingId}` : "edit-expense-category"),
    [editingId],
  );

  const [pendingDelete, setPendingDelete] = useState(null);

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
    setStatusMessage("Cargando categorías...");
    try {
      const response = await listExpenseCategories();
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
      await createExpenseCategory(name);
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
      await updateCategory(editingId, name);
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
      await deleteCategory(pendingDelete.id_categoria);
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
        description="Administra las categorías disponibles para gastos. Usa Tab para navegar y Escape para cerrar."
        isOpen={isOpen}
        onClose={handleClose}
        title="Categorías de gasto"
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
            <p className="hint-text">No hay categorías de gasto registradas.</p>
          ) : (
            <ul className="category-list" aria-label="Categorías registradas">
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
                        <div className="category-actions">
                          <button
                            className="icon-action-button"
                            type="button"
                            onClick={() => startEditing(category)}
                            disabled={isLoading}
                            aria-label={`Editar categoría ${category.nombre_categoria}`}
                          >
                            <PencilIcon />
                            <span className="sr-only">Editar</span>
                          </button>
                          <button
                            className="icon-action-button"
                            type="button"
                            onClick={() => requestDelete(category)}
                            disabled={isLoading}
                            aria-label={`Eliminar categoría ${category.nombre_categoria}`}
                          >
                            <TrashIcon />
                            <span className="sr-only">Eliminar</span>
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

        <form className="modal-form" onSubmit={handleCreate} aria-label="Agregar categoría">
          <TextInput
            autoFocus={editingId === null}
            error={errors.newCategoryName}
            id="new-expense-category"
            label="Agregar categoría"
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Ej: Transporte"
            value={newCategoryName}
          />
          <div className="modal-actions-inline">
            <button className="primary-button" disabled={isLoading} type="submit">
              {isLoading ? "Agregando..." : "Guardar"}
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

