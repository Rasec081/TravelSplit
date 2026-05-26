import { useState } from "react";

import { DashboardHeader } from "../components/DashboardHeader";
import { PasswordInput } from "../components/forms/PasswordInput";
import { TextInput } from "../components/forms/TextInput";
import { updateUser } from "../services/authService";
import { views } from "../routes/views";

function splitFullName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { lastname: "", name: parts[0] ?? "" };
  }

  return {
    lastname: parts.slice(1).join(" "),
    name: parts[0],
  };
}

export function ProfileScreen({ currentUser, goTo, onLogout, onUserUpdate }) {
  const userId = currentUser?.id_usuario;
  const userName = splitFullName(currentUser?.nombre);
  const [formData, setFormData] = useState({
    name: userName.name,
    lastname: userName.lastname,
    email: currentUser?.correo ?? "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fullName = `${formData.name} ${formData.lastname}`.trim();
  const normalizedEmail = formData.email.trim().toLowerCase();
  const hasUserChanges =
    fullName !== (currentUser?.nombre ?? "") ||
    normalizedEmail !== (currentUser?.correo ?? "").toLowerCase() ||
    Boolean(formData.password);

  function updateField(field, value) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!hasUserChanges) {
      return;
    }

    if (fullName.length < 2) {
      nextErrors.name = "Ingresa tu nombre.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (formData.password && formData.password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const backendUpdates = {};

    if (fullName !== currentUser.nombre) {
      backendUpdates.nombre = fullName;
    }

    if (normalizedEmail !== currentUser.correo) {
      backendUpdates.correo = normalizedEmail;
    }

    if (formData.password) {
      backendUpdates.contrasena = formData.password;
    }

    try {
      setIsSubmitting(true);

      if (Object.keys(backendUpdates).length > 0) {
        const response = await updateUser(userId, backendUpdates);
        onUserUpdate(response.data);
      }

      setFormData((currentData) => ({
        ...currentData,
        email: normalizedEmail,
        password: "",
      }));
      setSuccessMessage("Perfil actualizado correctamente.");
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="home-page profile-page" id="contenido-principal" tabIndex={-1} aria-labelledby="profile-title">
      <DashboardHeader
        activeView={views.profile}
        currentUser={currentUser}
        goTo={goTo}
        onLogout={onLogout}
      />

      <section className="profile-content">
        <div className="profile-heading">
          <div>
            <p className="eyebrow">Perfil</p>
            <h1 id="profile-title">Información personal</h1>
            <p>Actualiza los datos de tu cuenta y la información visible en TravelSplit.</p>
          </div>
        </div>

        <form className="profile-card" onSubmit={handleSubmit} noValidate>
          <div className="section-heading">
            <p className="form-section-title">Información personal</p>
            <span>Estos datos ayudan a identificarte dentro de tus viajes compartidos.</span>
          </div>

          <div className="two-columns">
            <TextInput
              error={errors.name}
              id="profile-name"
              label="Nombre"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Juan"
              value={formData.name}
            />
            <TextInput
              id="profile-lastname"
              label="Apellido"
              onChange={(event) => updateField("lastname", event.target.value)}
              placeholder="Pérez"
              value={formData.lastname}
            />
          </div>

          <TextInput
            error={errors.email}
            id="profile-email"
            label="Correo electrónico"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="juan@correo.com"
            type="email"
            value={formData.email}
          />

          <PasswordInput
            error={errors.password}
            id="profile-password"
            label="Contraseña"
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="Ingresa una nueva contraseña"
            value={formData.password}
          />

          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}
          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <div className="profile-actions">
            <button className="secondary-button" type="button" onClick={() => goTo(views.home)}>
              Cancelar
            </button>
            <button className="primary-button" disabled={isSubmitting || !hasUserChanges} type="submit">
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
