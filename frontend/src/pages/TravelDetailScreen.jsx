import { useEffect, useMemo, useState } from "react";

import { DashboardHeader } from "../components/DashboardHeader";
import { Modal } from "../components/modals/Modal";
import { TextInput } from "../components/forms/TextInput";
import { AddExpenseModal } from "../components/modals/AddExpenseModal";
import { ManageParticipantsModal } from "../components/modals/ManageParticipantsModal";
import { ManageTravelCategoriesModal } from "../components/modals/ManageTravelCategoriesModal";
import { views } from "../routes/views";
import { listUsers } from "../services/userService";
import { listUsersByTravel } from "../services/userTravelService";
import { getTravel, getTravelBalance, updateTravel, closeTravel } from "../services/travelService";
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

  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [tripNameDraft, setTripNameDraft] = useState("");
  const [tripCategoryDraft, setTripCategoryDraft] = useState("");
  const [tripNameError, setTripNameError] = useState("");
  const [tripCategoryError, setTripCategoryError] = useState("");

  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);

  const isAdmin = useMemo(() => {
    if (!travel || !currentUser) return false;
    return travel.id_usuario_creador === currentUser.id_usuario;
  }, [travel, currentUser]);
  const isClosed = useMemo(() => isTravelClosed(travel), [travel]);
  const canEditTravel = isAdmin && !isClosed;

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
        listExpenseCategories(),
        listTravelCategories(),
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

  async function reloadTravelCategories() {
    const response = await listTravelCategories();
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


  return (
    <main className="travel-page" aria-labelledby="travel-title">
      <DashboardHeader
        activeView={views.home}
        currentUser={currentUser}
        goTo={goTo}
        onLogout={onLogout}
      />

      <section className="travel-content">
        <div className="travel-hero">
          <div>
            <button className="back-link" type="button" onClick={() => goTo(views.home)}>
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
            className="secondary-button"
            type="button"
            onClick={() => setIsPersonalBalanceOpen(true)}
            disabled={isLoading}
          >
            Balance
          </button>
          {canEditTravel ? (
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
          <article className="metric-card">
            <span>Gastos totales</span>
            <strong>{formatCurrency(totalGastos)}</strong>
          </article>
          <article className="metric-card">
            <span>Balance grupal</span>
            <strong className={balanceClass(groupDiff)}>{formatCurrency(groupDiff)}</strong>
          </article>
          <article className="metric-card">
            <span>Mi balance</span>
            <strong className={balanceClass(myBalance)}>{formatCurrency(myBalance)}</strong>
          </article>
        </div>

          <section className="dashboard-panel" aria-label="Participantes del viaje">
            <div className="panel-header">
              <div>
                <h2>Participantes</h2>
                <p>{isAdmin ? "Balance individual de cada participante." : "Integrantes del viaje."}</p>
              </div>
              {canEditTravel ? (
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

            {isAdmin ? (
              <div className="participant-table" role="table" aria-label="Tabla de participantes con balance">
                <div className="participant-row-head no-actions" role="row">
                  <span role="columnheader">Usuario</span>
                  <span role="columnheader">Balance</span>
                </div>

                {participantRows.map((row) => (
                  <div className="participant-row-item no-actions" role="row" key={row.id_usuario}>
                    <div role="cell">
                      <strong>{row.nombre}</strong>
                      {row.correo ? <div className="muted">{row.correo}</div> : null}
                    </div>
                    <div role="cell" className={`participant-balance ${balanceClass(row.balance_final)}`}>
                      {formatCurrency(row.balance_final)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="participant-list" aria-label="Lista de participantes">
                {participantRows.map((row) => (
                  <li key={row.id_usuario} className="participant-list-item">
                    <strong>{row.nombre}</strong>
                    {row.correo ? <div className="muted">{row.correo}</div> : null}
                  </li>
                ))}
              </ul>
            )}
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

        {canEditTravel ? (
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

          {isLoading ? <p className="hint-text">Cargando balance…</p> : null}

          {!isLoading && balance?.data?.usuarios?.length === 0 ? (
            <p className="hint-text">Este viaje aún no tiene gastos registrados.</p>
          ) : null}

          {!isLoading && balance?.data?.usuarios?.length > 0 && !myBalanceEntry ? (
            <p className="hint-text">No hay movimientos asociados a tu usuario en este viaje.</p>
          ) : null}

          {!isLoading && myBalanceEntry ? (
            <div className="personal-balance-grid" aria-label="Desglose de balance personal">
              <div className="personal-balance-row">
                <span>Total pagado</span>
                <strong>{formatCurrency(myBalanceEntry.total_pagado)}</strong>
              </div>
              <div className="personal-balance-row">
                <span>Total que me corresponde</span>
                <strong>{formatCurrency(myBalanceEntry.total_debido)}</strong>
              </div>
              <div className="personal-balance-row">
                <span>Balance final</span>
                <strong className={balanceClass(myBalanceEntry.balance_final)}>
                  {formatCurrency(myBalanceEntry.balance_final)}
                </strong>
              </div>

              <div className="personal-balance-status" role="status">
                {Number(myBalanceEntry.balance_final) < 0 ? (
                  <p>
                    <strong>Debes pagar</strong> {formatCurrency(Math.abs(Number(myBalanceEntry.balance_final)))} en este
                    viaje.
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

          <p className="hint-text">
            Nota: por privacidad, aquí solo se muestra tu balance. Para ver el balance completo del grupo se requiere una
            vista administrativa.
          </p>
        </div>
      </Modal>

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

