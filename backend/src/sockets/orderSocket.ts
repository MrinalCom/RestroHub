import type { Server, Socket } from "socket.io";

// Rooms: "kitchen" gets every order event; "admin" gets stats-invalidation
// pings; "order:<id>" lets a single customer watch just their own order
// without broadcasting it to everyone.
export function registerOrderSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("kitchen:join", () => {
      socket.join("kitchen");
    });

    socket.on("admin:join", () => {
      socket.join("admin");
    });

    socket.on("order:watch", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("order:unwatch", (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });
  });
}
