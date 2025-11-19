import Arena from "./pages/Game";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import VideoLobby from "./pages/Video";
import RoomPage from "./pages/Room";
import { SocketProvider } from "./providers/socket-provider";
import { PeerProvider } from "./providers/peer-providers";

function App() {
  return (
    <>
      <SocketProvider>
        <PeerProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Arena />} />
              <Route path="/lobby" element={<VideoLobby />} />
              <Route path="/room/:roomid" element={<RoomPage />} />
            </Routes>
          </BrowserRouter>
        </PeerProvider>
      </SocketProvider>
    </>
  );
}

export default App;
