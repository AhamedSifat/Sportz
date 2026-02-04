import { WebSocketServer, WebSocket } from 'ws';
import { wsArcjet } from '../arcjet.js';

const sendJson = (ws, payload) => {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
};

const broadcast = (wss, payload) => {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
};

export const createWss = (httpServer) => {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    maxPayload: 1024 * 1024,
  });

  wss.on('connection', async (ws, req) => {
    if (wsArcjet) {
      try {
        const decision = wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? 'Too Many Requests'
            : 'Access Denied';
          ws.close(code, reason);
          return;
        }
      } catch (error) {
        console.error('Arcjet middleware error', error);
        ws.close(1011, 'Internal Server Error');
        return;
      }
    }

    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });
    sendJson(ws, { type: 'welcome' });
    ws.on('error', console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  const broadcastMatchCreated = (match) => {
    broadcast(wss, { type: 'match_created', data: match });
  };

  return { broadcastMatchCreated };
};
