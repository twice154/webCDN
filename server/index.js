//////////////////////////////////////////////////
/* Module Insertion */
const path = require("path")
const http = require("http")
const express = require("express")
const socketIO = require("socket.io")

const listManage = require("./utils/listManage.js")

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
    room1 : [
        {
            volume : 1642, [Byte]
            properNumOfPeers : 3, [몇 명의 피어가 나누어서 webCDN 전송을 하는 것이 적절한가]
        },
        {
            socketID : fghuirwhg343g324g34,
            downloaded : true,
            numOfCurrentPeers : 1,
            currentBandwidth : 3
        },
        {
            socketID : f489hf3247g2hg8gw34f,
            downloaded : false,
            numOfCurrentPeers : 2,
            currentBandwidth : 2
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

            // fetch and check the website's volume to decide how many peers to connect.


            listManage.addRoomToList(clientList, room)
            listManage.addClientToRoom(clientList, room, socket.id)

            socket.emit("created", room)
        // 일단은 room 하나에 100명까지만 핸들링하도록 한다.
        } else if(numClients < 100) {
            log("Client ID(I) " + socket.id + " joined room " + room)
            socket.join(room)

            listManage.addClientToRoom(clientList, room, socket.id)

            // socket.broadcast.to(room).emit("join", room)
            socket.emit("joined", room)

            // request webCDN peers to connect newbie and send data
            //
        // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
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