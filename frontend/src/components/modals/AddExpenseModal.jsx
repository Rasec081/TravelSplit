import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
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

function sanitizeDecimalInput(value) {
  const raw = String(value ?? "").replace(",", ".");
  let sanitized = "";
  let hasDecimalSeparator = false;

  for (const character of raw) {
    if (/\d/.test(character)) {
      sanitized += character;
      continue;
    }

    if (character === "." && !hasDecimalSeparator) {
      sanitized += character;
      hasDecimalSeparator = true;
    }
  }

  return sanitized;
}

function sanitizePercentInput(value) {
  const sanitizedValue = sanitizeDecimalInput(value);
  if (!sanitizedValue) return "";

  const numericValue = Number(sanitizedValue);
  if (!Number.isFinite(numericValue)) return "";
  if (numericValue > 100) return "100";
  if (numericValue < 0) return "0";
  return sanitizedValue;
}

function sanitizeIntegerInput(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function defaultPercentFor(count) {
  if (count <= 0) return "";
  return String(Number((100 / count).toFixed(2)));
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

const DIVISION_PRESETS_STORAGE_KEY = "travelsplit_division_presets";

function getPresetScopeKey(travelId, userId) {
  return `${travelId ?? "travel"}:${userId ?? "user"}`;
}

function readStoredDivisionPresets(scopeKey) {
  const raw = window.localStorage.getItem(DIVISION_PRESETS_STORAGE_KEY);
  const stored = raw ? JSON.parse(raw) : {};
  return Array.isArray(stored[scopeKey]) ? stored[scopeKey] : [];
}

function writeStoredDivisionPresets(scopeKey, presets) {
  const raw = window.localStorage.getItem(DIVISION_PRESETS_STORAGE_KEY);
  const stored = raw ? JSON.parse(raw) : {};
  stored[scopeKey] = presets;
  window.localStorage.setItem(DIVISION_PRESETS_STORAGE_KEY, JSON.stringify(stored));
}

function sameNumberSet(a, b) {
  if (a.length !== b.length) return false;
  const normalizedA = a.map(Number).sort((left, right) => left - right).join("|");
  const normalizedB = b.map(Number).sort((left, right) => left - right).join("|");
  return normalizedA === normalizedB;
}

function DivisionTypeIcon({ type }) {
  if (type === "shares") {
    return (
      <svg aria-hidden="true" className="division-type-icon" fill="none" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3" />
        <path d="M24 7v17h17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      </svg>
    );
  }

  if (type === "custom") {
    return (
      <svg aria-hidden="true" className="division-type-icon" fill="none" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3" />
        <circle cx="24" cy="18" r="6" stroke="currentColor" strokeWidth="3" />
        <path d="M13 36c2.2-7 7-10 11-10s8.8 3 11 10" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="division-type-icon" fill="none" viewBox="0 0 48 48">
      <circle cx="24" cy="14" r="6" stroke="currentColor" strokeWidth="3" />
      <path d="M12 36c1.8-7.4 6.2-11 12-11s10.2 3.6 12 11" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
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
  const isSubmittingRef = useRef(false);
  const skipNextShareSyncRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1 datos, 2 división

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [pagadorId, setPagadorId] = useState(currentUser?.id_usuario ?? "");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);

  const [divisionType, setDivisionType] = useState("equal"); // equal | shares | custom
  const [sharesMode, setSharesMode] = useState("parts"); // parts | percent
  const [shares, setShares] = useState({}); // id_usuario -> number
  const [customAmounts, setCustomAmounts] = useState({}); // id_usuario -> string input
  const [lastSyncedSharesMode, setLastSyncedSharesMode] = useState("parts");
  const [lastSyncedParticipantKey, setLastSyncedParticipantKey] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [divisionPresets, setDivisionPresets] = useState([]);
  const [divisionPresetName, setDivisionPresetName] = useState("");
  const [editingPresetId, setEditingPresetId] = useState("");
  const [divisionPresetError, setDivisionPresetError] = useState("");
  const [isSavedDivisionsOpen, setIsSavedDivisionsOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const participantById = useMemo(() => {
    return new Map((participants ?? []).map((p) => [p.id_usuario, p]));
  }, [participants]);

  const travelParticipantIds = useMemo(() => {
    return (participants ?? []).map((p) => p.id_usuario);
  }, [participants]);
  const selectedParticipantKey = useMemo(() => {
    return selectedParticipantIds.map(String).sort().join("|");
  }, [selectedParticipantIds]);
  const selectedParticipantCountLabel = `${selectedParticipantIds.length} ${
    selectedParticipantIds.length === 1 ? "seleccionado" : "seleccionados"
  }`;
  const presetScopeKey = getPresetScopeKey(travelId, currentUser?.id_usuario);
  const canUseDivisionPresets = divisionType === "shares" || divisionType === "custom";
  const defaultPayerId = currentUser?.id_usuario ?? "";
  const hasUnsavedChanges =
    Boolean(descripcion.trim()) ||
    Boolean(monto.trim()) ||
    Boolean(categoriaId) ||
    Number(pagadorId) !== Number(defaultPayerId) ||
    !sameNumberSet(selectedParticipantIds, travelParticipantIds) ||
    divisionType !== "equal" ||
    sharesMode !== "parts" ||
    (divisionType === "shares" && Object.values(shares).some(Boolean)) ||
    (divisionType === "custom" && Object.values(customAmounts).some(Boolean)) ||
    Boolean(divisionPresetName.trim()) ||
    Boolean(editingPresetId);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage("");
    isSubmittingRef.current = false;
    setErrors({});
    setStep(1);
    setDescripcion("");
    setMonto("");
    setCategoriaId("");
    setDivisionType("equal");
    setSharesMode("parts");
    setLastSyncedSharesMode("parts");
    setLastSyncedParticipantKey("");
    setShares({});
    setCustomAmounts({});
    setDivisionPresetName("");
    setEditingPresetId("");
    setDivisionPresetError("");
    setIsSavedDivisionsOpen(false);
    setIsDiscardConfirmOpen(false);

    const defaultPayer = currentUser?.id_usuario ?? "";
    setPagadorId(defaultPayer);
    setSelectedParticipantIds(travelParticipantIds);
  }, [isOpen, currentUser, travelParticipantIds]);

  function handleClose() {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }

  function discardAndClose() {
    setIsDiscardConfirmOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    try {
      setDivisionPresets(readStoredDivisionPresets(presetScopeKey));
    } catch {
      setDivisionPresets([]);
      setDivisionPresetError("No se pudieron cargar las divisiones guardadas.");
    }
  }, [isOpen, presetScopeKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (!travelParticipantIds.includes(Number(pagadorId))) {
      setPagadorId(currentUser?.id_usuario ?? "");
    }
  }, [isOpen, pagadorId, travelParticipantIds, currentUser]);

  useEffect(() => {
    if (selectedParticipantIds.length === 0) {
      setShares({});
      setLastSyncedParticipantKey("");
      return;
    }

    const modeChanged = lastSyncedSharesMode !== sharesMode;
    const participantsChanged = lastSyncedParticipantKey !== selectedParticipantKey;
    const defaultValue = sharesMode === "parts" ? "1" : defaultPercentFor(selectedParticipantIds.length);

    if (skipNextShareSyncRef.current) {
      skipNextShareSyncRef.current = false;
      setLastSyncedSharesMode(sharesMode);
      setLastSyncedParticipantKey(selectedParticipantKey);
      return;
    }

    setShares((current) => {
      const nextShares = {};

      for (const id of selectedParticipantIds) {
        const key = String(id);
        const currentValue = current[key];
        const sanitizedValue = sharesMode === "parts"
          ? sanitizeIntegerInput(currentValue)
          : sanitizePercentInput(currentValue);
        nextShares[key] = modeChanged || participantsChanged ? defaultValue : sanitizedValue || defaultValue;
      }

      return nextShares;
    });
    setLastSyncedSharesMode(sharesMode);
    setLastSyncedParticipantKey(selectedParticipantKey);
  }, [
    selectedParticipantIds,
    selectedParticipantKey,
    sharesMode,
    lastSyncedSharesMode,
    lastSyncedParticipantKey,
  ]);

  function toggleParticipant(id) {
    setSelectedParticipantIds((current) => {
      const set = new Set(current);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function setShareValue(id, value) {
    const sanitizedValue = sharesMode === "parts" ? sanitizeIntegerInput(value) : sanitizePercentInput(value);

    setShares((current) => ({
      ...current,
      [id]: sanitizedValue,
    }));
  }

  function setCustomAmountValue(id, value) {
    setCustomAmounts((current) => ({
      ...current,
      [id]: sanitizeDecimalInput(value),
    }));
  }

  function persistDivisionPresets(nextPresets) {
    setDivisionPresets(nextPresets);
    writeStoredDivisionPresets(presetScopeKey, nextPresets);
  }

  function buildCurrentPreset() {
    const participantIds = selectedParticipantIds.map(Number).filter(Boolean);
    const values = {};

    for (const id of participantIds) {
      if (divisionType === "shares") {
        values[id] = shares[id] ?? "";
      } else if (divisionType === "custom") {
        values[id] = customAmounts[id] ?? "";
      }
    }

    return {
      divisionType,
      sharesMode,
      participantIds,
      values,
    };
  }

  function handleSaveDivisionPreset() {
    const name = divisionPresetName.trim();

    if (!canUseDivisionPresets) {
      setDivisionPresetError("Selecciona partes, porcentajes o división personalizada.");
      return;
    }
    if (!name) {
      setDivisionPresetError("Ingresa un nombre para guardar la división.");
      return;
    }
    if (selectedParticipantIds.length === 0) {
      setDivisionPresetError("Selecciona al menos un participante.");
      return;
    }

    const preset = {
      id: editingPresetId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      ...buildCurrentPreset(),
    };
    const nextPresets = editingPresetId
      ? divisionPresets.map((item) => (item.id === editingPresetId ? preset : item))
      : [...divisionPresets, preset];

    persistDivisionPresets(nextPresets);
    setDivisionPresetName("");
    setEditingPresetId("");
    setDivisionPresetError("");
  }

  function handleApplyDivisionPreset(preset, { edit = false } = {}) {
    setDivisionType(preset.divisionType);
    setSelectedParticipantIds(preset.participantIds ?? []);
    setDivisionPresetError("");
    setDivisionPresetName(edit ? preset.name : "");
    setEditingPresetId(edit ? preset.id : "");

    if (preset.divisionType === "shares") {
      skipNextShareSyncRef.current = true;
      setSharesMode(preset.sharesMode ?? "parts");
      setShares(preset.values ?? {});
    }
    if (preset.divisionType === "custom") {
      setCustomAmounts(preset.values ?? {});
    }
  }

  function handleDeleteDivisionPreset(presetId) {
    persistDivisionPresets(divisionPresets.filter((preset) => preset.id !== presetId));
    if (editingPresetId === presetId) {
      setEditingPresetId("");
      setDivisionPresetName("");
    }
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

  function validateFields(fields) {
    const all = getErrors();
    const filtered = Object.fromEntries(
      Object.entries(all).filter(([key]) => fields.includes(key)),
    );
    setErrors(filtered);
    return Object.keys(filtered).length === 0;
  }

  function goToStep(nextStep, { validate = false } = {}) {
    if (validate && nextStep === 2 && !validateFields(["descripcion", "monto", "categoriaId", "pagadorId"])) {
      return;
    }

    setErrors({});
    setStep(nextStep);
  }

  function goNext(event) {
    event?.preventDefault();
    event?.stopPropagation();
    goToStep(2, { validate: true });
  }

  function goBack(event) {
    event?.preventDefault();
    event?.stopPropagation();
    setErrors({});
    setStep(1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isSubmittingRef.current) {
      return;
    }

    setStatusMessage("");

    const all = getErrors();
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const dataFields = ["descripcion", "monto", "categoriaId", "pagadorId"];
      setStep(Object.keys(all).some((key) => dataFields.includes(key)) ? 1 : 2);
      return;
    }

    const totalCents = parseAmountToCents(monto);
    if (totalCents === null) return;

    isSubmittingRef.current = true;

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
      isSubmittingRef.current = false;
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
        onClose={handleClose}
        title="Agregar gasto"
        description="Registra un gasto del viaje y define cómo se divide entre participantes."
        isDismissable={!isSaving}
        footer={
          <>
            <button className="secondary-button" type="button" onClick={handleClose} disabled={isSaving}>
              Cancelar
            </button>
            {step > 1 ? (
              <button key="back-to-data" className="secondary-button" type="button" onClick={goBack} disabled={isSaving}>
                Volver a datos
              </button>
            ) : null}
            {step === 1 ? (
              <button key="go-to-division" className="create-trip-button" type="button" onClick={goNext} disabled={isSaving}>
                Ir a división
              </button>
            ) : (
              <button key="save-expense" className="create-trip-button" type="submit" form="add-expense-form" disabled={isSaving}>
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
            <li>
              <button
                className={step === 1 ? "active" : ""}
                type="button"
                onClick={() => goToStep(1)}
                aria-current={step === 1 ? "step" : undefined}
                disabled={isSaving}
              >
                Datos
              </button>
            </li>
            <li>
              <button
                className={step === 2 ? "active" : ""}
                type="button"
                onClick={() => goToStep(2)}
                aria-current={step === 2 ? "step" : undefined}
                disabled={isSaving}
              >
                División
              </button>
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
                required
                value={descripcion}
              />

              <TextInput
                error={errors.monto}
                id="expense-total"
                label="Monto total"
                inputMode="decimal"
                onChange={(event) => setMonto(sanitizeDecimalInput(event.target.value))}
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="Ej: 45000"
                required
                type="number"
                value={monto}
              />

              <div className="field">
                <label htmlFor="expense-category">Categoría</label>
                <div className="category-picker-row">
                  <select
                    id="expense-category"
                    name="expense-category"
                    value={categoriaId}
                    onChange={(event) => setCategoriaId(event.target.value)}
                    required
                    aria-describedby={errors.categoriaId ? "expense-category-error" : undefined}
                    aria-invalid={errors.categoriaId ? "true" : "false"}
                  >
                    <option value="">Seleccione una categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>
                        {cat.nombre_categoria}
                      </option>
                    ))}
                  </select>
                  <button
                    className="primary-button"
                    type="button"
                    aria-haspopup="dialog"
                    aria-label="Agregar nueva categoría de gasto"
                    onClick={() => setIsManageCategoriesOpen(true)}
                    disabled={isSaving}
                  >
                    Agregar categoría
                  </button>
                </div>
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
                  required
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
            <div className="expense-division-layout">
              <section className="summary-card" aria-label="Participantes incluidos">
                <div className="division-section-heading">
                  <h3>Participantes</h3>
                  <span>{selectedParticipantCountLabel}</span>
                </div>
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
              </section>

              <fieldset className="modal-fieldset division-panel">
                <legend>División</legend>
                <div className="division-panel-heading">
                  <h3>Dividir monto</h3>
                  <p>{divisionHelp}</p>
                </div>
                {errors.division ? (
                  <p className="field-error" role="alert">
                    {errors.division}
                  </p>
                ) : null}

                <fieldset className="division-type-fieldset">
                  <legend className="division-subtitle">Tipo de división</legend>
                  <div className="division-option-grid">
                    <label className={`division-type-card ${divisionType === "equal" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="division-type"
                        value="equal"
                        checked={divisionType === "equal"}
                        onChange={() => setDivisionType("equal")}
                      />
                      <span className="division-type-check" aria-hidden="true">✓</span>
                      <DivisionTypeIcon type="equal" />
                      <strong>División igualitaria</strong>
                      <span>Divide el monto por igual entre los participantes.</span>
                    </label>
                    <label className={`division-type-card ${divisionType === "shares" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="division-type"
                        value="shares"
                        checked={divisionType === "shares"}
                        onChange={() => setDivisionType("shares")}
                      />
                      <span className="division-type-check" aria-hidden="true">✓</span>
                      <DivisionTypeIcon type="shares" />
                      <strong>División por partes o porcentajes</strong>
                      <span>Divide el monto por porcentajes o partes específicas.</span>
                    </label>
                    <label className={`division-type-card ${divisionType === "custom" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="division-type"
                        value="custom"
                        checked={divisionType === "custom"}
                        onChange={() => setDivisionType("custom")}
                      />
                      <span className="division-type-check" aria-hidden="true">✓</span>
                      <DivisionTypeIcon type="custom" />
                      <strong>División personalizada</strong>
                      <span>Asigna un monto específico a cada participante.</span>
                    </label>
                  </div>
                </fieldset>

                <div className="saved-division-list-panel" aria-label="Divisiones de gasto guardadas">
                  <button
                    className="saved-division-list-toggle"
                    type="button"
                    onClick={() => setIsSavedDivisionsOpen((current) => !current)}
                    aria-expanded={isSavedDivisionsOpen}
                    aria-controls="saved-division-list-content"
                  >
                    <span>Mis divisiones guardadas</span>
                    <span className="saved-division-toggle-icon" aria-hidden="true">
                      {isSavedDivisionsOpen ? "▴" : "▾"}
                    </span>
                  </button>
                  {isSavedDivisionsOpen ? (
                    <div id="saved-division-list-content">
                      {divisionPresets.length > 0 ? (
                        <ul className="saved-division-list">
                          {divisionPresets.map((preset) => (
                            <li key={preset.id} className="saved-division-row">
                              <div>
                                <strong>{preset.name}</strong>
                                <span>
                                  {preset.divisionType === "custom"
                                    ? "División personalizada"
                                    : preset.sharesMode === "percent"
                                      ? "División por porcentajes"
                                      : "División por partes"}
                                </span>
                              </div>
                              <span className="saved-division-count">
                                {preset.participantIds?.length ?? 0}{" "}
                                {(preset.participantIds?.length ?? 0) === 1 ? "participante" : "participantes"}
                              </span>
                              <div className="saved-division-actions">
                                <button
                                  type="button"
                                  onClick={() => handleApplyDivisionPreset(preset)}
                                  aria-label={`Aplicar división ${preset.name}`}
                                >
                                  Aplicar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyDivisionPreset(preset, { edit: true })}
                                  aria-label={`Editar división ${preset.name}`}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDivisionPreset(preset.id)}
                                  aria-label={`Eliminar división ${preset.name}`}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="hint-text">Aún no hay divisiones guardadas para este viaje.</p>
                      )}
                    </div>
                  ) : null}
                </div>

                {divisionType === "shares" ? (
                  <div className="division-editor" aria-label="Asignación por partes o porcentajes">
                    <fieldset className="inline-fieldset">
                      <legend>Modo</legend>
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
                              inputMode={sharesMode === "percent" ? "decimal" : "numeric"}
                              type="number"
                              min="0"
                              max={sharesMode === "percent" ? "100" : undefined}
                              step={sharesMode === "percent" ? "1" : "1"}
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
                              min="0"
                              step="0.01"
                              type="number"
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

                {canUseDivisionPresets ? (
                  <div className="save-division-compact">
                    <label htmlFor="division-preset-name">Guardar esta división</label>
                    <div className="save-division-controls">
                      <input
                        id="division-preset-name"
                        type="text"
                        value={divisionPresetName}
                        onChange={(event) => {
                          setDivisionPresetName(event.target.value);
                          setDivisionPresetError("");
                        }}
                        placeholder="Ejemplo: Admin invita"
                      />
                      <button className="secondary-button" type="button" onClick={handleSaveDivisionPreset}>
                        {editingPresetId ? "Actualizar balance" : "Guardar balance"}
                      </button>
                    </div>
                    {divisionPresetError ? (
                      <p className="field-error" role="alert">
                        {divisionPresetError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>

              <section className="summary-card" aria-label="Resumen del gasto">
                <div className="division-section-heading">
                  <h3>Resumen</h3>
                  <span>En tiempo real</span>
                </div>
                {preview.length > 0 ? (
                  <ul className="summary-list" aria-label="Detalle de división">
                    {preview.map((row) => (
                      <li key={row.id_usuario} className="summary-row">
                        <span>{row.nombre}</span>
                        <strong>{row.monto}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="hint-text">Selecciona participantes y un monto válido para ver la división.</p>
                )}
              </section>
            </div>
          ) : null}
        </form>
      </Modal>

      <ManageExpenseCategoriesModal
        currentUser={currentUser}
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        onChanged={async () => {
          const updated = await listExpenseCategories(currentUser?.id_usuario);
          onCategoriesChanged?.(updated ?? []);
        }}
      />

      <ConfirmDialog
        isOpen={isDiscardConfirmOpen}
        title="Descartar cambios"
        description="Hay cambios sin guardar en este gasto. Si cancelas, se perderán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onCancel={() => setIsDiscardConfirmOpen(false)}
        onConfirm={discardAndClose}
      />
    </>
  );
}
