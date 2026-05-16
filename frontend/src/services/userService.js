import { request } from "./apiClient";

export function listUsers() {
  return request("/usuarios", {
    method: "GET",
  });
}

