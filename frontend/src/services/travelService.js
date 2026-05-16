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

export function listTravelsByUser(userId) {
  return request(`/travels/by-user/${userId}`, {
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

export function getTravelSettlements(travelId, userId) {
  return request(`/travels/${travelId}/settlements/${userId}`, {
    method: "GET",
  });
}

export function createTravelPayment(travelId, payload) {
  return request(`/travels/${travelId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function closeTravel(travelId) {
  return request(`/travels/${travelId}/close`, {
    method: "PUT",
  });
}
