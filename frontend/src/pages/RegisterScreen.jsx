import { useEffect, useState } from "react";

import { TextInput } from "../components/forms/TextInput";
import { views } from "../routes/views";
import { registerUser } from "../services/authService";

const initialFormData = {
  name: "",
  lastname: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterScreen({ goTo, onLogin }) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  useEffect(() => {
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (formData.password && formData.confirmPassword && formData.confirmPassword !== formData.password) {
        nextErrors.confirmPassword = "Las contraseñas no coinciden.";
      } else if (nextErrors.confirmPassword === "Las contraseñas no coinciden.") {
        delete nextErrors.confirmPassword;
      }

      return nextErrors;
    });
  }, [formData.password, formData.confirmPassword]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const fullName = `${formData.name} ${formData.lastname}`.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (fullName.length < 2) {
      nextErrors.name = "Ingresa tu nombre.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!formData.password) {
      nextErrors.password = "Ingresa una contraseña.";
    } else if (formData.password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await registerUser({
        nombre: fullName,
        correo: normalizedEmail,
        contrasena: formData.password,
      });
      onLogin(response.data);
      goTo(views.home);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-register" aria-labelledby="register-title">
      <button className="back-link" type="button" onClick={() => goTo(views.login)}>
        &larr; Regresar al inicio de sesión
      </button>

      <section className="auth-card register-card">
        <h1 id="register-title">Crear perfil de usuario</h1>
        <p className="auth-intro">
          Completa la información básica para administrar viajes y distribuir gastos.
        </p>

        <form className="auth-form register-form" onSubmit={handleSubmit} noValidate>
          <div className="form-section">
            <div className="section-heading">
              <p className="form-section-title">Datos personales</p>
              <span>Información visible para tu equipo de viaje.</span>
            </div>
            <div className="two-columns">
              <TextInput
                error={errors.name}
                id="register-name"
                label="Nombre"
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Juan"
                value={formData.name}
              />
              <TextInput
                id="register-lastname"
                label="Apellido"
                onChange={(event) => updateField("lastname", event.target.value)}
                placeholder="Pérez"
                value={formData.lastname}
              />
            </div>

            <TextInput
              error={errors.email}
              id="register-email"
              label="Correo electrónico"
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Juan@example.com"
              type="email"
              value={formData.email}
            />
          </div>

          <div className="form-section">
            <div className="section-heading">
              <p className="form-section-title">Datos de acceso</p>
              <span>Credenciales para proteger tu cuenta.</span>
            </div>
            <TextInput
              error={errors.password}
              id="register-password"
              label="Contraseña"
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Mínimo 8 caracteres"
              type="password"
              value={formData.password}
            />
            <TextInput
              error={errors.confirmPassword}
              id="register-confirm-password"
              label="Confirma tu contraseña"
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Contraseña"
              type="password"
              value={formData.confirmPassword}
            />
          </div>

          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="secondary-text">
          ¿Ya tienes una cuenta?{" "}
          <button type="button" onClick={() => goTo(views.login)}>
            Inicia sesión
          </button>
        </p>
      </section>
    </main>
  );
}
