import { useEffect, useId, useMemo, useState } from "react";

import { Modal } from "./Modal";
import { TextInput } from "../forms/TextInput";
import { createGasto } from "../../services/gastoService";
import { createDivisionGasto } from "../../services/divisionGastoService";
import { listExpenseCategories } from "../../services/categoriesService";
import { ManageExpenseCategoriesModal } from "./ManageExpenseCategoriesModal";

function parseAmountToCents(value) {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
}

function centsToFixed(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function splitCentsEvenly(totalCents, userIds) {
  const count = userIds.length;
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return userIds.map((id_usuario, index) => ({
    id_usuario,
    cents: base + (index < remainder ? 1 : 0),
  }));
}

export function AddExpenseModal({
  isOpen,
  onClose,
  travelId,
  currentUser,
  participants,
  categories,
  onCategoriesChanged,
  onCreated,
}) {
  const statusId = useId();
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1 datos, 2 participantes, 3 división, 4 resumen

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [pagadorId, setPagadorId] = useState(currentUser?.id_usuario ?? "");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  const [divisionType, setDivisionType] = useState("equal"); // equal | shares | custom
  const [sharesMode, setSharesMode] = useState("percent"); // percent | parts
  const [shares, setShares] = useState({}); // id_usuario -> number
  const [customAmounts, setCustomAmounts] = useState({}); // id_usuario -> string input

  const [isSaving, setIsSaving] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const participantById = useMemo(() => {
    return new Map((participants ?? []).map((p) => [p.id_usuario, p]));
  }, [participants]);

  const travelParticipantIds = useMemo(() => {
    return (participants ?? []).map((p) => p.id_usuario);
  }, [participants]);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage("");
    setErrors({});
    setStep(1);
    setDescripcion("");
    setMonto("");
    setCategoriaId("");
    setDivisionType("equal");
    setSharesMode("percent");
    setShares({});
    setCustomAmounts({});

    const defaultPayer = currentUser?.id_usuario ?? "";
    setPagadorId(defaultPayer);
    setSelectedParticipantIds(travelParticipantIds);
  }, [isOpen, currentUser, travelParticipantIds]);

  useEffect(() => {
    if (!isOpen) return;
    if (!travelParticipantIds.includes(Number(pagadorId))) {
      setPagadorId(currentUser?.id_usuario ?? "");
    }
  }, [isOpen, pagadorId, travelParticipantIds, currentUser]);

  function toggleParticipant(id) {
    setSelectedParticipantIds((current) => {
      const set = new Set(current);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function setShareValue(id, value) {
    setShares((current) => ({
      ...current,
      [id]: value,
    }));
  }

  function setCustomAmountValue(id, value) {
    setCustomAmounts((current) => ({
      ...current,
      [id]: value,
    }));
  }

  function getErrors() {
    const nextErrors = {};

    if (!descripcion.trim()) nextErrors.descripcion = "Ingresa el nombre o descripción del gasto.";

    const totalCents = parseAmountToCents(monto);
    if (totalCents === null || totalCents <= 0) nextErrors.monto = "Ingresa un monto válido mayor a 0.";

    const cat = Number(categoriaId);
    if (!cat) nextErrors.categoriaId = "Selecciona una categoría de gasto.";

    const payer = Number(pagadorId);
    if (!payer || !travelParticipantIds.includes(payer)) nextErrors.pagadorId = "Selecciona un pagador válido.";

    const selected = selectedParticipantIds.map(Number).filter(Boolean);
    if (selected.length === 0) nextErrors.participants = "Selecciona al menos un participante.";

    if (totalCents !== null && totalCents > 0 && selected.length > 0) {
      if (divisionType === "shares") {
        if (sharesMode === "percent") {
          const sum = selected.reduce((acc, id) => acc + Number(shares[id] ?? 0), 0);
          if (sum !== 100) nextErrors.division = "La suma de porcentajes debe ser exactamente 100%.";
          if (selected.some((id) => Number(shares[id] ?? 0) < 0)) {
            nextErrors.division = "No se permiten porcentajes negativos.";
          }
        } else {
          const parts = selected.map((id) => Number(shares[id] ?? 0));
          if (parts.some((v) => v < 0)) nextErrors.division = "No se permiten partes negativas.";
          const sum = parts.reduce((a, b) => a + b, 0);
          if (sum <= 0) nextErrors.division = "La suma de partes debe ser mayor a 0.";
        }
      }

      if (divisionType === "custom") {
        const centsList = selected.map((id) => parseAmountToCents(customAmounts[id] ?? 0) ?? 0);
        if (centsList.some((c) => c < 0)) nextErrors.division = "No se permiten montos negativos.";
        const sum = centsList.reduce((a, b) => a + b, 0);
        if (sum !== totalCents) nextErrors.division = "La suma de montos debe ser exactamente igual al monto total.";
      }
    }

    return nextErrors;
  }

  function computeParticipantsPayload(totalCents) {
    const selected = selectedParticipantIds.map(Number).filter(Boolean);
    if (divisionType === "equal") {
      const split = splitCentsEvenly(totalCents, selected);
      return split.map((row) => ({ id_usuario: row.id_usuario, monto: centsToFixed(row.cents) }));
    }

    if (divisionType === "shares") {
      if (sharesMode === "percent") {
        const rawPercents = selected.map((id) => ({ id, percent: Number(shares[id] ?? 0) }));
        const cents = rawPercents.map((p) => ({
          id_usuario: p.id,
          cents: Math.round((totalCents * p.percent) / 100),
        }));

        // Ajuste para que sume exacto al total
        const sum = cents.reduce((acc, item) => acc + item.cents, 0);
        let diff = totalCents - sum;
        for (let index = 0; diff !== 0 && index < cents.length; index += 1) {
          const step = diff > 0 ? 1 : -1;
          cents[index].cents += step;
          diff -= step;
        }

        return cents.map((row) => ({ id_usuario: row.id_usuario, monto: centsToFixed(row.cents) }));
      }

      const parts = selected.map((id) => ({ id, parts: Number(shares[id] ?? 0) }));
      const totalParts = parts.reduce((acc, item) => acc + item.parts, 0);
      const cents = parts.map((p) => ({
        id_usuario: p.id,
        cents: totalParts > 0 ? Math.round((totalCents * p.parts) / totalParts) : 0,
      }));
      const sum = cents.reduce((acc, item) => acc + item.cents, 0);
      let diff = totalCents - sum;
      for (let index = 0; diff !== 0 && index < cents.length; index += 1) {
        const step = diff > 0 ? 1 : -1;
        cents[index].cents += step;
        diff -= step;
      }
      return cents.map((row) => ({ id_usuario: row.id_usuario, monto: centsToFixed(row.cents) }));
    }

    // custom
    return selected
      .map((id) => ({
        id_usuario: id,
        cents: parseAmountToCents(customAmounts[id] ?? 0) ?? 0,
      }))
      .filter((row) => row.cents > 0)
      .map((row) => ({ id_usuario: row.id_usuario, monto: centsToFixed(row.cents) }));
  }

  function validateStep(nextStep) {
    const all = getErrors();
    const allowed =
      nextStep === 1
        ? ["descripcion", "monto", "categoriaId", "pagadorId"]
        : nextStep === 2
          ? ["participants"]
          : nextStep === 3
            ? ["division"]
            : ["descripcion", "monto", "categoriaId", "pagadorId", "participants", "division"];

    const filtered = Object.fromEntries(
      Object.entries(all).filter(([key]) => allowed.includes(key)),
    );
    setErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function goNext() {
    const next = Math.min(4, step + 1);
    if (step === 1 && !validateStep(1)) return;
    if (step === 2 && !validateStep(2)) return;
    if (step === 3 && !validateStep(3)) return;
    setStep(next);
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage("");

    const all = getErrors();
    if (Object.keys(all).length > 0) {
      setErrors(all);
      setStep(1);
      return;
    }

    const totalCents = parseAmountToCents(monto);
    if (totalCents === null) return;

    try {
      setIsSaving(true);
      setStatusMessage("Creando gasto...");

      const gastoResponse = await createGasto({
        id_viaje: travelId,
        id_usuario: Number(pagadorId),
        id_categoria: Number(categoriaId),
        monto: centsToFixed(totalCents),
        descripcion: descripcion.trim(),
      });

      const gasto = gastoResponse?.data;
      if (!gasto?.id_gasto) {
        throw new Error("No se recibió el gasto creado desde el backend.");
      }

      setStatusMessage("Creando división del gasto...");

      const participantes = computeParticipantsPayload(totalCents);
      if (participantes.length === 0) {
        throw new Error("La división no incluye montos. Ajusta la selección de participantes.");
      }

      await createDivisionGasto({
        id_gasto: gasto.id_gasto,
        nombre: `División: ${descripcion.trim()}`.slice(0, 128),
        monto_total: centsToFixed(totalCents),
        participantes,
      });

      setStatusMessage("Gasto creado correctamente.");
      onCreated?.();
      onClose();
    } catch (error) {
      setErrors((current) => ({ ...current, form: error.message }));
    } finally {
      setIsSaving(false);
    }
  }

  const divisionHelp = divisionType === "equal"
    ? "El monto se divide por igual entre los participantes seleccionados."
    : divisionType === "shares"
      ? "Asigna porcentajes o partes. El total debe representar 100% del gasto."
      : "Asigna montos manualmente. La suma debe ser igual al monto total.";

  const preview = useMemo(() => {
    const totalCents = parseAmountToCents(monto);
    if (totalCents === null || totalCents <= 0) return [];
    const selected = selectedParticipantIds.map(Number).filter(Boolean);
    if (selected.length === 0) return [];
    try {
      const list = computeParticipantsPayload(totalCents);
      const map = new Map(list.map((row) => [row.id_usuario, row.monto]));
      return selected.map((id_usuario) => ({
        id_usuario,
        nombre: participantById.get(id_usuario)?.nombre ?? `Usuario ${id_usuario}`,
        monto: map.get(id_usuario) ?? "0.00",
      }));
    } catch {
      return [];
    }
  }, [
    monto,
    selectedParticipantIds,
    divisionType,
    sharesMode,
    shares,
    customAmounts,
    participantById,
  ]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Agregar gasto"
        description="Registra un gasto del viaje y define cómo se divide entre participantes."
        isDismissable={!isSaving}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            {step > 1 ? (
              <button className="secondary-button" type="button" onClick={goBack} disabled={isSaving}>
                Atrás
              </button>
            ) : null}
            {step < 4 ? (
              <button className="create-trip-button" type="button" onClick={goNext} disabled={isSaving}>
                Siguiente
              </button>
            ) : (
              <button className="create-trip-button" type="submit" form="add-expense-form" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar gasto"}
              </button>
            )}
          </>
        }
      >
        <div className="sr-only" aria-live="polite" id={statusId} role="status">
          {statusMessage}
        </div>

        <form className="modal-form" id="add-expense-form" onSubmit={handleSubmit} noValidate>
          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          <ol className="stepper" aria-label="Progreso">
            <li className={step === 1 ? "active" : ""} aria-current={step === 1 ? "step" : undefined}>
              Datos
            </li>
            <li className={step === 2 ? "active" : ""} aria-current={step === 2 ? "step" : undefined}>
              Participantes
            </li>
            <li className={step === 3 ? "active" : ""} aria-current={step === 3 ? "step" : undefined}>
              División
            </li>
            <li className={step === 4 ? "active" : ""} aria-current={step === 4 ? "step" : undefined}>
              Resumen
            </li>
          </ol>

          {step === 1 ? (
            <>
              <TextInput
                autoFocus
                error={errors.descripcion}
                id="expense-desc"
                label="Nombre o descripción"
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Ej: Cena grupal"
                value={descripcion}
              />

              <TextInput
                error={errors.monto}
                id="expense-total"
                label="Monto total"
                inputMode="decimal"
                onChange={(event) => setMonto(event.target.value)}
                placeholder="Ej: 45000"
                value={monto}
              />

              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="expense-category">Categoría</label>
                  <button
                    className="secondary-button"
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setIsManageCategoriesOpen(true)}
                    disabled={isSaving}
                  >
                    Agregar categorías
                  </button>
                </div>
                <select
                  id="expense-category"
                  name="expense-category"
                  value={categoriaId}
                  onChange={(event) => setCategoriaId(event.target.value)}
                  aria-describedby={errors.categoriaId ? "expense-category-error" : undefined}
                  aria-invalid={errors.categoriaId ? "true" : "false"}
                >
                  <option value="">Seleccione una opción</option>
                  {categories.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </select>
                {errors.categoriaId ? (
                  <p className="field-error" id="expense-category-error" role="alert">
                    {errors.categoriaId}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="expense-payer">Quién pagó</label>
                <select
                  id="expense-payer"
                  name="expense-payer"
                  value={pagadorId}
                  onChange={(event) => setPagadorId(event.target.value)}
                  aria-describedby={errors.pagadorId ? "expense-payer-error" : undefined}
                  aria-invalid={errors.pagadorId ? "true" : "false"}
                >
                  {participants.map((p) => (
                    <option key={p.id_usuario} value={p.id_usuario}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                {errors.pagadorId ? (
                  <p className="field-error" id="expense-payer-error" role="alert">
                    {errors.pagadorId}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <fieldset className="modal-fieldset">
              <legend>Participantes incluidos</legend>
              {errors.participants ? (
                <p className="field-error" role="alert">
                  {errors.participants}
                </p>
              ) : null}
              <div className="checkbox-grid" role="group" aria-label="Participantes del gasto">
                {participants.map((p) => (
                  <label key={p.id_usuario} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedParticipantIds.includes(p.id_usuario)}
                      onChange={() => toggleParticipant(p.id_usuario)}
                    />
                    <span>
                      <strong>{p.nombre}</strong>
                      {p.correo ? <span className="muted"> · {p.correo}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="modal-fieldset">
              <legend>División</legend>
              <p className="hint-text">{divisionHelp}</p>
              {errors.division ? (
                <p className="field-error" role="alert">
                  {errors.division}
                </p>
              ) : null}

              <div className="radio-grid" role="radiogroup" aria-label="Tipo de división">
                <label className="radio-row">
                  <input
                    type="radio"
                    name="division-type"
                    value="equal"
                    checked={divisionType === "equal"}
                    onChange={() => setDivisionType("equal")}
                  />
                  <span>División igualitaria</span>
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="division-type"
                    value="shares"
                    checked={divisionType === "shares"}
                    onChange={() => setDivisionType("shares")}
                  />
                  <span>División por partes o porcentajes</span>
                </label>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="division-type"
                    value="custom"
                    checked={divisionType === "custom"}
                    onChange={() => setDivisionType("custom")}
                  />
                  <span>División personalizada</span>
                </label>
              </div>

              {divisionType === "shares" ? (
                <div className="division-editor" aria-label="Asignación por partes o porcentajes">
                  <fieldset className="inline-fieldset">
                    <legend>Modo</legend>
                    <label className="radio-row">
                      <input
                        type="radio"
                        name="shares-mode"
                        value="percent"
                        checked={sharesMode === "percent"}
                        onChange={() => setSharesMode("percent")}
                      />
                      <span>Porcentaje</span>
                    </label>
                    <label className="radio-row">
                      <input
                        type="radio"
                        name="shares-mode"
                        value="parts"
                        checked={sharesMode === "parts"}
                        onChange={() => setSharesMode("parts")}
                      />
                      <span>Partes</span>
                    </label>
                  </fieldset>

                  <div className="division-grid" role="group" aria-label="Asignación">
                    {selectedParticipantIds.map((id) => {
                      const p = participantById.get(id);
                      return (
                        <div key={id} className="division-row">
                          <span>{p?.nombre ?? `Usuario ${id}`}</span>
                          <label className="sr-only" htmlFor={`shares-${id}`}>
                            {sharesMode === "percent" ? "Porcentaje" : "Partes"} para {p?.nombre ?? id}
                          </label>
                          <input
                            id={`shares-${id}`}
                            inputMode="decimal"
                            type="number"
                            min="0"
                            step="1"
                            value={shares[id] ?? ""}
                            onChange={(event) => setShareValue(id, event.target.value)}
                          />
                          <span className="muted">{sharesMode === "percent" ? "%" : "partes"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {divisionType === "custom" ? (
                <div className="division-editor" aria-label="Asignación personalizada">
                  <div className="division-grid" role="group" aria-label="Montos por participante">
                    {selectedParticipantIds.map((id) => {
                      const p = participantById.get(id);
                      return (
                        <div key={id} className="division-row">
                          <span>{p?.nombre ?? `Usuario ${id}`}</span>
                          <label className="sr-only" htmlFor={`custom-${id}`}>
                            Monto para {p?.nombre ?? id}
                          </label>
                          <input
                            id={`custom-${id}`}
                            inputMode="decimal"
                            type="text"
                            value={customAmounts[id] ?? ""}
                            onChange={(event) => setCustomAmountValue(id, event.target.value)}
                          />
                          <span className="muted">CRC</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="hint-text">Puedes dejar un monto en 0 para omitir a un participante.</p>
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {step === 4 ? (
            <section className="summary-card" aria-label="Resumen del gasto">
              <p className="hint-text">
                Revisa el resumen antes de guardar. Si algo no coincide, vuelve con “Atrás”.
              </p>
              <ul className="summary-list" aria-label="Detalle de división">
                {preview.map((row) => (
                  <li key={row.id_usuario} className="summary-row">
                    <span>{row.nombre}</span>
                    <strong>{row.monto}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </form>
      </Modal>

      <ManageExpenseCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onChanged={async () => {
          const updated = await listExpenseCategories();
          onCategoriesChanged?.(updated ?? []);
        }}
      />
    </>
  );
}
