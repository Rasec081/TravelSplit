import { request } from "./api";

export function loginUser(credentials) {
  return request("/usuarios/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function registerUser(userData) {
  return request("/usuarios", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export function requestPasswordReset(resetData) {
  return request("/usuarios/password-reset/request", {
    method: "POST",
    body: JSON.stringify(resetData),
  });
}

export function confirmPasswordReset(resetData) {
  return request("/usuarios/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(resetData),
  });
}
