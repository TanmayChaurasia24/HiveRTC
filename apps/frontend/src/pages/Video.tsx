import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../providers/socket-provider";

const VideoLobby = () => {
  const [email, setEmail] = useState("");
  const [roomid, setRoom] = useState("");

  const navigate = useNavigate();
  const { socket }: any = useSocket();

  useEffect(()=> {
    socket.on("joined-room", (roomid: string) => {
      console.log("joined-room", roomid);
      navigate(`/room/${roomid}`); // Navigate to Room Page
    });
  },[socket])

  const handleJoinRoom = useCallback(
    (e: any) => {
      e.preventDefault();

      if (!email || !roomid) {
        // You might want to use a toast notification here instead of alert
        alert("Please enter both Email and Room ID");
        return;
      }
      
      socket.emit("join-room", { email, roomid });

    },
    [email, roomid, navigate]
  );

  return (
    // Main Container: Full screen, Gradient Background, Flex Centering
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Card Container */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Video Lobby</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your details to verify and join the P2P call.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleJoinRoom} className="space-y-6">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-200"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Room ID Input */}
          <div>
            <label
              htmlFor="room"
              className="block text-sm font-medium text-gray-700"
            >
              Room ID
            </label>
            <div className="mt-1">
              <input
                id="room"
                name="room"
                type="text"
                required
                value={roomid}
                onChange={(e) => setRoom(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-200"
                placeholder="e.g. 101"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 transform hover:scale-[1.02]"
            >
              Join Room
            </button>
          </div>
        </form>

        {/* Footer / Decoration */}
        <div className="relative flex items-center justify-center mt-6">
          <span className="text-xs text-gray-400">
            Peer-to-Peer Secured Connection
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoLobby;
