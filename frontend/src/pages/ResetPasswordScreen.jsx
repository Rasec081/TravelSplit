import { useState } from "react";

import { TextInput } from "../components/forms/TextInput";
import { views } from "../routes/views";
import { requestPasswordReset } from "../services/authService";

export function ResetPasswordScreen({ goTo }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setSuccessMessage("");

    if (!normalizedEmail) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await requestPasswordReset({ correo: normalizedEmail });
      setSuccessMessage(response.message);
      setEmail("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-reset" id="contenido-principal" tabIndex={-1} aria-labelledby="reset-title">
      <button className="back-link" type="button" onClick={() => goTo(views.login)}>
        &larr; Regresar al inicio de sesión
      </button>

      <section className="auth-card reset-card">
        <h1 id="reset-title">Restablecer acceso</h1>
        <p className="auth-intro">Recibe un enlace seguro para volver a ingresar a tu cuenta.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <TextInput
            error={error}
            id="reset-email"
            label="Correo electrónico"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ingresa tu correo electrónico"
            required
            type="email"
            value={email}
          />

          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Enviando..." : "Enviar correo de recuperación"}
          </button>
        </form>

        <button className="reset-login-link" type="button" onClick={() => goTo(views.login)}>
          Iniciar sesión
        </button>
      </section>
    </main>
  );
}
