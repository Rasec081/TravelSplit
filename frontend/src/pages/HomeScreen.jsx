import { useEffect, useMemo, useState } from "react";

import { DashboardHeader } from "../components/DashboardHeader";
import { CreateTripModal } from "../components/modals/CreateTripModal";
import { ManageTravelCategoriesModal } from "../components/modals/ManageTravelCategoriesModal";
import { views } from "../routes/views";
import { listTravels } from "../services/travelService";
import { listUsersByTravel } from "../services/userTravelService";

export function HomeScreen({ currentUser, goTo, onLogout }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [travels, setTravels] = useState([]);
  const [participantCounts, setParticipantCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const totalParticipants = useMemo(
    () =>
      Object.values(participantCounts).reduce((total, count) => total + (Number(count) || 0), 0),
    [participantCounts],
  );

  async function refreshTravels() {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await listTravels();
      const nextTravels = response ?? [];
      setTravels(nextTravels);

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

  function getStatus(travel) {
    if (travel?.fecha_cierre) return "Cerrado";
    return "Activo";
  }

  return (
    <main className="home-page" aria-labelledby="home-title">
      <DashboardHeader
        activeView={views.home}
        currentUser={currentUser}
        goTo={goTo}
        onLogout={onLogout}
      />

      <section className="home-content">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">Panel de gestion</p>
            <h1 id="home-title">Viajes y gastos compartidos</h1>
            <p>
              Supervisa tus viajes, participantes y proximas acciones desde una vista clara y
              ordenada.
            </p>
          </div>
          <button
            className="create-trip-button"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            <span aria-hidden="true">+</span>
            Crear viaje
          </button>
          <button className="secondary-button" type="button" onClick={() => setIsCategoriesOpen(true)}>
            Administrar categorias
          </button>
        </div>

        <div className="metric-grid" aria-label="Resumen de viajes">
          <article className="metric-card">
            <span>Viajes registrados</span>
            <strong>{travels.length}</strong>
          </article>
          <article className="metric-card">
            <span>Participantes</span>
            <strong>{totalParticipants}</strong>
          </article>
          <article className="metric-card">
            <span>Estados activos</span>
            <strong>{travels.filter((travel) => !travel.fecha_cierre).length}</strong>
          </article>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Mis viajes</h2>
              <p>Listado de viajes disponibles para seguimiento y colaboracion.</p>
            </div>
          </div>

          <div className="trip-table" aria-label="Lista de viajes">
            <div className="trip-table-row trip-table-head">
              <span>Viaje</span>
              <span>Participantes</span>
              <span>Estado</span>
              <span>Accion</span>
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

            {travels.map((travel) => (
              <article className="trip-table-row" key={travel.id_travel}>
                <div>
                  <h3>{travel.nombre}</h3>
                  <p>Gestion colaborativa de gastos</p>
                </div>
                <span>{participantCounts[travel.id_travel] ?? 0}</span>
                <span className="status-badge">{getStatus(travel)}</span>
                <button className="secondary-button" type="button">
                  Ver detalles
                </button>
              </article>
            ))}
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
        onChanged={() => {}}
      />
    </main>
  );
}
