//////////////////////////////////////////////////
/* Variable Initialize */
// One peer handles three peer
let peer1ID = null
let sendPeer1Connection = null
let sendData1Channel = null

let peer2ID = null
let sendPeer2Connection = null
let sendData2Channel = null

let peer3ID = null
let sendPeer3Connection = null
let sendData3Channel = null

let whoSendMeID = null
let receivePeerConnection = null
let receiveDataChannel = null
// Some Constraints
let peerConnectionConstraint = {
    "iceServers" : [{
        "urls" : "stun:stun.l.google.com:19302"
    },
    /*
    {
        "urls" : "turn:numb.viagenie.ca",
        "credential" : "123456",
        "username" : "terranada@naver.com"
    }*/
    ]
}
let dataChannelConstraint = null

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
const room = document.URL

const socket = io()

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room : ", room)
}

socket.on("created", function(room) {
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    console.log("Room " + room + " is now full. You can't participate webCDN")
})
socket.on("join", function(room) {
    console.log("Another peer made a request to join room " + room)
})
socket.on("joined", function(room) {
    console.log("I joined room : " + room)
    
    console.log("Start finding webCDN peer")

    // 서버에게 webCDN 피어 소켓아이디를 요청, ACK으로 받은 ID를 통해서 whoSendMeID로 세팅
    socket.emit("requestPeer", room, function(otherPeerID) {
        whoSendMeID = otherPeerID
    })
})
// 서버에서 보내는 로그들 받는 이벤트리스너
socket.on("log", function(array) {
    console.log.apply(console, array)
})

//////////////////////////////////////////////////
/* Socket.io Messages <CORE SIGNALING PART> */
function sendMessage(message) {
    console.log("Client(I) sending message: ", message);
    socket.emit("message", message);
}
socket.on("message", function(message) {
    console.log("Client received message : ", message)
    messageHandling(message)
})

//////////////////////////////////////////////////