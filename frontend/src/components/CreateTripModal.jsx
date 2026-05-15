import { useEffect, useRef, useState } from "react";
import { addUserToTravel, createTravel, getCategories, getUserByEmail } from "../services/tripService";

export function CreateTripModal({ currentUser, onClose, onTripCreated }) {
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [participants, setParticipants] = useState([]);
  const [participantError, setParticipantError] = useState("");
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    getCategories("viaje").then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    firstInputRef.current?.focus();

    const handleCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  async function handleAddParticipant() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    if (email === currentUser?.correo?.toLowerCase()) {
      setParticipantError("Ya eres el creador del viaje.");
      return;
    }

    if (participants.some((p) => p.correo.toLowerCase() === email)) {
      setParticipantError("Este participante ya fue agregado.");
      return;
    }

    setParticipantError("");
    setIsAddingParticipant(true);

    try {
      const user = await getUserByEmail(email);
      if (!user) {
        setParticipantError("No se encontró un usuario con ese correo.");
        return;
      }
      setParticipants((prev) => [...prev, user]);
      setEmailInput("");
    } catch {
      setParticipantError("Error al buscar el usuario. Intenta de nuevo.");
    } finally {
      setIsAddingParticipant(false);
    }
  }

  function removeParticipant(id) {
    setParticipants((prev) => prev.filter((p) => p.id_usuario !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!nombre.trim()) {
      setFormError("El nombre del viaje es requerido.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const travelPayload = {
        nombre: nombre.trim(),
        id_usuario: currentUser.id_usuario,
        ...(categoriaId ? { id_categoria: Number(categoriaId) } : {}),
      };

      const result = await createTravel(travelPayload);
      const newTravelId = result.data.id_travel;

      await Promise.all(
        participants.map((p) => addUserToTravel(newTravelId, p.id_usuario))
      );

      onTripCreated();
      onClose();
    } catch {
      setFormError("Error al crear el viaje. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="create-trip-dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-header">
          <h2 id="modal-title">Crear nuevo viaje</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar formulario"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="field">
            <label htmlFor="trip-nombre">Asunto</label>
            <input
              ref={firstInputRef}
              id="trip-nombre"
              type="text"
              placeholder="Viaje a la playa"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              aria-required="true"
              maxLength={128}
            />
          </div>

          <div className="field">
            <label htmlFor="trip-categoria">Categoría</label>
            <select
              id="trip-categoria"
              className="field-select"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="participant-fieldset">
            <legend>Participantes</legend>
            <div className="participant-input-row">
              <input
                id="trip-email"
                type="email"
                placeholder="participante@ejemplo.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setParticipantError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                aria-describedby={participantError ? "participant-error" : undefined}
                aria-label="Correo del participante"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={handleAddParticipant}
                disabled={isAddingParticipant}
              >
                {isAddingParticipant ? "Buscando..." : "Agregar"}
              </button>
            </div>

            {participantError && (
              <p id="participant-error" className="field-error" role="alert">
                {participantError}
              </p>
            )}

            {participants.length > 0 && (
              <ul className="participant-list" aria-label="Participantes agregados">
                {participants.map((p) => (
                  <li key={p.id_usuario} className="participant-chip">
                    <span>{p.nombre}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeParticipant(p.id_usuario)}
                      aria-label={`Eliminar a ${p.nombre}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear viaje"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
