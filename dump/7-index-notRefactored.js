"use strict"

//////////////////////////////////////////////////
/* Module Insertion */
let http = require("http")
let nodeStatic = require("node-static")
let socketIO = require("socket.io")

/* Initialize HTTP Server */
let fileServer = new(nodeStatic.Server)("../src")
let app = http.createServer(function(req, res) {
  fileServer.serve(req, res)
}).listen(8080)
console.log("Node.js Server Listen 8080 Port")

let io = socketIO.listen(app)

//////////////////////////////////////////////////
/* SocketIO Connection */
io.sockets.on("connection", function(socket) {

  // Convenience function to log server messages on the client
  function log() {
    let array = ["Message from server(log function) : "]
    array.push.apply(array, arguments)
    socket.emit("log", array)
  }

  socket.on("message", function(message) {
    log("Client(I) said : ", message)
    // 나중에 모든 소켓들이 아닌 같은 룸안에 있는 소켓에게만 전송하도록 바꿔야함
    socket.broadcast.emit("message", message)
  })

  socket.on("create or join", function(room) {
    log("Received request to create or join room " + room)
    
    let clientsInRoom = io.sockets.adapter.rooms[room]
    let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0
    log("Room " + room + " now has " + numClients + " client(s)");

    if (numClients === 0) {
      socket.join(room);
      log('Client ID(I) ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else if (numClients === 1) {
      log('Client ID(I) ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  })
})