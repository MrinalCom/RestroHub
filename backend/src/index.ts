import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.routes.js";
import { menuRouter } from "./routes/menu.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { reservationsRouter } from "./routes/reservations.routes.js";
import { recommendRouter } from "./routes/recommend.routes.js";
import { statsRouter } from "./routes/stats.routes.js";
import { conciergeRouter } from "./routes/concierge.routes.js";
import { reviewsRouter } from "./routes/reviews.routes.js";
import { registerOrderSocket } from "./sockets/orderSocket.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.set("io", io);
registerOrderSocket(io);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/recommend", recommendRouter);
app.use("/api/stats", statsRouter);
app.use("/api/concierge", conciergeRouter);
app.use("/api/reviews", reviewsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
  console.log(`RestroHub backend listening on :${PORT}`);
});
