import { useState } from "react";

import { useStoredUser } from "./hooks/useStoredUser";
import { HomeScreen } from "./pages/HomeScreen";
import { LoginScreen } from "./pages/LoginScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { RegisterScreen } from "./pages/RegisterScreen";
import { ResetPasswordConfirmScreen } from "./pages/ResetPasswordConfirmScreen";
import { ResetPasswordScreen } from "./pages/ResetPasswordScreen";
import { views } from "./routes/views";

export default function App() {
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  const [currentView, setCurrentView] = useState(resetToken ? views.resetConfirm : views.login);
  const { clearUser, currentUser, saveUser } = useStoredUser();

  function handleLogout() {
    clearUser();
    setCurrentView(views.login);
  }

  if (currentView === views.register) {
    return <RegisterScreen goTo={setCurrentView} onLogin={saveUser} />;
  }

  if (currentView === views.reset) {
    return <ResetPasswordScreen goTo={setCurrentView} />;
  }

  if (currentView === views.resetConfirm) {
    return <ResetPasswordConfirmScreen goTo={setCurrentView} token={resetToken} />;
  }

  if (currentView === views.home) {
    if (!currentUser) {
      return <LoginScreen goTo={setCurrentView} onLogin={saveUser} />;
    }

    return <HomeScreen currentUser={currentUser} goTo={setCurrentView} onLogout={handleLogout} />;
  }

  if (currentView === views.profile) {
    if (!currentUser) {
      return <LoginScreen goTo={setCurrentView} onLogin={saveUser} />;
    }

    return (
      <ProfileScreen
        currentUser={currentUser}
        goTo={setCurrentView}
        onLogout={handleLogout}
        onUserUpdate={saveUser}
      />
    );
  }

  return <LoginScreen goTo={setCurrentView} onLogin={saveUser} />;
}
