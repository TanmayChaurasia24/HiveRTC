import Arena from "./pages/Game";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import VideoLobby from "./pages/Video";
import RoomPage from "./pages/Room";
import { SocketProvider } from "./providers/socket-provider";

function App() {
  return (
    <>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Arena />} />
            <Route path="/lobby" element={<VideoLobby />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </>
  );
}

export default App;
