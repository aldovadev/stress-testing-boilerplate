import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === "true";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(!AUTH_ENABLED);

  useEffect(() => {
    if (!AUTH_ENABLED) return;

    const token = localStorage.getItem("stresster_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || "";
    fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setAuthorized(true);
        } else {
          localStorage.removeItem("stresster_token");
          navigate("/login", { replace: true });
        }
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  if (!authorized) return null;

  return <>{children}</>;
}
