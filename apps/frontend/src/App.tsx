import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { SocketProvider } from "./providers/socket-provider";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Arena from "./pages/Game";

function RequireAuth({ children, role }: { children: any; role?: "Admin" | "User" }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin only */}
          <Route
            path="/admin"
            element={
              <RequireAuth role="Admin">
                <AdminDashboard />
              </RequireAuth>
            }
          />

          {/* User only */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth role="User">
                <UserDashboard />
              </RequireAuth>
            }
          />

          {/* Game arena – accessible to authenticated users */}
          <Route
            path="/arena"
            element={
              <RequireAuth>
                <Arena />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
