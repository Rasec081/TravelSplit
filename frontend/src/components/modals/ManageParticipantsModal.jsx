import { useEffect, useMemo, useRef, useState } from "react";

import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
import { addUserToTravel, deleteUserTravel, updateUserTravel } from "../../services/userTravelService";

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

function normalizeRole(role) {
  return role === "admin" ? "admin" : "participante";
}

export function ManageParticipantsModal({
  isOpen,
  onClose,
  travelId,
  currentUser,
  participants,
  balancesByUserId,
  onChanged,
  allUsers,
  adminUserId,
}) {
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [addEmail, setAddEmail] = useState("");
  const [editingUserTravelId, setEditingUserTravelId] = useState(null);
  const [editingRole, setEditingRole] = useState("participante");
  const [pendingDelete, setPendingDelete] = useState(null);

  const isLoadingRef = useRef(false);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const participantByEmail = useMemo(() => {
    return new Map(
      (participants ?? [])
        .filter((p) => p.correo)
        .map((p) => [String(p.correo).toLowerCase(), p]),
    );
  }, [participants]);

  const userIdByEmail = useMemo(() => {
    return new Map((allUsers ?? []).map((u) => [String(u.correo).toLowerCase(), u.id_usuario]));
  }, [allUsers]);

  const canDelete = useMemo(() => {
    return (participant) => {
      if (!participant) return false;
      if (participant.id_usuario === adminUserId) return false;
      const balance = balancesByUserId?.get(participant.id_usuario)?.balance_final ?? 0;
      return Number(balance) === 0;
    };
  }, [balancesByUserId, adminUserId]);

  const sortedParticipants = useMemo(() => {
    const list = [...(participants ?? [])];
    list.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
    return list;
  }, [participants]);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setStatusMessage("");
    setSuccessMessage("");
    setAddEmail("");
    setEditingUserTravelId(null);
    setEditingRole("participante");
    setPendingDelete(null);
  }, [isOpen]);

  function handleClose() {
    if (isLoadingRef.current) return;
    onClose();
  }

  async function handleAdd(event) {
    event.preventDefault();
    setErrors({});
    setStatusMessage("");

    const normalized = addEmail.trim().toLowerCase();
    if (!normalized) {
      setErrors({ addEmail: "Ingresa el correo del usuario a agregar." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setErrors({ addEmail: "Ingresa un correo válido." });
      return;
    }
    if (participantByEmail.has(normalized)) {
      setErrors({ addEmail: "Ese usuario ya pertenece al viaje." });
      return;
    }

    const userId = userIdByEmail.get(normalized);
    if (!userId) {
      setErrors({ addEmail: "No existe un usuario con ese correo." });
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Agregando participante...");
      await addUserToTravel({ id_viaje: travelId, id_usuario: userId });
      setAddEmail("");
      setStatusMessage("Participante agregado.");
      await onChanged?.();
    } catch (error) {
      setErrors({ addEmail: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function startEdit(participant) {
    setEditingUserTravelId(participant.id_user_travel);
    setEditingRole(normalizeRole(participant.rol));
    setErrors({});
    setSuccessMessage("");
  }

  function cancelEdit() {
    setEditingUserTravelId(null);
    setEditingRole("participante");
  }

  async function saveEdit(participant) {
    if (!editingUserTravelId) return;

    const currentRole = normalizeRole(participant.rol);
    const nextRole = normalizeRole(editingRole);

    if (nextRole === currentRole) {
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Guardando cambios...");
      await updateUserTravel(editingUserTravelId, { rol: nextRole });
      setEditingUserTravelId(null);
      setEditingRole("participante");
      setStatusMessage("Rol actualizado correctamente.");
      setSuccessMessage("Rol actualizado correctamente.");
      await onChanged?.();
    } catch (error) {
      setErrors({ edit: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  function requestDelete(participant) {
    if (!canDelete(participant)) {
      setErrors({
        delete:
          participant.id_usuario === adminUserId
            ? "No se puede eliminar al administrador principal."
            : "No se puede eliminar: el participante tiene balance pendiente.",
      });
      return;
    }
    setPendingDelete(participant);
  }

  async function confirmDelete() {
    if (!pendingDelete?.id_user_travel) return;
    try {
      setIsLoading(true);
      setStatusMessage("Eliminando participante...");
      await deleteUserTravel(pendingDelete.id_user_travel);
      setPendingDelete(null);
      setStatusMessage("Participante eliminado.");
      await onChanged?.();
    } catch (error) {
      setErrors({ delete: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Gestionar participantes"
        description="Agrega, edita roles o elimina participantes. Para eliminar, el balance debe estar en cero."
        isDismissable={!isLoading}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={handleClose} disabled={isLoading}>
              Cerrar
            </button>
          </>
        }
      >
        <div className="sr-only" aria-live="polite" role="status">
          {statusMessage}
        </div>

        <section className="modal-form" aria-label="Participantes actuales">
          {errors.edit ? (
            <p className="form-error" role="alert">
              {errors.edit}
            </p>
          ) : null}
          {errors.delete ? (
            <p className="form-error" role="alert">
              {errors.delete}
            </p>
          ) : null}
          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          {sortedParticipants.length === 0 ? (
            <p className="hint-text">No hay participantes.</p>
          ) : (
            <ul className="category-list" aria-label="Lista de participantes">
              {sortedParticipants.map((p) => {
                const isEditing = editingUserTravelId === p.id_user_travel;
                const isPrimaryAdmin = p.id_usuario === adminUserId;
                const currentRole = normalizeRole(p.rol);
                const hasRoleChanged = normalizeRole(editingRole) !== currentRole;
                const balance = balancesByUserId?.get(p.id_usuario)?.balance_final ?? 0;
                return (
                  <li key={p.id_user_travel} className="category-card">
                    <div className="category-row">
                      <div>
                        <span className="category-name">{p.nombre}</span>
                        {p.correo ? <div className="muted">{p.correo}</div> : null}
                        <div className="muted">
                          Rol: <strong>{currentRole}</strong> · Balance:{" "}
                          <strong>{String(balance)}</strong>
                        </div>
                      </div>
                      <div className="category-actions">
                        {isEditing ? (
                          <>
                            <label className="sr-only" htmlFor={`role-${p.id_user_travel}`}>
                              Rol de {p.nombre}
                            </label>
                            <select
                              id={`role-${p.id_user_travel}`}
                              value={editingRole}
                              onChange={(event) => setEditingRole(event.target.value)}
                              disabled={isLoading}
                            >
                              <option value="admin">admin</option>
                              <option value="participante">participante</option>
                            </select>
                            <button
                              className="primary-button"
                              type="button"
                              onClick={() => saveEdit(p)}
                              disabled={isLoading || !hasRoleChanged}
                            >
                              Guardar
                            </button>
                            <button className="secondary-button" type="button" onClick={cancelEdit} disabled={isLoading}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="icon-action-button"
                              type="button"
                              onClick={() => startEdit(p)}
                              disabled={isLoading || isPrimaryAdmin}
                              aria-label={
                                isPrimaryAdmin
                                  ? `No se puede editar el rol del admin principal ${p.nombre}`
                                  : `Editar participante ${p.nombre}`
                              }
                              title={isPrimaryAdmin ? "El admin principal no se puede editar" : "Editar"}
                            >
                              <PencilIcon />
                              <span className="sr-only">Editar</span>
                            </button>
                            <button
                              className="icon-action-button"
                              type="button"
                              onClick={() => requestDelete(p)}
                              disabled={isLoading}
                              aria-label={`Eliminar participante ${p.nombre} del viaje`}
                              title="Eliminar"
                            >
                              <TrashIcon />
                              <span className="sr-only">Eliminar</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form className="modal-form" onSubmit={handleAdd} aria-label="Agregar participante">
          <div className="field">
            <label htmlFor="participant-add-email">Agregar usuario por correo</label>
            <div className="category-picker-row">
              <input
                aria-describedby={errors.addEmail ? "participant-add-email-error" : undefined}
                aria-invalid={errors.addEmail ? "true" : "false"}
                autoFocus
                id="participant-add-email"
                name="participant-add-email"
                onChange={(event) => setAddEmail(event.target.value)}
                placeholder="usuario@correo.com"
                required
                type="email"
                value={addEmail}
              />
              <button className="primary-button" type="submit" disabled={isLoading}>
                Agregar
              </button>
            </div>
            {errors.addEmail ? (
              <p className="field-error" id="participant-add-email-error" role="alert">
                {errors.addEmail}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Eliminar participante"
        description={
          pendingDelete
            ? `¿Eliminar a ${pendingDelete.nombre} del viaje? Esta acción no se puede deshacer.`
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

