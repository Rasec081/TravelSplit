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
  const [travelStatusFilter, setTravelStatusFilter] = useState("all");
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
  const travelStatusCounts = useMemo(() => {
    return travels.reduce(
      (counts, travel) => {
        if (isTravelClosed(travel)) {
          return { ...counts, closed: counts.closed + 1 };
        }

        return { ...counts, active: counts.active + 1 };
      },
      { all: travels.length, active: 0, closed: 0 },
    );
  }, [travels]);
  const filteredTravels = useMemo(() => {
    if (travelStatusFilter === "closed") {
      return travels.filter((travel) => isTravelClosed(travel));
    }

    if (travelStatusFilter === "active") {
      return travels.filter((travel) => !isTravelClosed(travel));
    }

    return travels;
  }, [travels, travelStatusFilter]);

  async function refreshTravels() {
    setIsLoading(true);
    setLoadError("");

    try {
      const [response, categoryResponse] = await Promise.all([
        listTravelsByUser(currentUser.id_usuario),
        listTravelCategories(currentUser.id_usuario),
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
    <main className="home-page" id="contenido-principal" tabIndex={-1} aria-labelledby="home-title">
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
            <h1 id="home-title">Viajes y gastos compartidos</h1>
            <p>
              Supervisa tus viajes, participantes y próximas acciones desde una vista clara y
              ordenada.
            </p>
          </div>
        </div>

        <div className="metric-grid" aria-label="Resumen de viajes">
          <article
            className="metric-card"
            aria-label={`Viajes registrados: ${travels.length}`}
          >
            <span aria-hidden="true">Viajes registrados</span>
            <strong aria-hidden="true">{travels.length}</strong>
          </article>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Mis viajes</h2>
              <p>Listado de viajes disponibles para seguimiento y colaboración.</p>
            </div>
            <div className="panel-header-actions" aria-label="Acciones de viajes">
              <button className="create-trip-button" type="button" onClick={() => setIsModalOpen(true)}>
                <span aria-hidden="true">+</span>
                Crear viaje
              </button>
            </div>
          </div>

          <div className="trip-filter-bar" role="group" aria-label="Filtrar viajes por estado">
            <button
              className={travelStatusFilter === "all" ? "active" : ""}
              type="button"
              aria-pressed={travelStatusFilter === "all"}
              onClick={() => setTravelStatusFilter("all")}
            >
              Todos
              <span>{travelStatusCounts.all}</span>
            </button>
            <button
              className={travelStatusFilter === "active" ? "active" : ""}
              type="button"
              aria-pressed={travelStatusFilter === "active"}
              onClick={() => setTravelStatusFilter("active")}
            >
              Iniciados
              <span>{travelStatusCounts.active}</span>
            </button>
            <button
              className={travelStatusFilter === "closed" ? "active" : ""}
              type="button"
              aria-pressed={travelStatusFilter === "closed"}
              onClick={() => setTravelStatusFilter("closed")}
            >
              Finalizados
              <span>{travelStatusCounts.closed}</span>
            </button>
          </div>

          <section className="trip-table" aria-label="Lista de viajes" aria-busy={isLoading ? "true" : "false"}>
            <div className="trip-table-row trip-table-head" aria-hidden="true">
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

            {!isLoading && !loadError && filteredTravels.length === 0 ? (
              <p className="hint-text empty-trips-message" role="status">
                No hay viajes para el filtro seleccionado.
              </p>
            ) : null}

            {filteredTravels.map((travel, index) => {
              const isClosed = isTravelClosed(travel);
              const status = statusByTravelId[travel.id_travel] ?? "Iniciado";
              const participantCount = participantCounts[travel.id_travel] ?? 0;
              const categoryName = categoryById.get(travel.id_categoria)?.nombre_categoria ?? "Sin categoria";
              const createdDate = formatDate(travel.fecha_creacion) || "Sin fecha";
              const visual = tripVisualFor(index);

              return (
                <button
                  key={travel.id_travel}
                  className={`trip-card trip-row-button ${isClosed ? "trip-row-closed" : ""}`}
                  type="button"
                  onClick={() => goTo(views.travel, { travelId: travel.id_travel })}
                  aria-label={`Viaje ${travel.nombre}, categoria ${categoryName}, ${participantCount} participantes, estado ${status}. Ver detalles.`}
                >
                  <div className="trip-card-main">
                    <strong className="trip-row-name">{travel.nombre}</strong>
                    <span className="trip-category-line">
                      {categoryName}
                    </span>
                    <span className="trip-card-details">
                      <span>{participantCount} {participantCount === 1 ? "participante" : "participantes"}</span>
                      <span aria-hidden="true">•</span>
                      <span>Creado el {createdDate}</span>
                    </span>
                  </div>
                  <div className="trip-card-actions">
                    <span className={`status-badge ${isClosed ? "status-badge-closed" : ""}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        </div>
      </section>

      <CreateTripModal
        currentUser={currentUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => refreshTravels()}
      />

      <ManageTravelCategoriesModal
        currentUser={currentUser}
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

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CR", { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function tripVisualFor(index) {
  return ["palm", "beach", "backpack"][index % 3];
}

