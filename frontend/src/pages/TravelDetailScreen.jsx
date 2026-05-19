import { useEffect, useMemo, useState } from "react";

import { useRef } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import { Modal } from "../components/modals/Modal";
import { ConfirmDialog } from "../components/modals/ConfirmDialog";
import { TextInput } from "../components/forms/TextInput";
import { AddExpenseModal } from "../components/modals/AddExpenseModal";
import { ManageParticipantsModal } from "../components/modals/ManageParticipantsModal";
import { ManageTravelCategoriesModal } from "../components/modals/ManageTravelCategoriesModal";
import { views } from "../routes/views";
import { listUsers } from "../services/userService";
import { listUsersByTravel } from "../services/userTravelService";
import {
  getTravel,
  getTravelBalance,
  getTravelSettlements,
  createTravelPayment,
  updateTravel,
  closeTravel,
} from "../services/travelService";
import { listGastosByTravel } from "../services/gastoService";
import { listExpenseCategories, listTravelCategories } from "../services/categoriesService";

function formatCurrency(amount) {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric)) return "₡0";
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(numeric);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function balanceClass(balance) {
  const numeric = Number(balance ?? 0);
  if (numeric > 0) return "balance-positive";
  if (numeric < 0) return "balance-negative";
  return "balance-zero";
}

function avatarLetter(name) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toLocaleUpperCase("es-CR");
}

function isTravelClosed(travel) {
  if (!travel?.fecha_cierre) return false;

  const createdAt = new Date(travel.fecha_creacion).getTime();
  const closedAt = new Date(travel.fecha_cierre).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(closedAt)) return true;

  return closedAt - createdAt > 5000;
}

export function TravelDetailScreen({ currentUser, goTo, onLogout, travelId }) {
  const [travel, setTravel] = useState(null);
  const [balance, setBalance] = useState(null);
  const [userTravels, setUserTravels] = useState([]);
  const [users, setUsers] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [travelCategories, setTravelCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isManageParticipantsOpen, setIsManageParticipantsOpen] = useState(false);
  const [isTravelCategoriesOpen, setIsTravelCategoriesOpen] = useState(false);
  const [isPersonalBalanceOpen, setIsPersonalBalanceOpen] = useState(false);
  const [isSettleAllConfirmOpen, setIsSettleAllConfirmOpen] = useState(false);
  const [personalBalanceSection, setPersonalBalanceSection] = useState("resumen");
  const balanceTabRefs = useRef([]);

  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [tripNameDraft, setTripNameDraft] = useState("");
  const [tripCategoryDraft, setTripCategoryDraft] = useState("");
  const [tripNameError, setTripNameError] = useState("");
  const [tripCategoryError, setTripCategoryError] = useState("");

  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [settlements, setSettlements] = useState([]);
  const [settlementsError, setSettlementsError] = useState("");
  const [isSettlementsLoading, setIsSettlementsLoading] = useState(false);
  const [settleSuccessMessage, setSettleSuccessMessage] = useState("");
  const [paymentTargetUserId, setPaymentTargetUserId] = useState("");
  const [paymentAmountDraft, setPaymentAmountDraft] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);

  const isOwner = useMemo(() => {
    if (!travel || !currentUser) return false;
    return travel.id_usuario_creador === currentUser.id_usuario;
  }, [travel, currentUser]);
  const hasAdminRole = useMemo(() => {
    if (!currentUser) return false;
    return (userTravels ?? []).some(
      (ut) => ut.id_usuario === currentUser.id_usuario && String(ut.rol ?? "").toLowerCase() === "admin",
    );
  }, [userTravels, currentUser]);
  const isClosed = useMemo(() => isTravelClosed(travel), [travel]);
  const canManageTravel = (isOwner || hasAdminRole) && !isClosed;

  const userById = useMemo(() => {
    return new Map((users ?? []).map((user) => [user.id_usuario, user]));
  }, [users]);

  const expenseCategoryById = useMemo(() => {
    return new Map((expenseCategories ?? []).map((cat) => [cat.id_categoria, cat]));
  }, [expenseCategories]);

  const balanceByUserId = useMemo(() => {
    const list = balance?.data?.usuarios ?? [];
    return new Map(list.map((entry) => [entry.id_usuario, entry]));
  }, [balance]);

  const myBalanceEntry = useMemo(() => {
    if (!currentUser) return null;
    return balanceByUserId.get(currentUser.id_usuario) ?? null;
  }, [balanceByUserId, currentUser]);

  const myBalance = useMemo(() => {
    if (!currentUser) return 0;
    return balanceByUserId.get(currentUser.id_usuario)?.balance_final ?? 0;
  }, [balanceByUserId, currentUser]);

  const totalGastos = useMemo(() => {
    return balance?.data?.total_pagado_viaje ?? 0;
  }, [balance]);

  const groupDiff = useMemo(() => {
    return balance?.data?.diferencia ?? 0;
  }, [balance]);

  const participantRows = useMemo(() => {
    const rows = userTravels.map((ut) => {
      const user = userById.get(ut.id_usuario);
      const b = balanceByUserId.get(ut.id_usuario);
      return {
        id_user_travel: ut.id_user_travel,
        id_usuario: ut.id_usuario,
        nombre: user?.nombre ?? `Usuario ${ut.id_usuario}`,
        correo: user?.correo ?? "",
        rol: ut.rol,
        balance_final: b?.balance_final ?? 0,
      };
    });

    rows.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
    return rows;
  }, [userTravels, userById, balanceByUserId]);
  const participantCountLabel = `${participantRows.length} ${
    participantRows.length === 1 ? "participante" : "participantes"
  }`;

  async function refreshAll() {
    if (!travelId) {
      setErrorMessage("No se encontró el viaje seleccionado.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        travelResponse,
        balanceResponse,
        userTravelsResponse,
        usersResponse,
        gastosResponse,
        expenseCategoriesResponse,
        travelCategoriesResponse,
      ] = await Promise.all([
        getTravel(travelId),
        getTravelBalance(travelId),
        listUsersByTravel(travelId),
        listUsers(),
        listGastosByTravel(travelId),
        listExpenseCategories(currentUser?.id_usuario),
        listTravelCategories(currentUser?.id_usuario),
      ]);

      setTravel(travelResponse ?? null);
      setBalance(balanceResponse ?? null);
      setUserTravels(userTravelsResponse ?? []);
      setUsers(usersResponse ?? []);
      setGastos(gastosResponse ?? []);
      setExpenseCategories(expenseCategoriesResponse ?? []);
      setTravelCategories(travelCategoriesResponse ?? []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, [travelId]);

  async function refreshSettlements() {
    if (!currentUser || !travelId) return;
    setIsSettlementsLoading(true);
    setSettlementsError("");
    try {
      const response = await getTravelSettlements(travelId, currentUser.id_usuario);
      const items = response?.data?.items ?? [];
      setSettlements(items);

      const defaultPayItem = items.find((i) => i.tipo === "pagar_a");
      if (defaultPayItem) {
        setPaymentTargetUserId(String(defaultPayItem.contraparte.id_usuario));
        setPaymentAmountDraft(String(defaultPayItem.monto));
      } else {
        setPaymentTargetUserId("");
        setPaymentAmountDraft("");
      }
    } catch (error) {
      setSettlementsError(error.message);
    } finally {
      setIsSettlementsLoading(false);
    }
  }

  useEffect(() => {
    if (!isPersonalBalanceOpen) return;
    setPersonalBalanceSection("resumen");
    setSettleSuccessMessage("");
    setPaymentError("");
    refreshSettlements();
  }, [isPersonalBalanceOpen, travelId, currentUser?.id_usuario]);

  async function reloadTravelCategories() {
    const response = await listTravelCategories(currentUser?.id_usuario);
    setTravelCategories(response ?? []);
  }

  useEffect(() => {
    setTripNameDraft(travel?.nombre ?? "");
    setTripCategoryDraft(travel?.id_categoria ? String(travel.id_categoria) : "");
  }, [travel]);

  async function handleSaveTrip(event) {
    event.preventDefault();
    setTripNameError("");
    setTripCategoryError("");
    const name = tripNameDraft.trim();
    const categoryId = Number(tripCategoryDraft);

    let hasError = false;
    if (!name) {
      setTripNameError("Ingresa un nombre de viaje.");
      hasError = true;
    }
    if (!categoryId) {
      setTripCategoryError("Selecciona una categoría.");
      hasError = true;
    }
    if (hasError) {
      return;
    }

    try {
      await updateTravel(travelId, { nombre: name, id_categoria: categoryId });
      setIsEditTripOpen(false);
      await refreshAll();
      setStatusMessage("Viaje actualizado correctamente.");
    } catch (error) {
      setTripNameError(error.message);
    }
  }

  function canFinalize() {
    const usuarios = balance?.data?.usuarios ?? [];
    if (usuarios.length === 0) return false;
    return usuarios.every((u) => Number(u.balance_final) === 0);
  }

  async function handleFinalize() {
    setFinalizeError("");
    if (!canFinalize()) {
      setFinalizeError("No se puede finalizar: aún hay balances pendientes por saldar.");
      return;
    }
    try {
      await closeTravel(travelId);
      setIsFinalizeOpen(false);
      goTo(views.home, { flashMessage: "El viaje se ha finalizado correctamente." });
    } catch (error) {
      setFinalizeError(error.message);
    }
  }

  function formatAmountInput(value) {
    const numeric = Number(String(value).replaceAll(",", "."));
    if (!Number.isFinite(numeric)) return "";
    return String(numeric);
  }

  function getPayItems() {
    return (settlements ?? []).filter((item) => item.tipo === "pagar_a");
  }

  function getReceiveItems() {
    return (settlements ?? []).filter((item) => item.tipo === "recibir_de");
  }

  const balanceTabs = useMemo(() => ["resumen", "saldar"], []);
  const activeBalanceTabIndex = useMemo(() => {
    const index = balanceTabs.indexOf(personalBalanceSection);
    return index >= 0 ? index : 0;
  }, [balanceTabs, personalBalanceSection]);

  function setActiveBalanceTabIndex(nextIndex) {
    const safeIndex = ((nextIndex % balanceTabs.length) + balanceTabs.length) % balanceTabs.length;
    setPersonalBalanceSection(balanceTabs[safeIndex]);
    setTimeout(() => {
      const node = balanceTabRefs.current[safeIndex];
      if (node && typeof node.focus === "function") node.focus();
    }, 0);
  }

  function handleBalanceTabsKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveBalanceTabIndex(activeBalanceTabIndex - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveBalanceTabIndex(activeBalanceTabIndex + 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveBalanceTabIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveBalanceTabIndex(balanceTabs.length - 1);
      return;
    }
  }

  function getSelectedPayItem() {
    const payItems = getPayItems();
    const selectedId = Number(paymentTargetUserId);
    return payItems.find((i) => i.contraparte.id_usuario === selectedId) ?? null;
  }

  async function handleRegisterPayment(event) {
    event.preventDefault();
    setPaymentError("");
    setSettleSuccessMessage("");

    if (!currentUser) return;

    const selected = getSelectedPayItem();
    if (!selected) {
      setPaymentError("Selecciona a quién vas a pagar.");
      return;
    }

    const amount = Number(formatAmountInput(paymentAmountDraft));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Ingresa un monto válido (mayor a 0).");
      return;
    }

    const maxAmount = Number(selected.monto);
    if (Number.isFinite(maxAmount) && amount > maxAmount + 0.000001) {
      setPaymentError("El monto no puede ser mayor al monto sugerido para saldar.");
      return;
    }

    try {
      setIsPaymentSaving(true);
      await createTravelPayment(travelId, {
        id_usuario_from: currentUser.id_usuario,
        id_usuario_to: selected.contraparte.id_usuario,
        monto: amount,
      });
      setSettleSuccessMessage("Pago registrado. El balance se actualizó.");
      setStatusMessage("Balance actualizado correctamente.");
      await refreshAll();
      await refreshSettlements();
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setIsPaymentSaving(false);
    }
  }

  async function handleSettleAll() {
    setPaymentError("");
    setSettleSuccessMessage("");
    if (!currentUser) return;

    const payItems = getPayItems();
    if (payItems.length === 0) {
      setPaymentError("No hay deudas por saldar.");
      return;
    }

    try {
      setIsPaymentSaving(true);
      for (const item of payItems) {
        await createTravelPayment(travelId, {
          id_usuario_from: currentUser.id_usuario,
          id_usuario_to: item.contraparte.id_usuario,
          monto: Number(item.monto),
        });
      }
      setIsSettleAllConfirmOpen(false);
      setSettleSuccessMessage("Pagos registrados. El balance se actualizó.");
      setStatusMessage("Balance actualizado correctamente.");
      await refreshAll();
      await refreshSettlements();
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setIsPaymentSaving(false);
    }
  }


  return (
    <main className="travel-page" id="contenido-principal" tabIndex={-1} aria-labelledby="travel-title">
      <DashboardHeader
        activeView={views.home}
        currentUser={currentUser}
        goTo={goTo}
        onLogout={onLogout}
      />

      <div className="sr-only" aria-live="polite" role="status">
        {statusMessage}
      </div>

      <section className="travel-content">
        <div className="travel-hero">
          <div>
            <button className="travel-back-link" type="button" onClick={() => goTo(views.home)}>
              &larr; Volver a mis viajes
            </button>
            <h1 id="travel-title">{travel?.nombre ?? "Viaje"}</h1>
            <p className="hint-text">Resumen de balances y gastos del viaje.</p>
            {isClosed ? (
              <p className="readonly-trip-note" role="status">
                Viaje finalizado. Esta vista es solo de lectura.
              </p>
            ) : null}
          </div>

        <div className="travel-actions">
          <button className="secondary-button" type="button" onClick={refreshAll} disabled={isLoading}>
            Actualizar
          </button>
          <button
            aria-haspopup="dialog"
            aria-label="Ver mi balance personal"
            className="secondary-button"
            type="button"
            onClick={() => setIsPersonalBalanceOpen(true)}
            disabled={isLoading}
          >
            Balance
          </button>
          {canManageTravel ? (
            <>
              <button className="secondary-button" type="button" onClick={() => setIsEditTripOpen(true)}>
                Editar viaje
              </button>
              </>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="metric-grid" aria-label="Resumen del viaje">
          <article
            className="metric-card"
            aria-label={`Gastos totales: ${formatCurrency(totalGastos)}`}
          >
            <span aria-hidden="true">Gastos totales</span>
            <strong aria-hidden="true">{formatCurrency(totalGastos)}</strong>
          </article>
          <article
            className="metric-card"
            aria-label={`Balance grupal: ${formatCurrency(groupDiff)}`}
          >
            <span aria-hidden="true">Balance grupal</span>
            <strong className={balanceClass(groupDiff)} aria-hidden="true">{formatCurrency(groupDiff)}</strong>
          </article>
          <article
            className="metric-card"
            aria-label={
              Number(myBalance) > 0
                ? `Mi balance: te deben ${formatCurrency(myBalance)}`
                : Number(myBalance) < 0
                  ? `Mi balance: debes ${formatCurrency(Math.abs(Number(myBalance)))}`
                  : "Mi balance: saldado"
            }
          >
            <span aria-hidden="true">Mi balance</span>
            <strong className={balanceClass(myBalance)} aria-hidden="true">{formatCurrency(myBalance)}</strong>
          </article>
        </div>

          <section className="dashboard-panel" aria-label="Participantes del viaje">
            <div className="panel-header">
              <div>
                <div className="section-title-row">
                  <h2>Participantes</h2>
                  <span>{participantCountLabel}</span>
                </div>
                <p>Balance individual de cada participante.</p>
              </div>
              {canManageTravel ? (
                <div className="panel-header-actions">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setIsManageParticipantsOpen(true)}
                  >
                    Gestionar participantes
                  </button>
                </div>
              ) : null}
            </div>

            <div className="participant-table" aria-label="Lista de participantes con balance" aria-live="polite">
              <div className="participant-row-head no-actions" aria-hidden="true">
                <span>Usuario</span>
                <span>Balance</span>
              </div>

              {participantRows.map((row) => {
                const numericBalance = Number(row.balance_final ?? 0);
                const balanceDescription =
                  numericBalance > 0
                    ? `${row.nombre} debe recibir ${formatCurrency(numericBalance)}`
                    : numericBalance < 0
                      ? `${row.nombre} debe pagar ${formatCurrency(Math.abs(numericBalance))}`
                      : `${row.nombre} no tiene saldo pendiente`;

                return (
                <article className="participant-row-item no-actions" key={row.id_usuario}>
                  <div className="participant-identity">
                    <div className="participant-avatar" aria-hidden="true">
                      {avatarLetter(row.nombre)}
                    </div>
                    <div>
                      <strong>{row.nombre}</strong>
                      {row.correo ? <div className="muted">{row.correo}</div> : null}
                    </div>
                  </div>
                  <div className={`participant-balance ${balanceClass(row.balance_final)}`}>
                    <span aria-hidden="true">{formatCurrency(row.balance_final)}</span>
                    <span className="sr-only">{balanceDescription}</span>
                  </div>
                </article>
              );
              })}
            </div>
          </section>

          <section className="dashboard-panel travel-panel-spacing" aria-label="Gastos recientes">
            <div className="panel-header">
              <div>
                <h2>Gastos recientes</h2>
                <p>Historial organizado de gastos del viaje.</p>
              </div>
              {!isClosed ? (
                <button className="create-trip-button" type="button" onClick={() => setIsAddGastoOpen(true)}>
                  Agregar gasto
                </button>
              ) : null}
            </div>

            {gastos.length === 0 ? (
              <p className="hint-text empty-expenses-message">Aún no hay gastos registrados.</p>
            ) : (
              <ul className="expense-list" aria-label="Lista de gastos">
                {gastos
                  .slice()
                  .sort((a, b) => String(b.fecha_creacion).localeCompare(String(a.fecha_creacion)))
                  .map((gasto) => {
                    const payer = userById.get(gasto.id_usuario);
                    const cat = expenseCategoryById.get(gasto.id_categoria);
                    return (
                      <li key={gasto.id_gasto} className="expense-card">
                        <div>
                          <strong>{gasto.descripcion}</strong>
                          <div className="muted">
                            {payer?.nombre ?? `Usuario ${gasto.id_usuario}`}
                            {gasto.fecha_creacion ? ` · ${formatDate(gasto.fecha_creacion)}` : ""}
                            {cat?.nombre_categoria ? ` · ${cat.nombre_categoria}` : ""}
                          </div>
                        </div>
                        <div className="expense-amount">{formatCurrency(gasto.monto)}</div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>

        {canManageTravel ? (
          <div className="travel-footer">
            <button className="secondary-button" type="button" onClick={() => setIsFinalizeOpen(true)}>
              Finalizar viaje
            </button>
          </div>
        ) : null}
      </section>

      <ManageParticipantsModal
        isOpen={isManageParticipantsOpen}
        onClose={() => setIsManageParticipantsOpen(false)}
        travelId={travelId}
        currentUser={currentUser}
        participants={participantRows.map((p) => ({
          id_user_travel: p.id_user_travel,
          id_usuario: p.id_usuario,
          nombre: p.nombre,
          correo: p.correo,
          rol: p.rol,
        }))}
        balancesByUserId={balanceByUserId}
        adminUserId={travel?.id_usuario_creador}
        allUsers={users}
        onChanged={async () => {
          await refreshAll();
        }}
      />

      <AddExpenseModal
        isOpen={isAddGastoOpen}
        onClose={() => setIsAddGastoOpen(false)}
        travelId={travelId}
        currentUser={currentUser}
        participants={participantRows.map((p) => ({ id_usuario: p.id_usuario, nombre: p.nombre, correo: p.correo }))}
        categories={expenseCategories}
        onCategoriesChanged={(updated) => setExpenseCategories(updated)}
        onCreated={async () => {
          await refreshAll();
          setStatusMessage("Gasto creado correctamente. Balance actualizado correctamente.");
        }}
      />

      <Modal
        description="Consulta tu balance personal dentro de este viaje."
        isOpen={isPersonalBalanceOpen}
        onClose={() => setIsPersonalBalanceOpen(false)}
        title="Mi balance"
        footer={
          <button className="primary-button" type="button" onClick={() => setIsPersonalBalanceOpen(false)}>
            Cerrar
          </button>
        }
      >
        <div className="modal-form" aria-live="polite">
          <p className="hint-text">
            <strong>Viaje:</strong> {travel?.nombre ?? "—"}
            <br />
            <strong>Usuario:</strong> {currentUser?.nombre ?? "—"}
          </p>

          <div
            className="balance-modal-tabs"
            role="tablist"
            aria-label="Secciones del balance"
            onKeyDown={handleBalanceTabsKeyDown}
          >
            <button
              className={`balance-modal-tab ${personalBalanceSection === "resumen" ? "is-active" : ""}`}
              type="button"
              role="tab"
              id="balance-tab-resumen"
              aria-selected={personalBalanceSection === "resumen"}
              aria-controls="balance-panel-resumen"
              tabIndex={personalBalanceSection === "resumen" ? 0 : -1}
              onClick={() => setPersonalBalanceSection("resumen")}
              ref={(node) => {
                balanceTabRefs.current[0] = node;
              }}
            >
              Resumen
            </button>
            <button
              className={`balance-modal-tab ${personalBalanceSection === "saldar" ? "is-active" : ""}`}
              type="button"
              role="tab"
              id="balance-tab-saldar"
              aria-selected={personalBalanceSection === "saldar"}
              aria-controls="balance-panel-saldar"
              tabIndex={personalBalanceSection === "saldar" ? 0 : -1}
              onClick={() => setPersonalBalanceSection("saldar")}
              ref={(node) => {
                balanceTabRefs.current[1] = node;
              }}
            >
              Saldar
            </button>
          </div>

          {isLoading ? <p className="hint-text">Cargando balance…</p> : null}
          {isSettlementsLoading ? <p className="hint-text">Calculando a quién pagar/recibir…</p> : null}

          {settlementsError ? (
            <p className="form-error" role="alert">
              {settlementsError}
            </p>
          ) : null}

          {settleSuccessMessage ? (
            <p className="form-success" role="status">
              {settleSuccessMessage}
            </p>
          ) : null}

          {paymentError ? (
            <p className="form-error" role="alert">
              {paymentError}
            </p>
          ) : null}

          {!isLoading && balance?.data?.usuarios?.length === 0 ? (
            <p className="hint-text">Este viaje aún no tiene gastos registrados.</p>
          ) : null}

          {!isLoading && balance?.data?.usuarios?.length > 0 && !myBalanceEntry ? (
            <p className="hint-text">No hay movimientos asociados a tu usuario en este viaje.</p>
          ) : null}

          <section
            role="tabpanel"
            id="balance-panel-resumen"
            aria-labelledby="balance-tab-resumen"
            hidden={personalBalanceSection !== "resumen"}
            tabIndex={-1}
          >
            {personalBalanceSection === "resumen" ? (
              <>
              {!isLoading && myBalanceEntry ? (
                <div className="personal-balance-grid" aria-label="Resumen de balance personal">
                  <div className="personal-balance-row">
                    <span>Total que yo pagué</span>
                    <strong>{formatCurrency(myBalanceEntry.total_pagado)}</strong>
                  </div>
                  <div className="personal-balance-row">
                    <span>Total que yo debo</span>
                    <strong>{formatCurrency(myBalanceEntry.total_debido)}</strong>
                  </div>
                  <div className="personal-balance-row">
                    <span>Mi balance</span>
                    <strong className={balanceClass(myBalanceEntry.balance_final)}>
                      {formatCurrency(myBalanceEntry.balance_final)}
                    </strong>
                  </div>

                  <div className="personal-balance-status" role="status">
                    {Number(myBalanceEntry.balance_final) < 0 ? (
                      <p>
                        <strong>Debes pagar</strong> {formatCurrency(Math.abs(Number(myBalanceEntry.balance_final)))} en
                        este viaje.
                      </p>
                    ) : Number(myBalanceEntry.balance_final) > 0 ? (
                      <p>
                        <strong>Te deben</strong> {formatCurrency(Number(myBalanceEntry.balance_final))} en este viaje.
                      </p>
                    ) : (
                      <p>No tienes deudas pendientes en este viaje.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {!isSettlementsLoading ? (
                <>
                  <section className="settlement-panel" aria-label="Personas a las que debo">
                    <h3 className="settlement-title">Personas a las que debo</h3>
                    {getPayItems().length === 0 ? (
                      <p className="hint-text">No tienes pagos pendientes por realizar.</p>
                    ) : (
                      <ul className="settlement-list" aria-label="Lista de personas a las que debo">
                        {getPayItems().map((item) => (
                          <li key={`pagar_a-${item.contraparte.id_usuario}`} className="settlement-item">
                            <div>
                              <strong>{item.contraparte.nombre}</strong>
                              {item.contraparte.correo ? <div className="muted">{item.contraparte.correo}</div> : null}
                            </div>
                            <div className="settlement-amount">{formatCurrency(item.monto)}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="settlement-panel" aria-label="Personas que me deben">
                    <h3 className="settlement-title">Personas que me deben</h3>
                    {getReceiveItems().length === 0 ? (
                      <p className="hint-text">No tienes cobros pendientes por recibir.</p>
                    ) : (
                      <ul className="settlement-list" aria-label="Lista de personas que me deben">
                        {getReceiveItems().map((item) => (
                          <li key={`recibir_de-${item.contraparte.id_usuario}`} className="settlement-item">
                            <div>
                              <strong>{item.contraparte.nombre}</strong>
                              {item.contraparte.correo ? <div className="muted">{item.contraparte.correo}</div> : null}
                            </div>
                            <div className="settlement-amount">{formatCurrency(item.monto)}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}
              </>
            ) : null}
          </section>

          <section
            role="tabpanel"
            id="balance-panel-saldar"
            aria-labelledby="balance-tab-saldar"
            hidden={personalBalanceSection !== "saldar"}
            tabIndex={-1}
          >
            {personalBalanceSection === "saldar" ? (
              <>
              {!isSettlementsLoading && settlements?.length > 0 ? (
                <section className="settlement-panel" aria-label="Desglose de liquidación personal">
                  <h3 className="settlement-title">Desglose</h3>
                  <ul className="settlement-list" aria-label="Lista de pagos sugeridos">
                    {settlements.map((item) => (
                      <li key={`${item.tipo}-${item.contraparte.id_usuario}`} className="settlement-item">
                        <div>
                          <strong>
                            {item.tipo === "pagar_a" ? "Pagar a" : "Recibir de"} {item.contraparte.nombre}
                          </strong>
                          {item.contraparte.correo ? <div className="muted">{item.contraparte.correo}</div> : null}
                        </div>
                        <div className="settlement-amount">{formatCurrency(item.monto)}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!isSettlementsLoading ? (
                <section className="settlement-panel" aria-label="Registrar pago">
                  <h3 className="settlement-title">Saldar deudas</h3>
                  {getPayItems().length === 0 ? (
                    <p className="hint-text">No tienes pagos pendientes por registrar.</p>
                  ) : (
                    <>
                      <p className="hint-text">Registra un pago para que el balance se actualice automáticamente.</p>

                      <form className="settlement-form" onSubmit={handleRegisterPayment} noValidate>
                        <div className="field">
                          <label htmlFor="payment-target">¿A quién pagaste?</label>
                          <select
                            id="payment-target"
                            name="payment-target"
                            value={paymentTargetUserId}
                            required
                            aria-invalid={paymentError ? "true" : "false"}
                            onChange={(event) => {
                              setPaymentTargetUserId(event.target.value);
                              const selected = (settlements ?? []).find(
                                (i) => i.tipo === "pagar_a" && String(i.contraparte.id_usuario) === event.target.value
                              );
                              if (selected) {
                                setPaymentAmountDraft(String(selected.monto));
                              }
                            }}
                          >
                            <option value="">Selecciona un participante</option>
                            {getPayItems().map((item) => (
                              <option key={item.contraparte.id_usuario} value={item.contraparte.id_usuario}>
                                {item.contraparte.nombre} ({formatCurrency(item.monto)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <TextInput
                          error={paymentError}
                          id="payment-amount"
                          label="Monto pagado"
                          inputMode="decimal"
                          onChange={(event) => setPaymentAmountDraft(event.target.value)}
                          required
                          type="number"
                          value={paymentAmountDraft}
                        />

                        <div className="settlement-actions">
                          <button className="create-trip-button" type="submit" disabled={isPaymentSaving}>
                            Registrar pago
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => setIsSettleAllConfirmOpen(true)}
                            disabled={isPaymentSaving}
                          >
                            Registrar todos
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </section>
              ) : null}
              </>
            ) : null}
          </section>

          <p className="hint-text">
            Tip: el balance de todos se muestra en la sección Participantes.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isSettleAllConfirmOpen}
        title="Registrar todos los pagos"
        description="Se registrarán pagos por los montos sugeridos para saldar tu deuda. ¿Deseas continuar?"
        confirmLabel="Sí, registrar"
        cancelLabel="Cancelar"
        onCancel={() => setIsSettleAllConfirmOpen(false)}
        onConfirm={handleSettleAll}
        isLoading={isPaymentSaving}
        tone="primary"
      />

      <Modal
        description="Actualiza el nombre y la categoría del viaje."
        isOpen={isEditTripOpen}
        onClose={() => setIsEditTripOpen(false)}
        title="Editar viaje"
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setIsEditTripOpen(false)}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" form="edit-trip-form">
              Guardar
            </button>
          </>
        }
      >
        <form className="modal-form" id="edit-trip-form" onSubmit={handleSaveTrip} noValidate>
          <TextInput
            autoFocus
            error={tripNameError}
            id="edit-trip-name"
            label="Asunto del viaje"
            onChange={(event) => setTripNameDraft(event.target.value)}
            required
            value={tripNameDraft}
          />
          <div className="field">
            <label htmlFor="edit-trip-category">Categoría del viaje</label>
            <div className="category-picker-row">
              <select
                aria-describedby={tripCategoryError ? "edit-trip-category-error" : undefined}
                aria-invalid={tripCategoryError ? "true" : "false"}
                id="edit-trip-category"
                name="edit-trip-category"
                onChange={(event) => setTripCategoryDraft(event.target.value)}
                required
                value={tripCategoryDraft}
              >
                <option value="">Selecciona una categoría</option>
                {travelCategories.map((category) => (
                  <option key={category.id_categoria} value={category.id_categoria}>
                    {category.nombre_categoria}
                  </option>
                ))}
              </select>
              <button
                aria-haspopup="dialog"
                className="primary-button"
                type="button"
                onClick={() => setIsTravelCategoriesOpen(true)}
              >
                Agregar
              </button>
            </div>
            {tripCategoryError ? (
              <p className="field-error" id="edit-trip-category-error" role="alert">
                {tripCategoryError}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        description="Para finalizar, todos los balances deben estar saldados (en cero)."
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        title="Finalizar viaje"
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setIsFinalizeOpen(false)}>
              Cancelar
            </button>
            <button className="create-trip-button" type="button" onClick={handleFinalize}>
              Finalizar
            </button>
          </>
        }
      >
        <div className="modal-form">
          {finalizeError ? (
            <p className="form-error" role="alert">
              {finalizeError}
            </p>
          ) : null}
          <p className="hint-text">
            Estado actual: {canFinalize() ? "Todo saldado." : "Hay saldos pendientes."}
          </p>
        </div>
      </Modal>

      <ManageTravelCategoriesModal
        currentUser={currentUser}
        isOpen={isTravelCategoriesOpen}
        onClose={() => setIsTravelCategoriesOpen(false)}
        onChanged={async () => {
          try {
            await reloadTravelCategories();
          } catch (error) {
            setTripCategoryError(error.message);
          }
        }}
      />
    </main>
  );
}
