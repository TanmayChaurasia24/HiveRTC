import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signin, signup } from "../lib/api";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup(username, password, role);
        setMode("signin");
        setError("");
        setUsername("");
        setPassword("");
        return;
      }
      const res = await signin(username, password);
      localStorage.setItem("token", res.token);

      // decode role from JWT payload (base64)
      const payload = JSON.parse(atob(res.token.split(".")[1]));
      localStorage.setItem("role", payload.role);
      localStorage.setItem("userId", payload.userId);

      if (payload.role === "Admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🐝</div>
          <span className="auth-logo-text">HiveRTC</span>
        </div>

        <h2 className="auth-title">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h2>
        <p className="auth-subtitle">
          {mode === "signin"
            ? "Sign in to enter your virtual space"
            : "Join HiveRTC and build your world"}
        </p>

        {/* Mode toggle */}
        <div className="auth-toggle">
          <button
            className={`auth-toggle-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            className={`auth-toggle-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label">Role</label>
              <div className="role-select">
                <button
                  type="button"
                  className={`role-btn ${role === "user" ? "active" : ""}`}
                  onClick={() => setRole("user")}
                >
                  👤 User
                </button>
                <button
                  type="button"
                  className={`role-btn ${role === "admin" ? "active" : ""}`}
                  onClick={() => setRole("admin")}
                >
                  🔑 Admin
                </button>
              </div>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading
              ? "Please wait..."
              : mode === "signin"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            className="auth-link"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
