import { HomeIcon } from "./icons/HomeIcon";
import { UserIcon } from "./icons/UserIcon";
import { views } from "../routes/views";

export function DashboardHeader({ activeView, currentUser, goTo, onLogout }) {
  return (
    <header className="home-header">
      <div className="home-header-inner">
        <button
          className="app-brand app-brand-button"
          type="button"
          onClick={() => goTo(views.home)}
          aria-label="Ir a la pantalla principal de TravelSplit"
        >
          <span aria-hidden="true">TS</span>
          <strong>TravelSplit</strong>
        </button>
        <nav aria-label="Navegación principal" className="home-nav">
          <button
            className={`home-nav-link ${activeView === views.home ? "active" : ""}`}
            type="button"
            aria-current={activeView === views.home ? "page" : undefined}
            onClick={() => goTo(views.home)}
          >
            <HomeIcon />
            <span>Inicio</span>
          </button>
          <button
            className={`home-nav-link ${activeView === views.profile ? "active" : ""}`}
            type="button"
            aria-current={activeView === views.profile ? "page" : undefined}
            onClick={() => goTo(views.profile)}
          >
            <UserIcon />
            <span>Perfil</span>
          </button>
        </nav>
        <div className="home-actions">
          <button
            className="my-trips-button"
            type="button"
            onClick={() => goTo(views.profile)}
            aria-label={`${currentUser?.nombre ?? "Mi cuenta"} — ir a perfil`}
          >
            {currentUser?.nombre ?? "Mi cuenta"}
          </button>
          <button className="logout-button" type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
