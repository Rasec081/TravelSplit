const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

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
      `No se pudo conectar con el backend en ${API_URL}. Abre ${API_URL}/health y revisa que responda. Si responde, revisa CORS y que FRONTEND_URLS incluya este dominio de Vercel.`,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? data.detail ?? "No se pudo completar la solicitud.");
  }

  return data;
}
