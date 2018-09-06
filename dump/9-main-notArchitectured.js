

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
// socket.on("join", function(room) {
//     console.log("Another peer made a request to join room " + room)
// })
socket.on("joined", function(room) {
    console.log("I joined room : " + room)
    
    console.log("Start finding webCDN peer")

    // 서버에게 webCDN 피어 소켓아이디를 요청, ACK으로 받은 ID를 통해서 whoSendMeID로 세팅
    socket.emit("requestPeer", room, function(otherPeerID) {
        whoSendMeID = otherPeerID
        console.log("Set whoSendMeID Complete", whoSendMeID)

        // Creating PeerConnection - Passive Channel
        createPeerConnection(peerConnectionConstraint, 0, otherPeerID)
    })
})
socket.on("requestConnect", function(otherPeerID) {
    // setSendPeerID(otherPeerID)
    // console.log("Receiving requestConnect event : ", otherPeerID)
    // console.log(`${peer1ID}, ${peer2ID}, ${peer3ID}`)

    // Creating PeerConnection - Active Channel
    createPeerConnection(peerConnectionConstraint, setSendPeerID(otherPeerID), otherPeerID)
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
/* etc */
function setSendPeerID(peerID) {
    if(peer1ID === null) {
        peer1ID = peerID
        return 1
    } else if(peer2ID === null) {
        peer2ID = peerID
        return 2
    } else {
        peer3ID = peerID
        return 3
    }
}

//////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */
// whatPeerNum - 0:whoSendMe 1:peer1 2:peer2 3:peer3
function createPeerConnection(pcConfig, whatPeerNum, otherPeerID) {
    if(whatPeerNum === 0) {
        exactPeerConnection(pcConfig, receivePeerConnection, receiveDataChannel, otherPeerID, false)
    } else if(whatPeerNum === 1) {
        exactPeerConnection(pcConfig, sendPeer1Connection, sendData1Channel, otherPeerID, true)
    } else if(whatPeerNum === 2) {
        exactPeerConnection(pcConfig, sendPeer2Connection, sendData2Channel, otherPeerID, true)
    } else {
        exactPeerConnection(pcConfig, sendPeer3Connection, sendData3Channel, otherPeerID, true)
    }
}
function exactPeerConnection(pcConfig, peerConnection, dataChannel, otherPeerID, isActive) {
    peerConnection = new RTCPeerConnection(pcConfig)
    console.log("Created RTCPeerConnection")
    
    peerConnection.onicecandidate = function(event) {
        console.log("My icecandidate event : ", event)
        if(event.candidate) {
            sendMessage({
                type : "candidate",
                label : event.candidate.sdpMLineIndex,
                id : event.candidate.sdpMid,
                candidate : event.candidate.candidate,
                to : otherPeerID
            })
        } else {
            console.log("My end of candidates")
        }
    }

    if(isActive) {
        dataChannel = peerConnection.createDataChannel("")
    } else {

    }
}

//////////////////////////////////////////////////
/* Modularization : mediaFunction.js */
