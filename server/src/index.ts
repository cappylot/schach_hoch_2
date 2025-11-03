import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { registerSocketHandlers } from './sockets';

const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);

const { io } = registerSocketHandlers(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  io.close();
  httpServer.close();
});

process.on('SIGINT', () => {
  io.close();
  httpServer.close();
});
