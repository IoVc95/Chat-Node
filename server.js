// server.js - Chat en tiempo real con WebSocket
// Ejecutar con: npm install && npm start

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 3000;

// Servidor HTTP: solo entrega el cliente (index.html)
const server = http.createServer((req, res) => {
  const archivo = path.join(__dirname, "public", "index.html");
  fs.readFile(archivo, (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Error cargando el cliente");
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

// Servidor WebSocket montado sobre el mismo servidor HTTP
const wss = new WebSocketServer({ server });

// Envía un objeto JSON a todos los clientes conectados
function broadcast(obj) {
  const mensaje = JSON.stringify(obj);
  wss.clients.forEach((cliente) => {
    if (cliente.readyState === WebSocket.OPEN) cliente.send(mensaje);
  });
}

function enviarConteo() {
  broadcast({ tipo: "usuarios", cantidad: wss.clients.size });
}

wss.on("connection", (ws) => {
  ws.nombre = "Anónimo";

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return; // ignorar mensajes que no sean JSON
    }

    // Primer mensaje del cliente: definir nombre
    if (msg.tipo === "ingresa a la sala") {
      ws.nombre = String(msg.nombre || "Anónimo").slice(0, 20);
      broadcast({ tipo: "sistema", texto: `${ws.nombre} se unió al chat` });
      enviarConteo();
      return;
    }

    // Mensaje normal de chat
    if (msg.tipo === "mensaje") {
      const texto = String(msg.texto || "").trim().slice(0, 500);
      if (!texto) return;
      broadcast({
        tipo: "mensaje",
        nombre: ws.nombre,
        texto,
        hora: new Date().toLocaleTimeString("es-EC", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
  });

  ws.on("close", () => {
    broadcast({ tipo: "sistema", texto: `${ws.nombre} salió del chat` });
    enviarConteo();
  });
});

server.listen(PORT, () => {
  console.log(`Chat corriendo en http://localhost:${PORT}`);
});