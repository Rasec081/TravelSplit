import { useEffect, useId, useMemo, useRef, useState } from "react";

import { TextInput } from "../forms/TextInput";
import { listTravelCategories } from "../../services/categoriesService";
import { createTravel } from "../../services/travelService";
import { listUsers } from "../../services/userService";
import { addUserToTravel } from "../../services/userTravelService";
import { ManageTravelCategoriesModal } from "./ManageTravelCategoriesModal";
import { Modal } from "./Modal";

export function CreateTripModal({ currentUser, isOpen, onClose, onCreated }) {
  const statusId = useId();
  const isLoadingRef = useRef(false);

  const [tripName, setTripName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [participants, setParticipants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const normalizedParticipants = useMemo(
    () => participants.map((email) => email.trim().toLowerCase()).filter(Boolean),
    [participants],
  );

  async function reloadCategories() {
    const categoriesResponse = await listTravelCategories(currentUser?.id_usuario);
    setCategories(categoriesResponse ?? []);
  }

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    async function loadData() {
      setIsInitializing(true);
      setStatusMessage("Cargando categorías y usuarios disponibles...");
      setErrors({});

      try {
        const [categoriesResponse, usersResponse] = await Promise.all([
          listTravelCategories(currentUser?.id_usuario),
          listUsers(),
        ]);
        if (cancelled) return;

        setCategories(categoriesResponse ?? []);
        setUsers(usersResponse ?? []);
        setStatusMessage("");
      } catch (error) {
        if (cancelled) return;
        setErrors({ form: error.message });
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  function resetForm() {
    setTripName("");
    setCategoryId("");
    setParticipantEmail("");
    setParticipants([]);
    setErrors({});
    setStatusMessage("");
  }

  function handleClose() {
    if (isLoadingRef.current) return;
    resetForm();
    onClose();
  }

  function handleAddParticipant() {
    const normalized = participantEmail.trim().toLowerCase();
    const nextErrors = {};

    if (!normalized) {
      nextErrors.participantEmail = "Ingresa el correo del participante.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      nextErrors.participantEmail = "Ingresa un correo electrónico válido.";
    } else if (normalizedParticipants.includes(normalized)) {
      nextErrors.participantEmail = "Ese participante ya fue agregado.";
    } else if (normalized === String(currentUser?.correo ?? "").toLowerCase()) {
      nextErrors.participantEmail = "No necesitas agregarte a vos mismo.";
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setParticipants((current) => [...current, normalized]);
    setParticipantEmail("");
    setStatusMessage(`Participante ${normalized} agregado a la lista.`);
  }

  function handleRemoveParticipant(email) {
    setParticipants((current) => current.filter((participant) => participant !== email));
    setStatusMessage(`Participante ${email} removido de la lista.`);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const trimmedName = tripName.trim();

    if (!trimmedName) {
      nextErrors.tripName = "Ingresa el nombre del viaje.";
    }

    if (!categoryId) {
      nextErrors.categoryId = "Selecciona una categoría.";
    }

    setErrors(nextErrors);
    setStatusMessage("");

    if (Object.keys(nextErrors).length > 0) return;

    const emailToUserId = new Map(
      (users ?? []).map((user) => [String(user.correo).toLowerCase(), user.id_usuario]),
    );

    const unknownParticipants = normalizedParticipants.filter(
      (email) => !emailToUserId.has(email),
    );

    if (unknownParticipants.length > 0) {
      setErrors((current) => ({
        ...current,
        participants:
          "No se encontraron estos usuarios en la base de datos: " + unknownParticipants.join(", "),
      }));
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Creando viaje...");

      const travelResponse = await createTravel({
        nombre: trimmedName,
        id_categoria: Number(categoryId),
        id_usuario: currentUser.id_usuario,
      });

      const travel = travelResponse?.data;
      if (!travel) {
        throw new Error("No se recibió el viaje creado desde el backend.");
      }

      setStatusMessage("Agregando participantes...");

      for (const email of normalizedParticipants) {
        const userId = emailToUserId.get(email);
        if (!userId) continue;
        await addUserToTravel({
          id_viaje: travel.id_travel,
          id_usuario: userId,
        });
      }

      setStatusMessage("Viaje creado correctamente.");
      onCreated?.(travel);
      resetForm();
      onClose();
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form: error.message,
      }));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Modal
        description="Define el nombre, selecciona una categoría y agrega participantes."
        isDismissable={!isLoading}
        isOpen={isOpen}
        onClose={handleClose}
        title="Crear viaje"
      >
        <div className="sr-only" aria-live="polite" id={statusId} role="status">
          {statusMessage}
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          <TextInput
            error={errors.tripName}
            id="create-trip-name"
            label="Asunto del viaje"
            autoFocus
            onChange={(event) => setTripName(event.target.value)}
            placeholder="Viaje a la playa"
            required
            value={tripName}
          />

          <div className="field">
            <label htmlFor="create-trip-category">Categoría del viaje</label>
            <div className="category-picker-row">
              <select
                aria-describedby={errors.categoryId ? "create-trip-category-error" : undefined}
                aria-invalid={errors.categoryId ? "true" : "false"}
                disabled={isInitializing}
                id="create-trip-category"
                name="create-trip-category"
                onChange={(event) => setCategoryId(event.target.value)}
                required
                value={categoryId}
              >
                <option value="">Seleccione una opción</option>
                {categories.map((category) => (
                  <option key={category.id_categoria} value={category.id_categoria}>
                    {category.nombre_categoria}
                  </option>
                ))}
              </select>
              <button
                aria-haspopup="dialog"
                aria-label="Agregar nueva categoría de viaje"
                className="primary-button"
                type="button"
                onClick={() => setIsCategoriesOpen(true)}
                disabled={isInitializing || isLoading}
              >
                Agregar
              </button>
            </div>
            {errors.categoryId ? (
              <p className="field-error" id="create-trip-category-error" role="alert">
                {errors.categoryId}
              </p>
            ) : null}
          </div>

          <fieldset className="modal-fieldset">
            <legend>Participantes</legend>

            <div className="participant-row">
              <label className="sr-only" htmlFor="create-trip-participant">
                Correo del participante
              </label>
              <input
                aria-describedby={errors.participantEmail ? "create-trip-participant-error" : undefined}
                aria-invalid={errors.participantEmail ? "true" : "false"}
                autoComplete="email"
                id="create-trip-participant"
                onChange={(event) => setParticipantEmail(event.target.value)}
                placeholder="participante@correo.com"
                type="email"
                value={participantEmail}
              />
              <button
                className="primary-button"
                type="button"
                onClick={handleAddParticipant}
                disabled={isLoading || isInitializing}
              >
                Agregar
              </button>
            </div>

            {errors.participantEmail ? (
              <p className="field-error" id="create-trip-participant-error" role="alert">
                {errors.participantEmail}
              </p>
            ) : null}

            {errors.participants ? (
              <p className="field-error" role="alert">
                {errors.participants}
              </p>
            ) : null}

            {participants.length > 0 ? (
              <ul className="participant-list" aria-label="Participantes agregados">
                {participants.map((email) => (
                  <li key={email} className="participant-chip">
                    <span>{email}</span>
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => handleRemoveParticipant(email)}
                      aria-label={`Remover participante ${email}`}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint-text">Aún no agregas participantes (opcional).</p>
            )}
          </fieldset>

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={handleClose} disabled={isLoading}>
              Salir
            </button>
            <button className="create-trip-button" disabled={isLoading || isInitializing} type="submit">
              {isLoading ? "Creando..." : "Crear viaje"}
            </button>
          </div>
        </form>
      </Modal>

      <ManageTravelCategoriesModal
        currentUser={currentUser}
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        onChanged={async () => {
          try {
            await reloadCategories();
          } catch (error) {
            setErrors((current) => ({ ...current, form: error.message }));
          }
        }}
      />
    </>
  );
}
