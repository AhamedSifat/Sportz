import express from 'express';
import { matchesRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import { createWss } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';
import http from 'http';

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const app = express();
// Force restart for env update
const server = http.createServer(app);

// JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Sportz API!' });
});

// Security middleware
app.use(securityMiddleware());

// Matches routes
app.use('/matches', matchesRouter);
app.use('/matches', commentaryRouter);

const { broadcastMatchCreated } = createWss(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// Start server
server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`🚀 Server is running at http://${baseUrl}:${PORT}`);
  console.log(`WebSocket server running at ws://${baseUrl}:${PORT}/ws`);
});
