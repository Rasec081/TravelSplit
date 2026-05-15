import { HomeIcon } from "./icons/HomeIcon";
import { UserIcon } from "./icons/UserIcon";
import { views } from "../routes/views";

export function DashboardHeader({ activeView, currentUser, goTo, onLogout }) {
  return (
    <header className="home-header">
      <div className="home-header-inner">
        <div className="app-brand">
          <span aria-hidden="true">TS</span>
          <strong>TravelSplit</strong>
        </div>
        <nav aria-label="Principal" className="home-nav">
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
          <button className="my-trips-button" type="button" onClick={() => goTo(views.profile)}>
            {currentUser?.nombre ?? "Mi cuenta"}
          </button>
          <button className="logout-button" type="button" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </header>
  );
}
