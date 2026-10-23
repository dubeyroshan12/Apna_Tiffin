import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/auth/me/")
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async signIn(email, password) {
      const current = await api("/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(current);
      return current;
    },
    async signUp(form) {
      const current = await api("/auth/register/", { method: "POST", body: JSON.stringify(form) });
      setUser(current);
      return current;
    },
    async signOut() {
      await api("/auth/logout/", { method: "POST" });
      setUser(null);
    },
    setUser,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
