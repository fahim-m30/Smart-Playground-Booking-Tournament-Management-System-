export const API = import.meta.env.VITE_API_URL || "/api/v1";

export const money = (value) => new Intl.NumberFormat("en-BD", {
  style: "currency", currency: "BDT", maximumFractionDigits: 0,
}).format(value || 0);

export const isoDate = (date = new Date()) => new Date(date).toISOString().slice(0, 10);
export const prettyDate = (date) => date ? new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(date)) : "—";
export const toMinutes = (time) => time.split(":").reduce((hours, minutes) => Number(hours) * 60 + Number(minutes));

export async function request(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.message || "Something went wrong. Please try again.");
  return data.data;
}
