import { useEffect, useMemo, useState } from "react";

import { useStoredUser } from "./hooks/useStoredUser";
import { HomeScreen } from "./pages/HomeScreen";
import { LoginScreen } from "./pages/LoginScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { RegisterScreen } from "./pages/RegisterScreen";
import { ResetPasswordConfirmScreen } from "./pages/ResetPasswordConfirmScreen";
import { ResetPasswordScreen } from "./pages/ResetPasswordScreen";
import { TravelDetailScreen } from "./pages/TravelDetailScreen";
import { views } from "./routes/views";

export default function App() {
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  const [currentView, setCurrentView] = useState(resetToken ? views.resetConfirm : views.login);
  const [activeTravelId, setActiveTravelId] = useState(null);
  const [viewOptions, setViewOptions] = useState({});
  const { clearUser, currentUser, saveUser } = useStoredUser();

  const pageTitle = useMemo(() => {
    if (currentView === views.register) return "TravelSplit - Crear cuenta";
    if (currentView === views.reset) return "TravelSplit - Recuperar acceso";
    if (currentView === views.resetConfirm) return "TravelSplit - Nueva contraseña";
    if (currentView === views.home) return "TravelSplit - Mis viajes";
    if (currentView === views.profile) return "TravelSplit - Perfil";
    if (currentView === views.travel) return "TravelSplit - Detalle del viaje";
    return "TravelSplit - Iniciar sesión";
  }, [currentView]);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  function renderView() {
    if (currentView === views.register) {
      return <RegisterScreen goTo={goTo} onLogin={saveUser} />;
    }

    if (currentView === views.reset) {
      return <ResetPasswordScreen goTo={goTo} />;
    }

    if (currentView === views.resetConfirm) {
      return <ResetPasswordConfirmScreen goTo={goTo} token={resetToken} />;
    }

    if (currentView === views.home) {
      if (!currentUser) {
        return <LoginScreen goTo={goTo} onLogin={saveUser} />;
      }

      return (
        <HomeScreen
          currentUser={currentUser}
          flashMessage={viewOptions.flashMessage}
          goTo={goTo}
          onLogout={handleLogout}
        />
      );
    }

    if (currentView === views.profile) {
      if (!currentUser) {
        return <LoginScreen goTo={goTo} onLogin={saveUser} />;
      }

      return (
        <ProfileScreen
          currentUser={currentUser}
          goTo={goTo}
          onLogout={handleLogout}
          onUserUpdate={saveUser}
        />
      );
    }

    if (currentView === views.travel) {
      if (!currentUser) {
        return <LoginScreen goTo={goTo} onLogin={saveUser} />;
      }

      return (
        <TravelDetailScreen
          currentUser={currentUser}
          goTo={goTo}
          onLogout={handleLogout}
          travelId={activeTravelId}
        />
      );
    }

    return <LoginScreen goTo={goTo} onLogin={saveUser} />;
  }

  function goTo(nextView, options = {}) {
    setCurrentView(nextView);
    setViewOptions(options);
    if (Object.prototype.hasOwnProperty.call(options, "travelId")) {
      setActiveTravelId(options.travelId);
    }
  }

  function handleLogout() {
    clearUser();
    setCurrentView(views.login);
  }

  return renderView();
}
