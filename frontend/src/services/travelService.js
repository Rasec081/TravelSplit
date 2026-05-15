import { request } from "./apiClient";

export function createTravel(travelData) {
  return request("/travels", {
    method: "POST",
    body: JSON.stringify(travelData),
  });
}

export function listTravels() {
  return request("/travels", {
    method: "GET",
  });
}

