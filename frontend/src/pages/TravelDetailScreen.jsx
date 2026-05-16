import { useEffect, useMemo, useState } from "react";

import { DashboardHeader } from "../components/DashboardHeader";
import { Modal } from "../components/modals/Modal";
import { TextInput } from "../components/forms/TextInput";
import { AddExpenseModal } from "../components/modals/AddExpenseModal";
import { views } from "../routes/views";
import { listUsers } from "../services/userService";
import { addUserToTravel, deleteUserTravel, listUsersByTravel } from "../services/userTravelService";
import { getTravel, getTravelBalance, updateTravel, closeTravel } from "../services/travelService";
import { listGastosByTravel } from "../services/gastoService";
import { listExpenseCategories } from "../services/categoriesService";

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

export function TravelDetailScreen({ currentUser, goTo, onLogout, travelId }) {
  const [travel, setTravel] = useState(null);
  const [balance, setBalance] = useState(null);
  const [userTravels, setUserTravels] = useState([]);
  const [users, setUsers] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantError, setParticipantError] = useState("");

  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [tripNameDraft, setTripNameDraft] = useState("");
  const [tripNameError, setTripNameError] = useState("");

  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);

  const isAdmin = useMemo(() => {
    if (!travel || !currentUser) return false;
    return travel.id_usuario_creador === currentUser.id_usuario;
  }, [travel, currentUser]);

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
      setErrorMessage("No se encontro el viaje seleccionado.");
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
      ] = await Promise.all([
        getTravel(travelId),
        getTravelBalance(travelId),
        listUsersByTravel(travelId),
        listUsers(),
        listGastosByTravel(travelId),
        listExpenseCategories(),
      ]);

      setTravel(travelResponse ?? null);
      setBalance(balanceResponse ?? null);
      setUserTravels(userTravelsResponse ?? []);
      setUsers(usersResponse ?? []);
      setGastos(gastosResponse ?? []);
      setExpenseCategories(expenseCategoriesResponse ?? []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, [travelId]);

  useEffect(() => {
    setTripNameDraft(travel?.nombre ?? "");
  }, [travel]);

  async function handleAddParticipant(event) {
    event.preventDefault();
    setParticipantError("");

    const normalized = participantEmail.trim().toLowerCase();
    if (!normalized) {
      setParticipantError("Ingresa el correo del participante.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setParticipantError("Ingresa un correo valido.");
      return;
    }

    const emailToUserId = new Map((users ?? []).map((user) => [String(user.correo).toLowerCase(), user.id_usuario]));
    const userId = emailToUserId.get(normalized);
    if (!userId) {
      setParticipantError("No se encontro un usuario con ese correo.");
      return;
    }
    if (userId === currentUser.id_usuario) {
      setParticipantError("Ese usuario ya participa (sos vos).");
      return;
    }

    try {
      await addUserToTravel({ id_viaje: travelId, id_usuario: userId });
      setParticipantEmail("");
      setIsAddParticipantOpen(false);
      await refreshAll();
    } catch (error) {
      setParticipantError(error.message);
    }
  }

  async function handleRemoveParticipant(row) {
    const confirmDelete = window.confirm(
      `Eliminar a ${row.nombre} del viaje? Esta accion no se puede deshacer.`,
    );
    if (!confirmDelete) return;

    try {
      await deleteUserTravel(row.id_user_travel);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleSaveTripName(event) {
    event.preventDefault();
    setTripNameError("");
    const name = tripNameDraft.trim();
    if (!name) {
      setTripNameError("Ingresa un nombre de viaje.");
      return;
    }
    try {
      await updateTravel(travelId, { nombre: name });
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
      setFinalizeError("No se puede finalizar: aun hay balances pendientes por saldar.");
      return;
    }
    try {
      await closeTravel(travelId);
      setIsFinalizeOpen(false);
      await refreshAll();
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
          </div>

          <div className="travel-actions">
            <button className="secondary-button" type="button" onClick={refreshAll} disabled={isLoading}>
              Actualizar
            </button>
            {isAdmin ? (
              <>
                <button className="secondary-button" type="button" onClick={() => setIsEditTripOpen(true)}>
                  Editar nombre
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
                <p>Balance individual de cada participante.</p>
              </div>
              {isAdmin ? (
                <div className="panel-header-actions">
                  <button className="primary-button" type="button" onClick={() => setIsAddParticipantOpen(true)}>
                    Anadir participante
                  </button>
                </div>
              ) : null}
            </div>

            <div className="participant-table" role="table" aria-label="Tabla de participantes">
              <div className={`participant-row-head ${isAdmin ? "" : "no-actions"}`} role="row">
                <span role="columnheader">Usuario</span>
                <span role="columnheader">Balance</span>
                {isAdmin ? <span role="columnheader">Administrar participante</span> : null}
              </div>

              {participantRows.map((row) => (
                <div
                  className={`participant-row-item ${isAdmin ? "" : "no-actions"}`}
                  role="row"
                  key={row.id_usuario}
                >
                  <div role="cell">
                    <strong>{row.nombre}</strong>
                    {row.correo ? <div className="muted">{row.correo}</div> : null}
                  </div>
                  <div role="cell" className={`participant-balance ${balanceClass(row.balance_final)}`}>
                    {formatCurrency(row.balance_final)}
                  </div>
                  {isAdmin ? (
                    <div role="cell">
                      {row.id_usuario === travel?.id_usuario_creador ? (
                        <span className="muted">Admin</span>
                      ) : (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleRemoveParticipant(row)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-panel travel-panel-spacing" aria-label="Gastos recientes">
            <div className="panel-header">
              <div>
                <h2>Gastos recientes</h2>
                <p>Historial organizado de gastos del viaje.</p>
              </div>
              <button className="create-trip-button" type="button" onClick={() => setIsAddGastoOpen(true)}>
                Agregar gasto
              </button>
            </div>

            {gastos.length === 0 ? (
              <p className="hint-text">Aun no hay gastos registrados.</p>
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

        {isAdmin ? (
          <div className="travel-footer">
            <button className="secondary-button" type="button" onClick={() => setIsFinalizeOpen(true)}>
              Finalizar viaje
            </button>
          </div>
        ) : null}
      </section>

      <Modal
        description="Ingresa el correo del usuario a agregar como participante."
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
        title="Anadir participante"
        footer={
          <>
            <button className="secondary-button" type="button" onClick={() => setIsAddParticipantOpen(false)}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" form="add-participant-form">
              Agregar
            </button>
          </>
        }
      >
        <form className="modal-form" id="add-participant-form" onSubmit={handleAddParticipant} noValidate>
          <TextInput
            autoFocus
            error={participantError}
            id="add-participant-email"
            label="Correo del participante"
            onChange={(event) => setParticipantEmail(event.target.value)}
            placeholder="participante@correo.com"
            type="email"
            value={participantEmail}
          />
        </form>
      </Modal>

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
        description="Actualiza el nombre del viaje."
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
        <form className="modal-form" id="edit-trip-form" onSubmit={handleSaveTripName} noValidate>
          <TextInput
            autoFocus
            error={tripNameError}
            id="edit-trip-name"
            label="Nombre del viaje"
            onChange={(event) => setTripNameDraft(event.target.value)}
            value={tripNameDraft}
          />
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
    </main>
  );
}
