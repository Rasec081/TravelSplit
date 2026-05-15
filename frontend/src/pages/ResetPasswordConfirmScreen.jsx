import { useState } from "react";

import { TextInput } from "../components/forms/TextInput";
import { views } from "../routes/views";
import { confirmPasswordReset } from "../services/authService";

export function ResetPasswordConfirmScreen({ goTo, token }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    setSuccessMessage("");

    if (!password) {
      nextErrors.password = "Ingresa tu nueva contrasena.";
    } else if (password.length < 8) {
      nextErrors.password = "La contrasena debe tener al menos 8 caracteres.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Las contrasenas no coinciden.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await confirmPasswordReset({
        token,
        nueva_contrasena: password,
      });
      setSuccessMessage(response.message);
      setPassword("");
      setConfirmPassword("");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-reset" aria-labelledby="reset-confirm-title">
      <section className="auth-card reset-card">
        <h1 id="reset-confirm-title">Definir nueva contrasena</h1>
        <p className="auth-intro">Actualiza tus credenciales para mantener la cuenta protegida.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <TextInput
            error={errors.password}
            id="new-password"
            label="Nueva contrasena"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 8 caracteres"
            type="password"
            value={password}
          />
          <TextInput
            error={errors.confirmPassword}
            id="confirm-new-password"
            label="Confirma tu nueva contrasena"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la contrasena"
            type="password"
            value={confirmPassword}
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

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Guardando..." : "Guardar nueva contrasena"}
          </button>
        </form>

        <button className="reset-login-link" type="button" onClick={() => goTo(views.login)}>
          Iniciar sesion
        </button>
      </section>
    </main>
  );
}
