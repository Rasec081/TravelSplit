import { useState } from "react";

import {
  confirmPasswordReset,
  loginUser,
  registerUser,
  requestPasswordReset,
} from "./services/authService";

const views = {
  login: "login",
  register: "register",
  reset: "reset",
  resetConfirm: "resetConfirm",
  home: "home",
};

const trips = [
  { id: 1, name: "Gira a San Carlos", participants: 12, status: "En planificacion" },
  { id: 2, name: "Playa Tamarindo", participants: 5, status: "Activo" },
  { id: 3, name: "Volcan Poas", participants: 8, status: "Cerrado" },
];

const countryOptions = [
  {
    code: "CR",
    dialCode: "+506",
    flag: "🇨🇷",
    name: "Costa Rica",
    placeholder: "8765-4321",
  },
  {
    code: "US",
    dialCode: "+1",
    flag: "🇺🇸",
    name: "United States",
    placeholder: "(415) 555-2671",
  },
  {
    code: "CO",
    dialCode: "+57",
    flag: "🇨🇴",
    name: "Colombia",
    placeholder: "300 123 4567",
  },
  {
    code: "MX",
    dialCode: "+52",
    flag: "🇲🇽",
    name: "Mexico",
    placeholder: "55 1234 5678",
  },
];

function formatBirthdate(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join("/");
}

function formatPhoneNumber(value, countryCode) {
  const digits = value.replace(/\D/g, "");

  if (countryCode === "US") {
    const phoneDigits = digits.slice(0, 10);
    const area = phoneDigits.slice(0, 3);
    const prefix = phoneDigits.slice(3, 6);
    const line = phoneDigits.slice(6, 10);

    if (phoneDigits.length > 6) {
      return `(${area}) ${prefix}-${line}`;
    }

    if (phoneDigits.length > 3) {
      return `(${area}) ${prefix}`;
    }

    return area ? `(${area}` : "";
  }

  if (countryCode === "CR") {
    const phoneDigits = digits.slice(0, 8);
    return phoneDigits.length > 4
      ? `${phoneDigits.slice(0, 4)}-${phoneDigits.slice(4)}`
      : phoneDigits;
  }

  if (countryCode === "CO") {
    const phoneDigits = digits.slice(0, 10);
    return [phoneDigits.slice(0, 3), phoneDigits.slice(3, 6), phoneDigits.slice(6, 10)]
      .filter(Boolean)
      .join(" ");
  }

  const phoneDigits = digits.slice(0, 10);
  return [phoneDigits.slice(0, 2), phoneDigits.slice(2, 6), phoneDigits.slice(6, 10)]
    .filter(Boolean)
    .join(" ");
}

function TextInput({
  id,
  label,
  type = "text",
  placeholder,
  className = "",
  error,
  ...props
}) {
  const errorId = `${id}-error`;

  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : "false"}
        id={id}
        name={id}
        placeholder={placeholder}
        type={type}
        {...props}
      />
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PhoneInput({ countryCode, error, id, label, number, onChange }) {
  const selectedCountry =
    countryOptions.find((country) => country.code === countryCode) ?? countryOptions[0];
  const errorId = `${id}-error`;

  function updatePhone(nextCountryCode, nextNumber) {
    const country =
      countryOptions.find((countryOption) => countryOption.code === nextCountryCode) ??
      countryOptions[0];
    const formattedNumber = formatPhoneNumber(nextNumber, country.code);

    onChange({
      countryCode: country.code,
      number: formattedNumber,
      value: formattedNumber ? `${country.dialCode} ${formattedNumber}` : "",
    });
  }

  return (
    <div className="field">
      <label htmlFor={`${id}-number`}>{label}</label>
      <div className="phone-control">
        <select
          aria-label="Codigo de pais"
          className="phone-country"
          onChange={(event) => updatePhone(event.target.value, number)}
          value={selectedCountry.code}
        >
          {countryOptions.map((country) => (
            <option key={country.code} value={country.code}>
              {country.code} {country.name} {country.dialCode}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="phone-dial-code">
          {selectedCountry.dialCode}
        </span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? "true" : "false"}
          autoComplete="tel-national"
          id={`${id}-number`}
          inputMode="tel"
          name={id}
          onChange={(event) => updatePhone(selectedCountry.code, event.target.value)}
          placeholder={selectedCountry.placeholder}
          type="tel"
          value={number}
        />
      </div>
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LoginScreen({ goTo, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextErrors.email = "Ingresa tu correo electronico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Ingresa un correo electronico valido.";
    }

    if (!password) {
      nextErrors.password = "Ingresa tu contrasena.";
    } else if (password.length < 8) {
      nextErrors.password = "La contrasena debe tener al menos 8 caracteres.";
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
      <header className="brand-header">
        <p>
          <span aria-hidden="true">◆</span>
          TravelSplit
        </p>
      </header>

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
            label="Correo electronico"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ingresa tu correo electronico"
            type="email"
            value={email}
          />
          <TextInput
            autoComplete="current-password"
            error={errors.password}
            id="login-password"
            label="Contrasena"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contrasena"
            type="password"
            value={password}
          />

          {errors.form ? (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Validando..." : "Iniciar sesion"}
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

function RegisterScreen({ goTo }) {
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    email: "",
    phone: "",
    phoneCountry: "CR",
    phoneNumber: "",
    birthdate: "",
    password: "",
    confirmPassword: "",
  });
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
      setFormData({
        name: "",
        lastname: "",
        email: "",
        phone: "",
        phoneCountry: "CR",
        phoneNumber: "",
        birthdate: "",
        password: "",
        confirmPassword: "",
      });
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

function ResetPasswordScreen({ goTo }) {
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
      setError("Ingresa tu correo electronico.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa un correo electronico valido.");
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
    <main className="auth-page auth-page-reset" aria-labelledby="reset-title">
      <button className="back-link" type="button" onClick={() => goTo(views.login)}>
        &larr; Regresar al inicio de sesion
      </button>

      <section className="auth-card reset-card">
        <h1 id="reset-title">Restablecer acceso</h1>
        <p className="auth-intro">Recibe un enlace seguro para volver a ingresar a tu cuenta.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <TextInput
            error={error}
            id="reset-email"
            label="Correo electronico"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ingresa tu correo electronico"
            type="email"
            value={email}
          />

          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Enviando..." : "Enviar correo de recuperacion"}
          </button>
        </form>

        <button className="reset-login-link" type="button" onClick={() => goTo(views.login)}>
          Iniciar sesion
        </button>
      </section>
    </main>
  );
}

function ResetPasswordConfirmScreen({ goTo, token }) {
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

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="home-nav-icon" fill="none" viewBox="0 0 24 24">
      <path d="M4 10.4 12 4l8 6.4V21h-5.2v-6.2H9.2V21H4V10.4Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="home-nav-icon" fill="none" viewBox="0 0 24 24">
      <path d="M18.5 20a6.5 6.5 0 0 0-13 0M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </svg>
  );
}

function HomeScreen({ currentUser, onLogout }) {
  const totalParticipants = trips.reduce((total, trip) => total + trip.participants, 0);

  return (
    <main className="home-page" aria-labelledby="home-title">
      <header className="home-header">
        <div className="home-header-inner">
          <div className="app-brand">
            <span aria-hidden="true">TS</span>
            <strong>TravelSplit</strong>
          </div>
          <nav aria-label="Principal" className="home-nav">
            <button className="home-nav-link active" type="button" aria-current="page">
              <HomeIcon />
              <span>Inicio</span>
            </button>
            <button className="home-nav-link" type="button">
              <UserIcon />
              <span>Perfil</span>
            </button>
          </nav>
          <div className="home-actions">
            <button className="my-trips-button" type="button">
              {currentUser?.nombre ?? "Mi cuenta"}
            </button>
            <button className="logout-button" type="button" onClick={onLogout}>
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <section className="home-content">
        <div className="dashboard-hero">
          <div>
            <p className="eyebrow">Panel de gestion</p>
            <h1 id="home-title">Viajes y gastos compartidos</h1>
            <p>
              Supervisa tus viajes, participantes y proximas acciones desde una vista clara y
              ordenada.
            </p>
          </div>
          <button className="create-trip-button" type="button">
            <span aria-hidden="true">+</span>
            Crear viaje
          </button>
        </div>

        <div className="metric-grid" aria-label="Resumen de viajes">
          <article className="metric-card">
            <span>Viajes registrados</span>
            <strong>{trips.length}</strong>
          </article>
          <article className="metric-card">
            <span>Participantes</span>
            <strong>{totalParticipants}</strong>
          </article>
          <article className="metric-card">
            <span>Estados activos</span>
            <strong>{trips.filter((trip) => trip.status !== "Cerrado").length}</strong>
          </article>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Mis viajes</h2>
              <p>Listado de viajes disponibles para seguimiento y colaboracion.</p>
            </div>
          </div>

          <div className="trip-table" aria-label="Lista de viajes">
            <div className="trip-table-row trip-table-head">
              <span>Viaje</span>
              <span>Participantes</span>
              <span>Estado</span>
              <span>Accion</span>
            </div>
            {trips.map((trip) => (
              <article className="trip-table-row" key={trip.id}>
                <div>
                  <h3>{trip.name}</h3>
                  <p>Gestion colaborativa de gastos</p>
                </div>
                <span>{trip.participants}</span>
                <span className="status-badge">{trip.status}</span>
                <button className="secondary-button" type="button">
                  Ver detalles
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  const [currentView, setCurrentView] = useState(resetToken ? views.resetConfirm : views.login);
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = window.localStorage.getItem("travelsplit_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  function handleLogin(user) {
    setCurrentUser(user);
    window.localStorage.setItem("travelsplit_user", JSON.stringify(user));
  }

  function handleLogout() {
    setCurrentUser(null);
    window.localStorage.removeItem("travelsplit_user");
    setCurrentView(views.login);
  }

  if (currentView === views.register) {
    return <RegisterScreen goTo={setCurrentView} />;
  }

  if (currentView === views.reset) {
    return <ResetPasswordScreen goTo={setCurrentView} />;
  }

  if (currentView === views.resetConfirm) {
    return <ResetPasswordConfirmScreen goTo={setCurrentView} token={resetToken} />;
  }

  if (currentView === views.home) {
    if (!currentUser) {
      return <LoginScreen goTo={setCurrentView} onLogin={handleLogin} />;
    }
    return <HomeScreen currentUser={currentUser} onLogout={handleLogout} />;
  }

  return <LoginScreen goTo={setCurrentView} onLogin={handleLogin} />;
}
