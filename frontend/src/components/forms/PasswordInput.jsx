import { useState } from "react";

function EyeIcon({ hidden }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {hidden ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
          <path d="M8.4 5.5A10.7 10.7 0 0 1 12 4.9c5.4 0 8.5 5 9 6.1a11.8 11.8 0 0 1-2.4 3.2" />
          <path d="M6.1 6.8A12.1 12.1 0 0 0 3 11c.5 1.1 3.6 6.1 9 6.1 1.4 0 2.6-.3 3.7-.8" />
        </>
      ) : (
        <>
          <path d="M3 12s3.1-6.1 9-6.1S21 12 21 12s-3.1 6.1-9 6.1S3 12 3 12Z" />
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </>
      )}
    </svg>
  );
}

export function PasswordInput({ id, label, placeholder, error, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="field password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? "true" : "false"}
          id={id}
          name={id}
          placeholder={placeholder}
          type={showPassword ? "text" : "password"}
          {...props}
        />
        <button
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="password-toggle"
          type="button"
          onClick={() => setShowPassword((currentValue) => !currentValue)}
        >
          <EyeIcon hidden={showPassword} />
        </button>
      </div>
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
