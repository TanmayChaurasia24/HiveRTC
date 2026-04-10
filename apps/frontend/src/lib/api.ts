const BASE_URL = "http://localhost:3000/api/v1";

function getToken() {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// AUTH
export const signup = (username: string, password: string, type: "admin" | "user") =>
  request("/signup", { method: "POST", body: JSON.stringify({ username, password, type }) });

export const signin = (username: string, password: string) =>
  request<{ token: string }>("/signin", { method: "POST", body: JSON.stringify({ username, password }) });

// ADMIN
export const createElement = (data: { imageUrl: string; width: number; height: number; static: boolean }) =>
  request<{ id: string }>("/admin/element", { method: "POST", body: JSON.stringify(data) });

export const updateElement = (elementId: string, imageUrl: string) =>
  request(`/admin/element/${elementId}`, { method: "PUT", body: JSON.stringify({ imageUrl }) });

export const getAllElements = () =>
  request<{ elements: { id: string; imageUrl: string; width: number; height: number; static: boolean }[] }>("/elements");

export const createAvatar = (data: { name: string; imageUrl: string }) =>
  request<{ avatarId: string }>("/admin/avatar", { method: "POST", body: JSON.stringify(data) });

export const createMap = (data: {
  name: string;
  thumbnail: string;
  dimensions: string;
  defaultElements: { elementId: string; x: number; y: number }[];
}) => request<{ id: string }>("/admin/map", { method: "POST", body: JSON.stringify(data) });

// USER
export const getAllAvatars = () =>
  request<{ avatars: { id: string; name: string; imageUrl: string }[] }>("/avatars");

export const updateMetadata = (avatarId: string) =>
  request("/user/metadata", { method: "POST", body: JSON.stringify({ avatarId }) });

export const createSpace = (data: { name: string; dimensions: string; mapId?: string }) =>
  request<{ spaceId: string }>("/space", { method: "POST", body: JSON.stringify(data) });

export const getMySpaces = () =>
  request<{ spaces: { id: string; name: string; dimensions: string; thumbnail?: string }[] }>("/space/all");

export const getAllPublicSpaces = () =>
  request<{ spaces: { id: string; name: string; dimensions: string; thumbnail?: string; createdBy: string }[] }>("/spaces");

export const deleteSpace = (spaceId: string) =>
  request(`/space/${spaceId}`, { method: "DELETE" });

export const getSpace = (spaceId: string) =>
  request<{ dimensions: string; elements: any[] }>(`/space/${spaceId}`);

export const addElementToSpace = (data: { spaceId: string; elementId: string; x: number; y: number }) =>
  request("/space/element", { method: "POST", body: JSON.stringify(data) });

export const deleteElementFromSpace = (id: string) =>
  request("/space/element", { method: "DELETE", body: JSON.stringify({ id }) });
