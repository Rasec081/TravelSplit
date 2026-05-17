import { request } from "./apiClient";

function categoryQuery(tipo, userId) {
  const params = new URLSearchParams({ tipo });
  if (userId) params.set("id_usuario", String(userId));
  return params.toString();
}

function userQuery(userId) {
  if (!userId) return "";
  return `?${new URLSearchParams({ id_usuario: String(userId) }).toString()}`;
}

export function listTravelCategories(userId) {
  return request(`/categorias?${categoryQuery("viaje", userId)}`, {
    method: "GET",
  });
}

export function listExpenseCategories(userId) {
  return request(`/categorias?${categoryQuery("gasto", userId)}`, {
    method: "GET",
  });
}

export function createTravelCategory(nombre_categoria, userId) {
  return request("/categorias", {
    method: "POST",
    body: JSON.stringify({
      nombre_categoria,
      tipo: "viaje",
      id_usuario: userId,
    }),
  });
}

export function createExpenseCategory(nombre_categoria, userId) {
  return request("/categorias", {
    method: "POST",
    body: JSON.stringify({
      nombre_categoria,
      tipo: "gasto",
      id_usuario: userId,
    }),
  });
}

export function updateCategory(categoryId, nombre_categoria, userId) {
  return request(`/categorias/${categoryId}${userQuery(userId)}`, {
    method: "PUT",
    body: JSON.stringify({
      nombre_categoria,
    }),
  });
}

export function deleteCategory(categoryId, userId) {
  return request(`/categorias/${categoryId}${userQuery(userId)}`, {
    method: "DELETE",
  });
}
