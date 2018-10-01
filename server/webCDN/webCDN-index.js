//////////////////////////////////////////////////
/* Module Insertion */
const http = require("http")
const express = require("express")
const socketIO = require("socket.io")

const swarmManage = require("./utils/swarmManage.js")

const port = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

// webCDN 피어 스웜 관리
let peerSwarm = {}
/*
{
    room1 : {
        fghuirwhg343g324g34 : {
            socketId : fghuirwhg343g324g34,
            downloaded : false
        },
        f489hf3247g2hg8gw34f : {
            socketId : f489hf3247g2hg8gw34f,
            downloaded : false
        },
        ...
    },
    room2 : {

    },
    ...
}
*/

//////////////////////////////////////////////////
// socketIO Connecting
// Built in event : 새로운 클라이언트가 소켓 서버에 접속
io.on("connection", (socket) => {
    console.log(`New client joined server : socket.id=${socket.id}`)

    socket.on("create or join", (room) => {
        log("Received request to create or join room " + room)

        // 내부적으로는 socket.io room을 이용해서 관리한다.
        let clientsInRoom = io.sockets.adapter.rooms[room]
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0
        log("Room " + room + " now has " + numClients + " client(s)")

        if(numClients === 0) {
            socket.join(room)
            log("Client ID(I) " + socket.id + " created room " + room)

            swarmManage.addRoomToSwarm(peerSwarm, room)
            swarmManage.addClientToRoom(peerSwarm, room, socket.id)

            socket.emit("created", room)
            // 일단은 room 하나에 100명까지만 핸들링하도록 한다.
        } else if(numClients < swarmManage.determineMaxNumOfRoom()) {
            log("Client ID(I) " + socket.id + " joined room " + room)
            socket.join(room)

            swarmManage.addClientToRoom(peerSwarm, room, socket.id)

            socket.emit("joined", {
                room,
                yourSwarm : peerSwarm[room]
            })
            // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
    })

    // message handling from client
    socket.on("message", (message) => {
        console.log(`Server got message from client : ${message}`)
        log("Client(I) said : ", message)
        io.to(`${message.toSocket}`).emit("message", message)
    })

    // Built in event DISCONNECTING : when client disconnecting, server is running
    socket.on("disconnecting", (reason) => {
        // Object.keys(socket.rooms) returns [socketId, roomName]
        delete peerSwarm[Object.keys(socket.rooms)[1]][Object.keys(socket.rooms)[0]]
    })

    // Convenience function to log server messages on the client, not useful in real application
    function log() {
        let array = ["Message from server : "]
        array.push.apply(array, arguments)
        socket.emit("log", array)
    }
})

//////////////////////////////////////////////////
// 서버에 포트 할당
server.listen(port, () => {
    console.log(`Server is running on ${port}`)
})