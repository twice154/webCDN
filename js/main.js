"use strict"

//////////////////////////////////////////////////
/* Variable Initialize */
// 방의 생성자인가(yes= true)
let isInitiator = false
// localPeerConnection을 생성했는가(yes= true)
let isStarted = false

let peerConnection = null

let dataChannel = null
/*
let localStream = null
let remoteStream = null

let turnReady = false
*/
/* Some Constraints */
let pcConstraint = {
  'iceServers': [{
    'urls' : 'stun:stun.l.google.com:19302'
  },
  /*
  {
    "urls" : "turn:numb.viagenie.ca",
    "credential" : "123456",
    "username" : "terranada@naver.com"
  }*/]
}
/*
let sdpConstraint = {
  offerToReceiveAudio : false,
  offerToReceiveVideo : false
}
*/
let dataChannelConstraint = null

let dataButton = document.querySelector("#dataButton")

//////////////////////////////////////////////////
/* Socket.io Room */
let room = "foo"

let socket = io()

if (room != '') {
  socket.emit("create or join", room)
  console.log("Attempted to create or join room", room)
}
socket.on("created", function(room) {
  console.log("Created room " + room)
  isInitiator = true
  console.log("You are the initiator of this room " + room + " : " + isInitiator)
})
socket.on("full", function(room) {
  console.log("Room " + room + " is full")
})
socket.on("join", function(room) {
  console.log('Another(or I) peer made a request to join room ' + room)
  if(isInitiator === null)
    isInitiator = false
})
socket.on('joined', function(room) {
  console.log('I joined: ' + room)
  if(isInitiator === null)
    isInitiator = false
})
socket.on("ready", function() {
  console.log("Two sockets are ready to connect")
  createPeerConnection(isInitiator, pcConstraint)
})
socket.on('log', function(array) {
  console.log.apply(console, array)
})
function createPeerConnection(isInitiator, pcConfig) {
  peerConnection = new RTCPeerConnection(pcConfig)
  console.log("Created RTCPeerConnection")
  isStarted = true

  peerConnection.onicecandidate = function(event) {
    console.log("My icecandidate event : ", event)
    if(event.candidate) {
      sendMessage({
        type : "candidate",
        label : event.candidate.sdpMLineIndex,
        id : event.candidate.sdpMid,
        candidate : event.candidate.candidate
      })
    } else {
      console.log("My end of candidates")
    }
  }

  // Creating Data Channel
  if(isInitiator) {
    console.log("Creating Data Channel")
    dataChannel = peerConnection.createDataChannel("webCDN")
    console.log("Created Data Channel")
    dataChannel.onmessage = function(event) {
      console.log("I GOT A MESSAGE THROUGH DATA CHANNEL!!!")
    }

    console.log("Creating an offer")
    peerConnection.createOffer(setLocalAndSendMessage, function(event) {
      console.log('createOffer() error: ', event)
    })
  } else {
    peerConnection.ondatachannel = function(event) {
      console.log("ondatachannel : ", event.channel)
      dataChannel = event.channel
      console.log("Received Data Channel")

      dataChannel.onmessage = function(event) {
        console.log("I GOT A MESSAGE THROUGH DATA CHANNEL!!!")
      }
    }
  }
}

//////////////////////////////////////////////////
/* Socket.io Messages <CORE SIGNALING PART> */
function sendMessage(message) {
  console.log('Client(I) sending message: ', message);
  socket.emit('message', message);
}
socket.on("message", function(message) {
  console.log("Client received message : ", message)
  messageHandling(message)
})
function messageHandling(message) {
  if(message.type === "offer") {
    if(!isInitiator && !isStarted)
      createPeerConnection(isInitiator, pcConstraint)
    
    peerConnection.setRemoteDescription(new RTCSessionDescription(message))
    console.log("Creating Answer")
    peerConnection.createAnswer(setLocalAndSendMessage, function(event) {
      console.log('createAnswer() error: ', event)
    })
  } else if(message.type === "answer" && isStarted) {
    console.log("I got an answer")
    peerConnection.setRemoteDescription(new RTCSessionDescription(message))
  } else if(message.type === "candidate" && isStarted) {
    let candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    })
    peerConnection.addIceCandidate(candidate)
  }
}

//////////////////////////////////////////////////
/* Callbacks & EventHanlers */
function setLocalAndSendMessage(sessionDescription) {
  peerConnection.setLocalDescription(sessionDescription)
  console.log('setLocalAndSendMessage sending message', sessionDescription)
  sendMessage(sessionDescription)
}

dataButton.onclick = function() {
  dataChannel.send("HI")
}