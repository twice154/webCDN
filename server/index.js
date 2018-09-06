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

// webCDN 피어 모아놓는 객체
let clientList = {}
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

        let numClients = ::findClientsInRoom
        log("Room " + room + " now has " + numClients + " client(s)")

        if(numClients === 0) {
            socket.join(room)
            log("Client ID(I) " + socket.id + " created room " + room)

            ::addRoomToList

            socket.emit("created", room)
        // 일단은 room 하나에 100명까지만 핸들링하도록 한다.
        } else if(numClients < 100) {
            log("Client ID(I) " + socket.id + " joined room " + room)
            socket.join(room)

            ::addClientToRoom

            // socket.broadcast.to(room).emit("join", room)
            socket.emit("joined", room)
        // room 하나에 100명 초과되면 full로 더 이상 webCDN 동작X
        } else {
            socket.emit("full", room)
        }
    })

})

//////////////////////////////////////////////////
// 서버에 포트 할당
server.listen(port, () => {
    console.log(`Server is running on ${port}`)
})