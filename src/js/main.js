"use strict"

//////////////////////////////////////////////////
/* Variable Initialize */
let mySocketID = null

let numOfPeerConnection = 0

let peerConnection1 = null
let dataChannel1 = null

let peerConnection2 = null
let dataChannel2 = null

let peerConnection3 = null
let dataChannel3 = null

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
let room = document.URL

let socket = io()

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room", room)
}
socket.on("created", function(room, id) {
    console.log("Created room " + room)
    console.log("You are the initiator of this room " + room)
    mySocketID = id
    console.log("My Socket ID is " + mySocketID)
})
socket.on("full", function(room) {
    console.log("Room " + room + " is full")
})
socket.on("join", function(room) {
    console.log('Another peer made a request to join room ' + room)
})
socket.on('joined', function(room, id) {
    console.log('I joined: ' + room)
    mySocketID = id
    console.log("My Socket ID is " + mySocketID)
})
socket.on('log', function(array) {
    console.log.apply(console, array)
})