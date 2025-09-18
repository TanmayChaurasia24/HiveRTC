import { useEffect, useRef, useState } from 'react';
// Assuming you have lucide-react for icons, a common choice for modern UI
import { Users, Keyboard } from 'lucide-react';

const Arena = () => {
  const canvasRef = useRef<any>(null);
  const wsRef = useRef<any>(null);
  const [currentUser, setCurrentUser] = useState<any>({});
  const [users, setUsers] = useState(new Map());
  const [params, setParams] = useState({ token: '', spaceId: '' });

  // No logic changes in this section
  // Initialize WebSocket connection and handle URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || '';
    const spaceId = urlParams.get('spaceId') || '';
    setParams({ token, spaceId });

    // Initialize WebSocket
    wsRef.current = new WebSocket('ws://localhost:3001'); // Replace with your WS_URL

    wsRef.current.onopen = () => {
      // Join the space once connected
      wsRef.current.send(JSON.stringify({
        type: 'join',
        payload: {
          spaceId,
          token
        }
      }));
    };

    wsRef.current.onmessage = (event: any) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // No logic changes in this section
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'space-joined':
        setCurrentUser({
          x: message.payload.spawn.x,
          y: message.payload.spawn.y,
          userId: message.payload.userId
        });
        const userMap = new Map();
        message.payload.users.forEach((user: any) => {
          userMap.set(user.userId, user);
        });
        setUsers(userMap);
        break;
      case 'user-joined':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.set(message.payload.userId, {
            x: message.payload.x,
            y: message.payload.y,
            userId: message.payload.userId
          });
          return newUsers;
        });
        break;
      case 'movement':
        setUsers(prev => {
          const newUsers = new Map(prev);
          const user = newUsers.get(message.payload.userId);
          if (user) {
            user.x = message.payload.x;
            user.y = message.payload.y;
            newUsers.set(message.payload.userId, user);
          }
          return newUsers;
        });
        break;
      case 'movement-rejected':
        setCurrentUser((prev: any) => ({
          ...prev,
          x: message.payload.x,
          y: message.payload.y
        }));
        break;
      case 'user-left':
        setUsers(prev => {
          const newUsers = new Map(prev);
          newUsers.delete(message.payload.userId);
          return newUsers;
        });
        break;
    }
  };

  // No logic changes in this section
  const handleMove = (newX: any, newY: any) => {
    if (!currentUser) return;
    wsRef.current.send(JSON.stringify({
      type: 'move',
      payload: {
        x: newX,
        y: newY,
        userId: currentUser.userId
      }
    }));
  };

  // UI ENHANCEMENT: All changes below are purely visual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Grid UI Enhancement ---
    ctx.strokeStyle = '#f0f0f0'; // Lighter grid color
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // --- Avatar Drawing Helper Function ---
    const drawAvatar = (user: any, isCurrentUser = false) => {
      const x = user.x * 50;
      const y = user.y * 50;
      const radius = 20;

      // 1. Drop Shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      
      // 2. Gradient Fill for a 3D look
      const gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, radius/4, x, y, radius * 1.5);
      if (isCurrentUser) {
        gradient.addColorStop(0, '#a2d2ff'); // Lighter blue
        gradient.addColorStop(1, '#0077b6'); // Deeper blue for "You"
      } else {
        gradient.addColorStop(0, '#a7c957'); // Lighter green
        gradient.addColorStop(1, '#386641'); // Deeper green for others
      }
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Outline for definition
      ctx.shadowColor = 'transparent'; // Turn off shadow for outline and text
      ctx.lineWidth = 2;
      ctx.strokeStyle = isCurrentUser ? '#023e8a' : '#283618';
      ctx.stroke();
      
      // 4. Enhanced Name Tag
      const name = isCurrentUser ? 'You' : `User ${user.userId}`;
      ctx.font = 'bold 12px Arial';
      const textWidth = ctx.measureText(name).width;
      const tagPadding = 8;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Semi-transparent black background for tag
      ctx.beginPath();
      ctx.roundRect(x - textWidth/2 - tagPadding, y + radius + 8, textWidth + tagPadding*2, 22, [11]);
      ctx.fill();

      ctx.fillStyle = '#fff'; // White text
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y + radius + 24);
    };
    
    // Draw current user
    if (currentUser && currentUser.x != null) {
      drawAvatar(currentUser, true);
    }

    // Draw other users
    users.forEach(user => {
      if (user.x != null) {
        drawAvatar(user);
      }
    });
  }, [currentUser, users]);

  // No logic changes in this section
  const handleKeyDown = (e: any) => {
    if (!currentUser) return;
    const { x, y } = currentUser;
    switch (e.key) {
      case 'ArrowUp': handleMove(x, y - 1); break;
      case 'ArrowDown': handleMove(x, y + 1); break;
      case 'ArrowLeft': handleMove(x - 1, y); break;
      case 'ArrowRight': handleMove(x + 1, y); break;
    }
  };

  // --- COMPONENT LAYOUT UI ENHANCEMENT ---
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans"
      onKeyDown={handleKeyDown} 
      tabIndex={0}
      // Auto-focus the div to capture keydown events immediately
      ref={el => el?.focus()} 
    >
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Real-Time Arena</h1>
            <div className="flex items-center gap-4 p-2 bg-white rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={20} />
                <span className="font-semibold">{users.size + (currentUser?.userId ? 1 : 0)}</span>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="text-xs text-gray-500">
                <p>Space: <strong className="font-mono">{params.spaceId}</strong></p>
              </div>
            </div>
        </div>
        
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xl bg-white">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
          />
        </div>

        <div className="flex items-center justify-center mt-4 gap-2 text-gray-500 text-sm">
            <Keyboard size={18}/>
            <p>Use the <strong className="font-semibold">arrow keys</strong> to move your avatar</p>
        </div>
      </div>
    </div>
  );
};

export default Arena;