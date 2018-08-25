"use strict"

//////////////////////////////////////////////////
/* Variable Initialize */
// 방의 생성자인가(yes= true)
let isInitiator = false
// localPeerConnection을 생성했는가(yes= true)
let isStarted = false

let peerConnection = null
/*
let dataChannel = null
*/
let localStream = null
let remoteStream = null

let turnReady = false

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

let sdpConstraint = {
  offerToReceiveAudio : false,
  offerToReceiveVideo : false
}

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
  gettingUserMedia()
})
socket.on('log', function(array) {
  console.log.apply(console, array)
})


/* for media stream */
function gettingUserMedia() {
  navigator.mediaDevices.getUserMedia({
    audio : false,
    video : true
  })
  .then(function(stream) {
    console.log("Adding local stream.")
    localStream = stream
    localVideo.srcObject = stream
    sendMessage("got user media")
    if (isInitiator) {
      maybeStart()
    }
  })
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name)
  })
}
function maybeStart() {
  console.log('>>>>>>> maybeStart() ')
  if (!isStarted && typeof localStream !== 'undefined') {
    console.log('>>>>>> creating peer connection')
    createPeerConnection()
    peerConnection.addStream(localStream)
    isStarted = true
    console.log('isInitiator', isInitiator)
    if (isInitiator) {
      doCall();
    }
  }
}
function createPeerConnection() {
  try {
    peerConnection = new RTCPeerConnection(pcConstraint)
    peerConnection.onicecandidate = handleIceCandidate
    peerConnection.onaddstream = handleRemoteStreamAdded
    peerConnection.onremovestream = handleRemoteStreamRemoved
    console.log('Created RTCPeerConnnection')
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message)
    alert('Cannot create RTCPeerConnection object.')
    return
  }
}
function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}
function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}
function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}
function doCall() {
  console.log('Sending offer to peer');
  peerConnection.createOffer(setLocalAndSendMessage, function(event) {
    console.log('createOffer() error: ', event);
  });
}
function setLocalAndSendMessage(sessionDescription) {
  peerConnection.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
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
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    peerConnection.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
}
function doAnswer() {
  console.log('Sending answer to peer.');
  peerConnection.createAnswer().then(
    setLocalAndSendMessage,
    function(error) {
      console.log('Failed to create session description: ' + error.toString());
    }
  );
}