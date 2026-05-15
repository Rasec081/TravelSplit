import { useState } from "react";

import { PhoneInput } from "../components/forms/PhoneInput";
import { TextInput } from "../components/forms/TextInput";
import { views } from "../routes/views";
import { registerUser } from "../services/authService";
import { formatBirthdate } from "../utils/formatters";

const initialFormData = {
  name: "",
  lastname: "",
  email: "",
  phone: "",
  phoneCountry: "CR",
  phoneNumber: "",
  birthdate: "",
  password: "",
  confirmPassword: "",
};

export function RegisterScreen({ goTo }) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const fullName = `${formData.name} ${formData.lastname}`.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (fullName.length < 2) {
      nextErrors.name = "Ingresa tu nombre.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Ingresa tu correo electronico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Ingresa un correo electronico valido.";
    }

    if (!formData.password) {
      nextErrors.password = "Ingresa una contrasena.";
    } else if (formData.password.length < 8) {
      nextErrors.password = "La contrasena debe tener al menos 8 caracteres.";
    }

    if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = "Las contrasenas no coinciden.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await registerUser({
        nombre: fullName,
        correo: normalizedEmail,
        contrasena: formData.password,
      });
      setSuccessMessage("Cuenta creada correctamente. Ya puedes iniciar sesion.");
      setFormData(initialFormData);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-register" aria-labelledby="register-title">
      <button className="back-link" type="button" onClick={() => goTo(views.login)}>
        &larr; Regresar al inicio de sesion
      </button>

      <section className="auth-card register-card">
        <h1 id="register-title">Crear perfil de usuario</h1>
        <p className="auth-intro">
          Completa la informacion base para administrar viajes y distribuir gastos.
        </p>

        <form className="auth-form register-form" onSubmit={handleSubmit} noValidate>
          <div className="form-section">
            <div className="section-heading">
              <p className="form-section-title">Datos personales</p>
              <span>Informacion visible para tu equipo de viaje.</span>
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
                placeholder="Perez"
                value={formData.lastname}
              />
            </div>

            <TextInput
              error={errors.email}
              id="register-email"
              label="Correo electronico"
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Juan@figma.com"
              type="email"
              value={formData.email}
            />
            <PhoneInput
              id="register-phone"
              label="Numero de telefono"
              countryCode={formData.phoneCountry}
              number={formData.phoneNumber}
              onChange={({ countryCode, number, value }) =>
                setFormData((currentData) => ({
                  ...currentData,
                  phone: value,
                  phoneCountry: countryCode,
                  phoneNumber: number,
                }))
              }
            />
            <TextInput
              id="register-birthdate"
              label="Fecha de nacimiento"
              inputMode="numeric"
              maxLength="10"
              onChange={(event) => updateField("birthdate", formatBirthdate(event.target.value))}
              placeholder="dd/mm/aaaa"
              type="text"
              value={formData.birthdate}
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
              label="Contrasena"
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Minimo 8 caracteres"
              type="password"
              value={formData.password}
            />
            <TextInput
              error={errors.confirmPassword}
              id="register-confirm-password"
              label="Confirma tu contrasena"
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Contrasena"
              type="password"
              value={formData.confirmPassword}
            />
          </div>

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
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="secondary-text">
          Ya tienes una cuenta?{" "}
          <button type="button" onClick={() => goTo(views.login)}>
            Inicia sesion
          </button>
        </p>
      </section>
    </main>
  );
}
