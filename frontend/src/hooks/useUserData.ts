import { useState } from "react";

export default function useUserData() {
  const getUserData = () => {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem("user_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  return getUserData();
}
