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
    socket.on("create or join", function(room) {
        log("Received request to create or join room " + room)

        let clientsInRoom = io.sockets.adapter.rooms[room]
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0
        log("Room " + room + " now has " + numClients + " client(s)")
        // ClientsID 추출
        // if(numClients !== 0)
        //     console.log(Object.keys(clientsInRoom.sockets)[0])

        if(numClients === 0) {
            socket.join(room)
            log('Client ID(I) ' + socket.id + ' created room ' + room)
            socket.emit("created", room, socket.id)
        // 일단은 room 하나에 100명까지만 핸들링하도록 한다.
        } else if(numClients < 100) {
            log('Client ID(I) ' + socket.id + ' joined room ' + room)
            socket.join(room)
            socket.broadcast.to(room).emit('join', room, socket.id)
            socket.emit('joined', room, socket.id)
            // 같은 room안에 있는 임의의 소켓에게 Peer자리가 있는지 질문
            // io.sockets(Object.keys(clientsInRoom.sockets)[Math.floor(Math.random()*numClients)]).emit("canYouPeer")
        // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
    })

    socket.on("message", function(message, room) {
        log("Client(I) said : ", message)
        // 많은 room을 핸들링하게 될 때에는 연결되어있는 모든 소켓들이 아니라 특정 room에 있는 소켓들에게만 전송하도록 바꿔줘야한다
        // socket.broadcast.emit("message", message)
        socket.broadcast.to(room).emit("message", message)
    })

    socket.on("bye", function() {
        console.log("Bye bye, a peer")
    })

    // Convenience function to log server messages on the client
    function log() {
        let array = ["Message from server(log function) : "]
        array.push.apply(array, arguments)
        socket.emit("log", array)
    }
})