//////////////////////////////////////////////////
/* Module Insertion */
const path = require("path")
const http = require("http")
const express = require("express")
const socketIO = require("socket.io")

const listManage = require("./utils/listManage.js")
const peerManage = require("./utils/peerManage.js")

const srcPath = path.join(__dirname, "../src")
const port = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
const io = socketIO(server)

app.use(express.static(srcPath))

// webCDN 피어 모아놓는 객체
let clientList = {}
/*
{
    room1 : {
        fghuirwhg343g324g34 : {
            socketId : fghuirwhg343g324g34,
            downloaded : [true],
            numOfCurrentUploadPeers : 1
        },
        f489hf3247g2hg8gw34f : {
            socketId : f489hf3247g2hg8gw34f,
            downloaded : [false],
            numOfCurrentUploadPeers : 2
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
    console.log(`New client joined server : socket.id=${socket.id}`)

    socket.on("create or join", (room) => {
        log("Received request to create or join room " + room)

        let clientsInRoom = io.sockets.adapter.rooms[room]
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0
        log("Room " + room + " now has " + numClients + " client(s)")

        if(numClients === 0) {
            socket.join(room)
            log("Client ID(I) " + socket.id + " created room " + room)

            listManage.addRoomToList(clientList, room)
            listManage.addClientToRoom(clientList, room, socket.id)

            socket.emit("created", room)
        // 일단은 room 하나에 100명까지만 핸들링하도록 한다.
        } else if(numClients < listManage.determineMaxNumOfRoom()) {
            log("Client ID(I) " + socket.id + " joined room " + room)
            socket.join(room)

            listManage.addClientToRoom(clientList, room, socket.id)

            socket.emit("joined", {
                room,
                numInThisRoom : listManage.numOfClientsInRoom(clientList, room)
            })
        // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
    })
    socket.on("requestPeerList", (room) => {
        let peerIdList = []
        let clientKeysInRoom = Object.keys(clientList[room])
        
        for(let i=0; i<clientKeysInRoom.length; i++) {
            if(peerIdList.length === peerManage.determineOptimisticPeerIdArrayNum())
                break
            if(clientList[room][clientKeysInRoom[i]].numOfCurrentUploadPeers < peerManage.determineOptimisticUploadPeerNum()) {
                peerIdList.push(clientKeysInRoom[i])
                clientList[room][clientKeysInRoom[i]].numOfCurrentUploadPeers += 1
            }
        }
        // for(let i=0; i<clientList[room].length; i++) {
        //     if(peerIdList.length === peerManage.determineOptimisticPeerIdArrayNum())
        //         break
        //     if(clientList[room][i].numOfCurrentUploadPeers < peerManage.determineOptimisticUploadPeerNum())
        //         peerIdList.push(clientList[room][i].socketId)
        //         clientList[room][i].numOfCurrentUploadPeers += 1
        // }

        // 새로 접속한 피어에게
        socket.emit("requestedPeerList", peerIdList)
        // 기존에 있던 피어들에게
        for(let i=0; i<peerIdList.length; i++) {
            io.to(`${peerIdList[i]}`).emit("requestedPeerList", socket.id)
        }
    })
    socket.on("message", (message) => {
        console.log(`Server got message from client : ${message}`)
        log("Client(I) said : ", message)
        io.to(`${message.to}`).emit("message", message)
    })
    // Built in event DISCONNECT : when client disconnected, server is running
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