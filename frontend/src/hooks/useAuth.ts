"use client";

export function useAuth() {
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])); // decode JWT payload
    return payload.exp * 1000 < Date.now(); // exp is in seconds, Date.now() in ms
  } catch {
    return true; // if we can't decode it, treat as expired
  }
}

  return { isTokenExpired };
}
