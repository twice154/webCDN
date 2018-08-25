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

let localVideo = document.querySelector("#localVideo")
let remoteVideo = document.querySelector("#remoteVideo")

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
  console.log("You are the initiator of this room ${room}! : ${isInitiator}")
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
  
})
socket.on('log', function(array) {
  console.log.apply(console, array)
})

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
  console.log('Client received message:', message);

}