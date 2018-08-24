"use strict"

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
*/
let turnReady = false

/* Some Constraints */
let pcConstraint = {
  'iceServers': [{
    'urls' : 'stun:stun.l.google.com:19302'
  }]
}
/*
let sdpConstraint = {
  offerToReceiveAudio : true,
  offerToReceiveVideo : true
}
*/
let dataChannelConstraint = null

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
})
socket.on("full", function(room) {
  console.log("Room " + room + " is full")
})
socket.on("join", function(room) {
  console.log('Another peer made a request to join room ' + room)
  if(isInitiator === null)
    isInitiator = false
})
socket.on('joined', function(room) {
  console.log('Another peer joined: ' + room)
  if(isInitiator === null)
    isInitiator = false
})
socket.on("ready", function() {
  console.log("Two sockets are ready to connect")
  // createPeerConnection(isInitiator)
})
socket.on('log', function(array) {
  console.log.apply(console, array)
})

/* Socket.io Messages <CORE SIGNALING PART> */
function sendMessage(message) {
  console.log('Client(I) sending message: ', message);
  socket.emit('message', message);
}
socket.on("message", function(message) {
  console.log("Client received message : ", message)
  // messageHandling(isInitiator, message)
})
