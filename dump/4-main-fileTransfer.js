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

let receiveBuffer = []
// CrypCont.pdf size = 3398669
let receivedSize = 0

//////////////////////////////////////////////////
/* Socket.io Room */
let room = "foo"

let socket = io()

if(room != '') {
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
    // createPeerConnection(isInitiator, pcConstraint)
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

//////////////////////////////////////////////////
/* etc */
/*
const dataButton = document.querySelector("#dataButton")

dataButton.onclick = function() {
    dataChannel.send("HI")
}
*/

const fileInput = document.querySelector('input#fileInput')
const downloadAnchor = document.querySelector('a#download')
const fileSendButton = document.querySelector("button#fileSendButton")

fileInput.addEventListener("change", handleFileInputChange, false)
function handleFileInputChange() {
    let file = fileInput.files[0]
    if(!file) {
        console.log("No file chosen")
    } else {
        createPeerConnection(isInitiator, pcConstraint)
    }
}

fileSendButton.onclick = function() {
    let file = fileInput.files[0]
    console.log('File is ' + [file.name, file.size, file.type, file.lastModifiedDate].join(' '))

    let chunkSize = 16384

    const sliceFile = function(offset) {
        let reader = new window.FileReader();
        reader.onload = (function() {
            return function(e) {
            dataChannel.send(e.target.result)
            if(file.size > offset + e.target.result.byteLength)
                window.setTimeout(sliceFile, 0, offset + chunkSize)
            }
        })(file)   
        let slice = file.slice(offset, offset + chunkSize)
        reader.readAsArrayBuffer(slice)
    }
    sliceFile(0)
}

//////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */
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
        dataChannel.binaryType = "arraybuffer"
        console.log("Created Data Channel")
        dataChannel.onmessage = function(event) {
            receiveBuffer.push(event.data)
            receivedSize += event.data.byteLength

            if(receivedSize === 3398669) {
                let received = new window.Blob(receiveBuffer)
                // receiveBuffer = []

                downloadAnchor.href = URL.createObjectURL(received)
                downloadAnchor.download = "CryptoConf"
                downloadAnchor.textContent = "Click to download"
                downloadAnchor.style.display = 'block'
            }
            
           console.log(event)
        }

        console.log("Creating an offer")
        peerConnection.createOffer(setLocalAndSendMessage, function(event) {
            console.log('createOffer() error: ', event)
        })
    } else {
        peerConnection.ondatachannel = function(event) {
            console.log("ondatachannel : ", event.channel)
            dataChannel = event.channel
            dataChannel.binaryType = "arraybuffer"
            console.log("Received Data Channel")

            dataChannel.onmessage = function(event) {
                receiveBuffer.push(event.data)
                receivedSize += event.data.byteLength

                if(receivedSize === 3398669) {
                    let received = new window.Blob(receiveBuffer)
                    // receiveBuffer = []

                    downloadAnchor.href = URL.createObjectURL(received)
                    downloadAnchor.download = "CryptoConf.pdf"
                }
                
               console.log(event)
            }
        }
    }
}

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

function setLocalAndSendMessage(sessionDescription) {
    peerConnection.setLocalDescription(sessionDescription)
    console.log('setLocalAndSendMessage sending message', sessionDescription)
    sendMessage(sessionDescription)
}