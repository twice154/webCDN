//////////////////////////////////////////////////
/* Variable Initialize */
let receivePeerConnectionList = []
let receiveDataChannelList = []

let sendPeerConnectionList = []
let sendDataChannelList = []

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
        createPeerConnectionForReceiveChannel(receivePeerConnectionList, receiveDataChannelList, pcConstraint, dcConstraint, peerIdList)
        console.log("requestPeerList : I'm newbie")
    } else if(typeof(peerIdList) === "string") {
        createPeerConnectionForSendChannel(sendPeerConnectionList, sendDataChannelList, pcConstraint, dcConstraint, peerIdList)
        console.log("requestPeerList : I'm oldbie")
    }
})

// 서버에서 보내는 로그들 받는 이벤트리스너
socket.on("log", function(array) {
    console.log.apply(console, array)
})

//////////////////////////////////////////////////
/* Socket.io Messages <CORE SIGNALING PART> */

//////////////////////////////////////////////////
/* etc */
function determineOptimisticPeerNum() {
    // 15 : 동시에 파티션을 전송하게 될 피어의 수
    //  : 오류가 났을 때, 대응할 수 있는 Max 피어의 배율
    return 1//15 * 3
}

//////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */
function createPeerConnectionForReceiveChannel(pcList, dcList, pcConfig, dcConfig, pIdList) {

}
function createPeerConnectionForSendChannel(pcList, dcList, pcConfig, dcConfig, pIdList) {
    pcList[pcList.length] = new RTCPeerConnection(pcConfig)
    console.log("Created send RTCPeerConnection")

    pcList[pcList.length].onicecandidate = function(event) {
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