import { request } from "./apiClient";

export function listTravelCategories() {
  return request("/categorias?tipo=viaje", {
    method: "GET",
  });
}

export function createTravelCategory(nombre_categoria) {
  return request("/categorias", {
    method: "POST",
    body: JSON.stringify({
      nombre_categoria,
      tipo: "viaje",
    }),
  });
}

export function updateCategory(categoryId, nombre_categoria) {
  return request(`/categorias/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify({
      nombre_categoria,
    }),
  });
}

export function deleteCategory(categoryId) {
  return request(`/categorias/${categoryId}`, {
    method: "DELETE",
  });
}
