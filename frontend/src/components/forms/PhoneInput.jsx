import { countryOptions } from "../../constants/countryOptions";
import { formatPhoneNumber } from "../../utils/formatters";

export function PhoneInput({ countryCode, error, id, label, number, onChange }) {
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
