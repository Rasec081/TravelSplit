import { request } from "./apiClient";

export function createDivisionGasto(payload) {
  return request("/divisiones-gastos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

