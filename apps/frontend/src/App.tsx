import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { SocketProvider } from "./providers/socket-provider";
import { PeerProvider } from "./providers/peer-providers";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Arena from "./pages/Game";
import RoomPage from "./pages/Room";
import VideoLobby from "./pages/Video";

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
      <PeerProvider>
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

            {/* Video routes */}
            <Route path="/lobby" element={<VideoLobby />} />
            <Route path="/room/:roomid" element={<RoomPage />} />
          </Routes>
        </BrowserRouter>
      </PeerProvider>
    </SocketProvider>
  );
}

export default App;
