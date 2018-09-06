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
    room1 : [
        {
            numOfCurrentPeers : 1,
            socketID : fghuirwhg343g324g34,
            downloaded : true
        },
        {
            numOfCurrentPeers : 2,
            socketID : f489hf3247g2hg8gw34f,
            downloaded : false
        },
        ...
    ],
    room2 : [

    ],
    ...
}
*/

//////////////////////////////////////////////////
// socketIO Connecting
// Built in event
io.on("connection", (socket) => {
    console.log(`New client joined server : socket.id=${socket.id}`)

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

            // socket.broadcast.to(room).emit("join", room)
            socket.emit("joined", room)
        // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
    })
    socket.on("requestPeer", (room, ackCallback) => {
        ackCallback(findPeer(socketList, socket.id, room))
    })
    socket.on("message", () => {
        
    })
    // Built in event DISCONNECT
    socket.on("disconnect", () => {
        
    })

    // Convenience function to log server messages on the client
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

//////////////////////////////////////////////////
// Adding Room to socketList
function addRoomToList(socketList, room, socketID) {
    socketList[room] = {}
    addClientToRoom(socketList, room, socketID)
}
// Adding client to room
function addClientToRoom(socketList, room, socketID) {
    socketList[room][socketID] = {}
    socketList[room][socketID].numOfCurrentPeers = 0
    socketList[room][socketID].id = socketID
}

// For finding idle peers
function findPeer(socketList, myID, room) {
    // forEach의 iteration을 멈추는 방법은 없다.
    // Object.keys(socketList[room]).forEach((key, index) => {
    //     // 변수를 통한 Object Property접근 시에는 []를 이용한 접근을 해야함!
    //     // console.log(socketList[room][key].numOfCurrentPeers)
    //     if(socketList[room][key].numOfCurrentPeers < 3 && key != myID) {
    //         io.sockets.connected[key].emit("requestConnect", myID)
    //         console.log(key)
    //         return key
    //     }
    // })
    for(let peerID in socketList[room]) {
        if(socketList[room][peerID].numOfCurrentPeers < 3 && socketList[room][peerID].id !== myID) {
            socketList[room][peerID].numOfCurrentPeers += 1
            // io.sockets.connected[socket.id] : 특정 클라이언트에게만 이벤트를 보내는 방법
            io.sockets.connected[peerID].emit("requestConnect", myID)
            return socketList[room][peerID].id
        }
    }
}

// Deleting -, _ in socket.id because it can't be object's key
// function idParser(socketID) {
//     return socketID.split('-').join('').split('_').join('')
// }