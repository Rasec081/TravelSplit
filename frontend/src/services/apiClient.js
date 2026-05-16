const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function request(path, options) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el backend. Verifica que la API esté encendida en http://localhost:8000.",
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? "No se pudo completar la solicitud.");
  }

  return data;
}

