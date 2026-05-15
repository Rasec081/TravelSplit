import { request } from "./api";

export function getTravels() {
  return request("/travels");
}

export function getTravelById(travelId) {
  return request(`/travels/${travelId}`);
}

export function getTravelBalance(travelId) {
  return request(`/travels/${travelId}/balance`);
}

export function createTravel(travelData) {
  return request("/travels", {
    method: "POST",
    body: JSON.stringify(travelData),
  });
}

export function updateTravel(travelId, travelData) {
  return request(`/travels/${travelId}`, {
    method: "PUT",
    body: JSON.stringify(travelData),
  });
}

export function deleteTravel(travelId) {
  return request(`/travels/${travelId}`, { method: "DELETE" });
}

export function getCategories(tipo = "viaje") {
  return request(`/categorias?tipo=${tipo}`);
}

export async function getUserByEmail(email) {
  const users = await request("/usuarios");
  return users.find((u) => u.correo.toLowerCase() === email.toLowerCase()) ?? null;
}

export function addUserToTravel(travelId, userId) {
  return request("/user-travels", {
    method: "POST",
    body: JSON.stringify({ id_viaje: travelId, id_usuario: userId }),
  });
}
