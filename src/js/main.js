//////////////////////////////////////////////////
/* Variable Initialize */

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
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    console.log("Room " + room + " is now full. You can't participate webCDN")
})
socket.on("joined", function(room) {
    console.log("I joined room : " + room)
    
    console.log("Start finding webCDN peer")
    // request to server to find webCDN peers
    //
})

// 서버에서 보내는 로그들 받는 이벤트리스너
socket.on("log", function(array) {
    console.log.apply(console, array)
})

//////////////////////////////////////////////////
/* Socket.io Messages <CORE SIGNALING PART> */

//////////////////////////////////////////////////
/* etc */

//////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */

//////////////////////////////////////////////////
/* Modularization : mediaFunction.js */