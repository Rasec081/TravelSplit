export function formatBirthdate(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join("/");
}

export function formatPhoneNumber(value, countryCode) {
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
