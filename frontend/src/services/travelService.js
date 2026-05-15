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

export function getTravel(travelId) {
  return request(`/travels/${travelId}`, {
    method: "GET",
  });
}

export function updateTravel(travelId, payload) {
  return request(`/travels/${travelId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTravel(travelId) {
  return request(`/travels/${travelId}`, {
    method: "DELETE",
  });
}

export function getTravelBalance(travelId) {
  return request(`/travels/${travelId}/balance`, {
    method: "GET",
  });
}

export function closeTravel(travelId) {
  return request(`/travels/${travelId}/close`, {
    method: "PUT",
  });
}
