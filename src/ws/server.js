import { WebSocketServer, WebSocket } from 'ws';
import { wsArcjet } from '../arcjet.js';

const sendJson = (socket, payload) => {
  if (ws.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
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

  httpServer.on('upgrade', async (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname !== '/ws') {
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
          } else {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          }
          socket.destroy();
          return;
        }
      } catch (e) {
        console.error('WS upgrade protection error', e);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', async (socket, req) => {
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });
    sendJson(socket, { type: 'welcome' });
    socket.on('error', console.error);
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
