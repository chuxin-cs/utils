/* eslint-disable */
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9090 });
console.log('Server ready...');
wss.on('connection', (ws) => {
  ws.on('error', () => {
    console.log('disconnected 断开连接');
  });
  ws.on('message', (e) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(e);
    });
  });
});