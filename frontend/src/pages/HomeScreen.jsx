import { DashboardHeader } from "../components/DashboardHeader";
import { trips } from "../constants/trips";
import { views } from "../routes/views";

export function HomeScreen({ currentUser, goTo, onLogout }) {
  const totalParticipants = trips.reduce((total, trip) => total + trip.participants, 0);

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
          <button className="create-trip-button" type="button">
            <span aria-hidden="true">+</span>
            Crear viaje
          </button>
        </div>

        <div className="metric-grid" aria-label="Resumen de viajes">
          <article className="metric-card">
            <span>Viajes registrados</span>
            <strong>{trips.length}</strong>
          </article>
          <article className="metric-card">
            <span>Participantes</span>
            <strong>{totalParticipants}</strong>
          </article>
          <article className="metric-card">
            <span>Estados activos</span>
            <strong>{trips.filter((trip) => trip.status !== "Cerrado").length}</strong>
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
            {trips.map((trip) => (
              <article className="trip-table-row" key={trip.id}>
                <div>
                  <h3>{trip.name}</h3>
                  <p>Gestion colaborativa de gastos</p>
                </div>
                <span>{trip.participants}</span>
                <span className="status-badge">{trip.status}</span>
                <button className="secondary-button" type="button">
                  Ver detalles
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
