import { useCallback, useEffect, useState } from "react";
import { CreateTripModal } from "../components/CreateTripModal";
import { DashboardHeader } from "../components/DashboardHeader";
import { views } from "../routes/views";
import { getTravels } from "../services/tripService";

export function HomeScreen({ currentUser, goTo, onLogout }) {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchTravels = useCallback(async () => {
    try {
      setIsLoading(true);
      const travels = await getTravels();
      setTrips(travels);
    } catch {
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTravels();
  }, [fetchTravels]);

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
            onClick={() => setShowModal(true)}
            aria-haspopup="dialog"
          >
            <span aria-hidden="true">+</span>
            Crear viaje
          </button>
        </div>

        <div className="metric-grid" aria-label="Resumen de viajes">
          <article className="metric-card">
            <span>Viajes registrados</span>
            <strong>{trips.length}</strong>
          </article>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Mis viajes</h2>
              <p>Listado de viajes disponibles para seguimiento y colaboracion.</p>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: "20px", textAlign: "center" }} role="status" aria-live="polite">
              <p>Cargando viajes...</p>
            </div>
          ) : trips.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center" }} role="status" aria-live="polite">
              <p>No hay viajes registrados</p>
            </div>
          ) : (
            <div className="trip-table" aria-label="Lista de viajes">
              <div className="trip-table-row trip-table-head">
                <span>Viaje</span>
                <span>Participantes</span>
                <span>Estado</span>
                <span>Accion</span>
              </div>
              {trips.map((trip) => (
                <article className="trip-table-row" key={trip.id_travel || trip.id}>
                  <div>
                    <h3>{trip.nombre}</h3>
                    <p>Gestion colaborativa de gastos</p>
                  </div>
                  <span>{trip.participants || "-"}</span>
                  <span className="status-badge">{trip.status || "Activo"}</span>
                  <button className="secondary-button" type="button">
                    Ver detalles
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <CreateTripModal
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onTripCreated={fetchTravels}
        />
      )}
    </main>
  );
}
