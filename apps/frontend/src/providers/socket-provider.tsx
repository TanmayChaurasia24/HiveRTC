import React, { useEffect } from "react";
import { io } from "socket.io-client";
import { useMemo } from "react";

const SocketContext: any = React.createContext(null);

export const SocketProvider = (props: any) => {
  const socket = useMemo(
    () =>
        io("http://localhost:4040"),
    []
  );

  return (
    <SocketContext.Provider value={{socket}}>
      {props.children}
    </SocketContext.Provider>
  );
};


export const useSocket = () => {
    return React.useContext(SocketContext);
}