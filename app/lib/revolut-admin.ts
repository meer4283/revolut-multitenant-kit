import { BASE } from "./revolut";

export async function revolutAdminFetch(path: string, secretKey: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      Authorization: `Bearer ${secretKey}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error("Revolut API Error:", errorText);
    throw new Error(errorText);
  }
  return res.json();
}
