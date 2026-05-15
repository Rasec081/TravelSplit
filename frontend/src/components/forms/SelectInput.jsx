export function SelectInput({ id, label, className = "", error, children, ...props }) {
  const errorId = `${id}-error`;

  return (
    <div className={`field ${className}`}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : "false"}
        id={id}
        name={id}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
