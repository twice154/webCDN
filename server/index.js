//////////////////////////////////////////////////
/* Module Insertion */
const path = require("path")
const http = require("http")
const express = require("express")
const socketIO = require("socket.io")

const srcPath = path.join(__dirname, "../src")
const port = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

app.use(express.static(srcPath))

// 선입선출 webCDN 피어배정
let socketList = {}
/*
{
    room1 : {
        socket1 : {
            numOfCurrentPeers : 1
        },
        socket2 : {
            numOfCurrentPeers : 2
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
// Built in event
io.on("connection", (socket) => {
    conosole.log(`New client joined server : socket.id=${socket.id}`)

    socket.on("create or join", (room) => {
        log("Received request to create or join room " + room)

        let clientsInRoom = io.sockets.adapter.rooms[room]
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0
        log("Room " + room + " now has " + numClients + " client(s)")

        if(numClients === 0) {
            socket.join(room)
            log("Client ID(I) " + socket.id + " created room " + room)

            addRoomToList(socketList, room, socket.id)

            socket.emit("created", room)
        // 일단은 room 하나에 100명까지만 핸들링하도록 한다.
        } else if(numClients < 100) {
            log("Client ID(I) " + socket.id + " joined room " + room)
            socket.join(room)

            addClientToRoom(socketList, room, socket.id)

            socket.broadcast.to(room).emit("join", room)
            socket.emit("joined", room)
        // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
    })
    socket.on("requestPeer", (room, ackCallback) => {
        ackCallback(findPeer(socketList))
    })
    // Built in event DISCONNECT
    socket.on("disconnect", () => {
        
    })
})

//////////////////////////////////////////////////
// 서버에 포트 할당
server.listen(port, () => {
    console.log(`Server is running on ${port}`)
})

//////////////////////////////////////////////////
// Convenience function to log server messages on the client
function log() {
    let array = ["Message from server : "]
    array.push.apply(array, arguments)
    socket.emit("log", array)
}

// Adding Room to socketList
function adddRoomToList(socketList, room, socketID) {
    socketList[`${room}`] = {}
    addClientToRoom(socketList, room, socketID)
}
// Adding client to room
function addClientToRoom(socketList, room, socketID) {
    socketList[room][`${socketID}`] = {}
    socketList[`${room}`][`${socketID}`].numOfCurrentPeers = 0
    socketList[`${room}`][`${socketID}`].id = socketID
}

// For finding idle peers
function findPeer(socketList) {
    for(let peerID in socketList[`${room}`]) {
        if(peerID.numOfCurrentPeers < 3) {
            // io.sockets.connected[socket.id] : 특정 클라이언트에게만 이벤트를 보내는 방법
            io.sockets.connected[peerID].emit()
            return peerID.id
        }
    }
}