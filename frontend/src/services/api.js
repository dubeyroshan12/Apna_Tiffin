const API_ROOT = import.meta.env.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:8000/api`;

function csrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function ensureCsrf() {
  const response = await fetch(`${API_ROOT}/auth/csrf/`, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to prepare a secure request. Please try again.");
}

export async function api(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) await ensureCsrf();
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken()) {
    headers.set("X-CSRFToken", csrfToken());
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.detail || Object.entries(data)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(" ") : value}`)
      .join(" · ") || `Request failed (${response.status}).`;
    throw new Error(message);
  }
  return data;
}

export const formatMoney = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount));
