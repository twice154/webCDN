//////////////////////////////////////////////////
/* Variable Initialize */
/*
{
    fghuirwhg343g324g34: {
        socketId: fghuirwhg343g324g34,
        downloaded: false
    },
    f489hf3247g2hg8gw34f: {
        socketId: f489hf3247g2hg8gw34f,
        downloaded: false
    },
    ...
}
*/
let mySwarm

let peerConnectionList
let dataChannelList

// let turnReady = false
/* Some Constraints */
let pcConstraint = {
    "iceServers" : [{
            "urls" : "stun:stun.l.google.com:19302"
        }
        /*
        {
            "urls" : "turn:numb.viagenie.ca",
            "credential" : "123456",
            "username" : "terranada@naver.com"
        }*/
    ]
}
let dcConstraint = null

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
const socket = io("http://localhost:3000")
const room = "foo" //document.URL

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room : ", room)
}

// Not useful in real application, just for checking in dev
socket.on("created", function(room) {
    loadAllImagesFromSource()
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    loadAllImagesFromSource()
    console.log("Room " + room + " is now full. You can't participate webCDN")
})
socket.on("joined", function(info) {
    console.log("I joined room : " + info.room)
    mySwarm = info.yourSwarm
    console.log("mySwarm is " + JSON.stringify(mySwarm, undefined, 2))

    if(Object.keys(mySwarm).length < determineMinimumPeerNumInSwarm()) {
        loadAllImagesFromSource()
    } else {
        // Starting webCDN in earnest
        loadRandomImagesFromSource(5)
    }
})

// 서버에서 보내는 로그들 받는 이벤트리스너
socket.on("log", function (array) {
    console.log.apply(console, array)
})

//////////////////////////////////////////////////
/* Socket.io Messages <CORE SIGNALING PART> */
function sendMessage(message) {
    console.log('Client(I) sending message: ', message);
    socket.emit('message', message);
}
socket.on("message", function (message) {
    console.log("Client received message : ", message)
    messageHandling(message)
})

//////////////////////////////////////////////////
/* etc */
function iterateRequestSwarmToServer() {
    setInterval(socket.emit("requestSwarm"), 5000)
}
function determineMinimumPeerNumInSwarm() {
    return 2 + 1 // +1 : 본인까지 방에 포함되기 때문에
}

//////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */

//////////////////////////////////////////////////
/* Modularization : mediaFunction.js */
function loadRandomImagesFromSource(loadNum) {

}