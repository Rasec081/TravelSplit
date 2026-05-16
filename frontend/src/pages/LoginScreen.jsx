import { useState } from "react";

import { BrandHeader } from "../components/BrandHeader";
import { PasswordInput } from "../components/forms/PasswordInput";
import { TextInput } from "../components/forms/TextInput";
import { views } from "../routes/views";
import { loginUser } from "../services/authService";

export function LoginScreen({ goTo, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (!password) {
      nextErrors.password = "Ingresa tu contraseña.";
    } else if (password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await loginUser({
        correo: normalizedEmail,
        contrasena: password,
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
    <main className="auth-page auth-page-login" aria-labelledby="login-title">
      <BrandHeader />

      <section className="auth-card login-card">
        <h1 id="login-title">Acceso a TravelSplit</h1>
        <p className="auth-intro">
          Gestiona viajes, participantes y gastos compartidos desde un solo espacio.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <TextInput
            autoComplete="email"
            error={errors.email}
            id="login-email"
            label="Correo electrónico"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ingresa tu correo electrónico"
            type="email"
            value={email}
          />
          <PasswordInput
            autoComplete="current-password"
            error={errors.password}
            id="login-password"
            label="Contraseña"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contraseña"
            value={password}
          />

          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Validando..." : "Iniciar sesión"}
          </button>
        </form>

        <footer className="login-links">
          <button type="button" onClick={() => goTo(views.reset)}>
            Recuperar acceso
          </button>
          <button type="button" onClick={() => goTo(views.register)}>
            Crear cuenta nueva
          </button>
        </footer>
      </section>
    </main>
  );
}
