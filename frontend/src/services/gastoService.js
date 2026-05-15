import { request } from "./apiClient";

export function listGastosByTravel(travelId) {
  return request(`/gastos?travel_id=${travelId}`, {
    method: "GET",
  });
}

export function createGasto(payload) {
  return request("/gastos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
