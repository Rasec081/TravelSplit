export function TextInput({
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
