import { request } from "./apiClient";

export function addUserToTravel(payload) {
  return request("/user-travels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listUsersByTravel(travelId) {
  return request(`/user-travels/by-travel/${travelId}`, {
    method: "GET",
  });
}

export function deleteUserTravel(userTravelId) {
  return request(`/user-travels/${userTravelId}`, {
    method: "DELETE",
  });
}

export function updateUserTravel(userTravelId, payload) {
  return request(`/user-travels/${userTravelId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
