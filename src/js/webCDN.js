//////////////////////////////////////////////////
/* Variable Initialize */
// {
//     peerID1(매칭된 상대 피어 소켓아이디) : { 
//         RTCPeerConnection
//     },
//     peerID2 : {
//         RTCPeerConnection
//     },
//     ...
// }
// 내가 데이터를 받게 될 피어들
let receivePeerConnectionList = {}
let receiveDataChannelList = {}

// 내가 데이터를 보내게 될 피어들
let sendPeerConnectionList = {}
let sendDataChannelList = {}

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
let dcConstraint = null

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
const room = "foo"//document.URL

// 나중에 connectWebCDN 이라는 함수안에 묶어서 webCDN 접속기준에 대하여 정의 및 모듈화
const socket = io()

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room : ", room)
}

socket.on("created", function(room) {
    startLoadFromServer()
    
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    startLoadFromServer()

    console.log("Room " + room + " is now full. You can't participate webCDN")
})
socket.on("joined", function(roomInfo) {
    console.log("I joined room : " + roomInfo.room)

    if(roomInfo.numInThisRoom < determineOptimisticPeerNum()) {
        startLoadFromServer()
    } else {
        console.log("Start finding webCDN peer")
        
        // request to server to find webCDN peers
        socket.emit("requestPeerList", roomInfo.room)
    }
})
socket.on("requestedPeerList", function(peerIdList) {
    if(Array.isArray(peerIdList)) {
        createPeerConnectionForReceiveChannel(peerIdList)
        console.log("requestPeerList : I'm newbie")
    } else if(typeof(peerIdList) === "string") {
        createPeerConnectionForSendChannel(peerIdList)
        console.log("requestPeerList : I'm oldbie")
    }
})

// 서버에서 보내는 로그들 받는 이벤트리스너
socket.on("log", function(array) {
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
function determineOptimisticPeerNum() {
    // 15 : 동시에 파티션을 전송하게 될 피어의 수
    // 3 : 오류가 났을 때, 대응할 수 있는 Max 피어의 배율
    return 1//15 * 3
}

//////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */
function messageHandling(message) {
    if(message.type === "candidateFromReceive" && sendPeerConnectionList[message.fromSocket]) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex : message.label,
            candidate : message.candidate
        })
        sendPeerConnectionList[message.fromSocket].addIceCandidate(candidate)
    } else if(message.type === "candidateFromSend" && receivePeerConnectionList[message.fromSocket]) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex : message.label,
            candidate : message.candidate
        })
        receivePeerConnectionList[message.fromSocket].addIceCandidate(candidate)
    } else if (messgae.type === "offer") {

    } else if(message.type === "answer") {

    }
}

// 데이터를 전달받기 위한 Connection을 설정하는 부분
function createPeerConnectionForReceiveChannel(pIdList) {
    for(let i=0; i<pIdList.length; i++) {
        receivePeerConnectionList[pIdList[i]] = new RTCPeerConnection(pcConstraint)
        console.log("Created receive RTCPeerConnection")

        receivePeerConnectionList[pIdList[i]].onicecandidate = function(event) {
            console.log("My icecandidate event : ", event)
            if(event.candidate) {
                sendMessage({
                    type : "candidateFromReceive",
                    label : event.candidate.sdpMLineIndex,
                    id : event.candidate.sdpMid,
                    candidate : event.candidate.candidate,
                    fromSocket : socket.id,
                    toSocket : pIdList[i]
                })
            } else {
                console.log("My end of candidates")
            }
        }

        receivePeerConnectionList[pIdList[i]].ondatachannel = function(event) {
            console.log("ondatachannel : ", event.channel)
            receiveDataChannelList[pIdList[i]] = event.channel
            receiveDataChannelList[pIdList[i]].binaryType = "arraybuffer"
            console.log("Received receive DataChannel")

            receiveDataChannelList[pIdList[i]].onmessage = function(event) {
                // Receiving image data
                receiveCDN()
            }
        }
    }
}
// 데이터를 전달하기 위한 Connection을 설정하는 부분
function createPeerConnectionForSendChannel(pId) {
    sendPeerConnectionList[pId] = new RTCPeerConnection(pcConstraint)
    console.log("Created send RTCPeerConnection")

    sendPeerConnectionList[pId].onicecandidate = function(event) {
        console.log("My icecandidate event : ", event)
        if(event.candidate) {
            sendMessage({
                type : "candidateFromSend",
                label : event.candidate.sdpMLineIndex,
                id : event.candidate.sdpMid,
                candidate : event.candidate.candidate,
                fromSocket : socket.id,
                toSocket : pId
            })
        } else {
            console.log("My end of candidates")
        }
    }

    sendDataChannelList[pId] = sendPeerConnectionList[pId].createDataChannel(`from-${socket.id}-to-${pId}`)
    sendDataChannelList[pId].binaryType = "arraybuffer"
    console.log("Created send DataChannel")

    sendDataChannelList[pId].onopen = function() {
        //Sending image data
        sendCDN()
    }

    sendPeerConnectionList[pId].createOffer(setLocalAndSendMessage, function(event) {
        console.log("createOffer() error : ", event)
    })
}
function setLocalAndSendMessage(sessionDescription) {
    if(sessionDescription.type === "offer") {

    } else if(sessionDescription.type === "answer") {
        
    }
}

//////////////////////////////////////////////////
/* Modularization : mediaFunction.js */
function startLoadFromServer() {
    // Top-down 으로 가져오기 때문에 위에서부터 차례대로 렌더링 가능
    const images = document.querySelectorAll("[data-src]")
    images.forEach(function(image, index) {
        const dataSource = image.getAttribute("data-src")
        if(!dataSource)
            return

        // html에서 이미지를 삽입한 케이스
        if(image.getAttribute("src") !== null && image.getAttribute("src") === "") {
            image.src = dataSource
        // css에서 이미지를 삽입한 케이스
        } else if(image.style["background-image"] !== null && image.style["background-image"] === '') {
            image.style["background-image"] = `url(${dataSource})`
        } else {
            console.log("There is not src tag & backgroun-image property")
        }
    })
}

function sendCDN() {

}

function receiveCDN() {

}