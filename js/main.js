"use strict"

/* Variable Initialize */
// 방의 생성자인가(yes= true)
let isInitiator = false
// 두 명의 피어가 접속했는가(yes= true)
let isChannelReady = false
// Signaling작업이 이루어졌는가(yes= true)
let isStarted = false

let localPeerConnection = null
let dataChannel = null

/* Some Constraints */
let pcConstraint = null
let dataConstraint = null

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
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the seond peer of room ' + room + '!');
  isChannelReady = true
})
socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});
socket.on('log', function(array) {
  console.log.apply(console, array);
});

/* Socket.io Messages <CORE SIGNALING PART> */
function sendMessage(message) {
  console.log('Client(I) sending message: ', message);
  socket.emit('message', message);
}
socket.on("message", function(message) {

})

/* UI Event Handling */
let textLocal = document.querySelector("textarea#textLocal")
let textRemote = document.querySelector("textarea#textRemote")
let startButton = document.querySelector("button#startButton")
let sendButton = document.querySelector("button#sendButton")
let stopButton = document.querySelector("button#stopButton")