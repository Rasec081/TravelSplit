import { useState } from "react";

const STORAGE_KEY = "travelsplit_user";

export function useStoredUser() {
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = window.localStorage.getItem(STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });

  function saveUser(user) {
    setCurrentUser(user);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    setCurrentUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return { clearUser, currentUser, saveUser };
}
