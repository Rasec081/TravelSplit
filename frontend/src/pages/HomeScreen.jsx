import { useEffect, useMemo, useState } from "react";

import { DashboardHeader } from "../components/DashboardHeader";
import { CreateTripModal } from "../components/modals/CreateTripModal";
import { ManageTravelCategoriesModal } from "../components/modals/ManageTravelCategoriesModal";
import { views } from "../routes/views";
import { listTravelCategories } from "../services/categoriesService";
import { listTravelsByUser } from "../services/travelService";
import { listUsersByTravel } from "../services/userTravelService";

export function HomeScreen({ currentUser, flashMessage, goTo, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [travels, setTravels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [participantCounts, setParticipantCounts] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const statusByTravelId = useMemo(() => {
    const map = {};
    for (const travel of travels) {
      map[travel.id_travel] = isTravelClosed(travel) ? "Finalizado" : "Iniciado";
    }
    return map;
  }, [travels]);
  const categoryById = useMemo(() => {
    return new Map((categories ?? []).map((category) => [category.id_categoria, category]));
  }, [categories]);

  async function refreshTravels() {
    setIsLoading(true);
    setLoadError("");

    try {
      const [response, categoryResponse] = await Promise.all([
        listTravelsByUser(currentUser.id_usuario),
        listTravelCategories(),
      ]);
      const nextTravels = response ?? [];
      setTravels(nextTravels);
      setCategories(categoryResponse ?? []);

      const counts = await Promise.all(
        nextTravels.map(async (travel) => {
          try {
            const participants = await listUsersByTravel(travel.id_travel);
            return [travel.id_travel, Array.isArray(participants) ? participants.length : 0];
          } catch {
            return [travel.id_travel, 0];
          }
        }),
      );

      setParticipantCounts(Object.fromEntries(counts));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshTravels();
  }, []);

  useEffect(() => {
    if (!flashMessage) return undefined;

    setToastMessage(flashMessage);
    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  return (
    <main className="home-page" aria-labelledby="home-title">
      {toastMessage ? (
        <div className="toast-message" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}

      <DashboardHeader
        activeView={views.home}
        currentUser={currentUser}
        goTo={goTo}
        onLogout={onLogout}
      />

      <section className="home-content">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">Panel de gestión</p>
            <h1 id="home-title">Viajes y gastos compartidos</h1>
            <p>
              Supervisa tus viajes, participantes y próximas acciones desde una vista clara y
              ordenada.
            </p>
          </div>
        </div>

        <div className="metric-grid" aria-label="Resumen de viajes">
          <article className="metric-card">
            <span>Viajes registrados</span>
            <strong>{travels.length}</strong>
          </article>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Mis viajes</h2>
              <p>Listado de viajes disponibles para seguimiento y colaboración.</p>
            </div>
            <div className="panel-header-actions" aria-label="Acciones de viajes">
              <button className="secondary-button" type="button" onClick={() => setIsCategoriesOpen(true)}>
                Administrar categorías
              </button>
              <button className="create-trip-button" type="button" onClick={() => setIsModalOpen(true)}>
                <span aria-hidden="true">+</span>
                Crear viaje
              </button>
            </div>
          </div>

          <div className="trip-table" aria-label="Lista de viajes">
            <div className="trip-table-row trip-table-head">
              <span>Viaje</span>
              <span>Participantes</span>
              <span>Estado</span>
            </div>
            {isLoading ? (
              <p className="hint-text" role="status" aria-live="polite">
                Cargando viajes...
              </p>
            ) : null}

            {loadError ? (
              <p className="form-error" role="alert">
                {loadError}
              </p>
            ) : null}

            {travels.map((travel) => {
              const isClosed = isTravelClosed(travel);
              const status = statusByTravelId[travel.id_travel] ?? "Iniciado";

              return (
                <button
                  key={travel.id_travel}
                  className={`trip-table-row trip-row-button ${isClosed ? "trip-row-closed" : ""}`}
                  type="button"
                  onClick={() => goTo(views.travel, { travelId: travel.id_travel })}
                  aria-label={`Viaje ${travel.nombre}, ${participantCounts[travel.id_travel] ?? 0} participantes, estado ${status}. Presione Enter para abrir.`}
                >
                  <div>
                    <h3>{travel.nombre}</h3>
                    <p>{categoryById.get(travel.id_categoria)?.nombre_categoria ?? "Sin categoría"}</p>
                  </div>
                  <span>{participantCounts[travel.id_travel] ?? 0}</span>
                  <span className={`status-badge ${isClosed ? "status-badge-closed" : ""}`}>
                    {status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <CreateTripModal
        currentUser={currentUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => refreshTravels()}
      />

      <ManageTravelCategoriesModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        onChanged={() => refreshTravels()}
      />
    </main>
  );
}

function isTravelClosed(travel) {
  if (!travel?.fecha_cierre) return false;

  const createdAt = new Date(travel.fecha_creacion).getTime();
  const closedAt = new Date(travel.fecha_cierre).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(closedAt)) return true;

  return closedAt - createdAt > 5000;
}
