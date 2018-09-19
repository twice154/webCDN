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

/* For P2P Transmission */
// 어떤 ID의 피어가 현재 어떤 타입의 데이터를, 몇번째 blob을 보내는지 등의 데이터를 보관
// {
//     ID1 : {
//         type : "image",
//         num : 0, // NodeList에서 몇 번째가 될 것인가
//         startBlob : 0, // 해당 파일 내부에서
//         endBlob : 9
//     },
//     ...
// }
let whoSendWhat = {}
// 웹페이지의 imageBlob 들의 정보를 가져와서 모아놓는 부분
let imageBlobMetaDataList
// 다르게 들어오는 녀석을 임시로 저장해놓기 위함
let imageBlobMetaDataListTemp
let imageBlobMetaDataRequestNum = 0
// Image blob을 모아놓는 리스트, 전송과정에서 임시 blob 저장소 역할을 하기도 함.
let imageBlobList = []
/*
undefined : to be downloaded
0 : downloading
1 : downloaded
*/
let downloadStateImageBlobList = []

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
const room = "foo" // document.URL

// 나중에 connectWebCDN 이라는 함수안에 묶어서 webCDN 접속기준에 대하여 정의 및 모듈화
const socket = io()

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room : ", room)
}

socket.on("created", function(room) {
    startLoadImagesFromServer()
    
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    startLoadImagesFromServer()

    console.log("Room " + room + " is now full. You can't participate webCDN")
})
socket.on("joined", function(roomInfo) {
    console.log("I joined room : " + roomInfo.room)

    if(roomInfo.numInThisRoom < determineOptimisticPeerNum()) {
        startLoadImagesFromServer()
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
    return 2 + 1 // +1 : 본인까지 방에 포함되기 때문에
}
function determineOptimisticMetaDataPeerNum() {
    return 3
}
function isJson(arrbuf) {
    try {
        JSON.parse(arrbuf);
    } catch (e) {
        return false;
    }
    return true;
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
    } else if (message.sdp.type === "offer" && receivePeerConnectionList[message.fromSocket]) {
        receivePeerConnectionList[message.fromSocket].setRemoteDescription(new RTCSessionDescription(message.sdp))

        receivePeerConnectionList[message.fromSocket].createAnswer(
            function(sessionDescription) {
                receivePeerConnectionList[message.fromSocket].setLocalDescription(sessionDescription)
                console.log("createAnswer callback sending message", sessionDescription)

                sendMessage({
                    sdp : sessionDescription,
                    fromSocket : message.toSocket,
                    toSocket : message.fromSocket
                })
            },
            function(event) {
                console.log('createAnswer() error: ', event)
            }
        )
    } else if(message.sdp.type === "answer" && sendPeerConnectionList[message.fromSocket]) {
        console.log("I got an answer from remote socket : ", message.fromSocket)
        sendPeerConnectionList[message.fromSocket].setRemoteDescription(new RTCSessionDescription(message.sdp))
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

            // DataChannel이 열렸을 때, sending peer에게 현재 필요한 type과 blob번호를 보낸다.
            receiveDataChannelList[pIdList[i]].onopen = function() {
                if(imageBlobMetaDataRequestNum < determineOptimisticMetaDataPeerNum()) {
                    requestImageMetaDataToPeer(pIdList[i])
                    imageBlobMetaDataRequestNum += 1
                    console.log("requestImageMetaDataToPeer")
                }
                requestImageToPeer(pIdList[i], 0, 9)
            }

            // blob을 받고, 적절하게 설정하고, 다음 blob을 요청한다.
            receiveDataChannelList[pIdList[i]].onmessage = function(event) {
                if(isJson(event.data)) {
                    setImageMetaData(JSON.parse(event.data))
                } else {
                    setAndRequestImageToPeer(event, pIdList[i])
                }
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

    // sendDataChannelList[pId].onopen = function() {
        /* Sending images, static videos, live videos, scripts, svgs */
        // sendDataChannelList[pId].send("HI")
    // }
    
    // receive peer에게 요청을 받고, 필요한 image, static videos, live videos, scripts, svgs 를 전송해준다.
    sendDataChannelList[pId].onmessage = function(event) {
        if(event.data === "imageMetaDataRequest") {
            respondImageMetaDataToPeer(pId)
        } else {
            respondImageToPeer(event, pId)
        }
    }

    sendPeerConnectionList[pId].createOffer(
        function(sessionDescription) {
            sendPeerConnectionList[pId].setLocalDescription(sessionDescription)
            console.log("createOffer callback sending message", sessionDescription)
            
            sendMessage({
                sdp : sessionDescription,
                fromSocket : socket.id,
                toSocket : pId
            })
        },
        function(event) {
            console.log("createOffer() error : ", event)
        }
    )
}
// function setLocalAndSendMessage(sessionDescription) {
//     if(sessionDescription.type === "offer") {
//         sendPeerConnectionList[pId].setLocalDescription(sessionDescription)
//     } else if(sessionDescription.type === "answer") {
//         receivePeerConnectionList[pIdList[i]].setLocalDescription(sessionDescription)
//     }
// }

//////////////////////////////////////////////////
/* Modularization : mediaFunction.js */
function startLoadImagesFromServer() {
    const images = document.querySelectorAll("[data-src]")

    // fetch가 비동기적으로 일어나서 querySelectorAll에서 정렬된 NodeList의 순서는 고정적이지만, imageBlobList의 원소들 순서가 제각각이다. 또한 이들은 새로운 browser instance마다도 모두 다르다.
    images.forEach(function(image, index) {
        const dataSource = image.getAttribute("data-src")
        if(!dataSource)
            return

        fetch(`${image.getAttribute("data-src")}`)
            .then(function(res) {
                return res.blob()
            })
                .then(function(res) {
                    // html에서 이미지를 삽입한 케이스
                    if(image.getAttribute("src") !== null && image.getAttribute("src") === '') {
                        image.src = URL.createObjectURL(res)
                    // css에서 이미지를 삽입한 케이스
                    } else if(image.style["background-image"] !== null && image.style["background-image"] === '') {
                        image.style["background-image"] = `url(${URL.createObjectURL(res)})`
                    } else {
                        console.log("There is not src tag or background-image property")
                    }

                    res.name = image.getAttribute("data-src")
                    // 따라서 push가 아닌, 강제적으로 원소의 위치를 지정해서 넣어준다.
                    imageBlobList[index] = res
                    downloadStateImageBlobList[index] = 1
                })
    })
    socket.emit("allImageDownloadEnded", room)
    console.log("imageBlobList", imageBlobList)
}

function requestImageMetaDataToPeer(pId) {
    receiveDataChannelList[pId].send("imageMetaDataRequest")
}

function setImageMetaData(imageMetaData) {
    if(!imageBlobMetaDataList) {
        imageBlobMetaDataList = imageMetaData
    } else if(imageBlobMetaDataList && !imageBlobMetaDataListTemp) {
        if(imageBlobMetaDataList.length === imageMetaData.length) {
            if(!(JSON.stringify(imageBlobMetaDataList) === JSON.stringify(imageMetaData)))
                imageBlobMetaDataListTemp = imageMetaData
        } else {
            imageBlobMetaDataListTemp = imageMetaData
        }
    } else if(imageBlobMetaDataList && imageBlobMetaDataListTemp) {
        if(JSON.stringify(imageBlobMetaDataList) === JSON.stringify(imageMetaData)) {
            
        } else if(JSON.stringify(imageBlobMetaDataListTemp) === JSON.stringify(imageMetaData)) {
            imageBlobMetaDataList = imageMetaData
        } else {
            console.log("CRASHING IMAGE META DATA")
        }
    }

    console.log("imageBlobMetaDataList", imageBlobMetaDataList)
    console.log("imageBlobMetaDataListTemp", imageBlobMetaDataListTemp)
}

function requestImageToPeer(pId, startBlobNum, endBlobNum) {
    receiveDataChannelList[pId].send(JSON.stringify({
        num : downloadStateImageBlobList.length,
        startBlobNum,
        endBlobNum
    }))
    whoSendWhat[pId] = {
        num : downloadStateImageBlobList.length,
        startBlobNum,
        endBlobNum
    }
    imageBlobList[downloadStateImageBlobList.length] = []
    downloadStateImageBlobList[downloadStateImageBlobList.length] = 0
}

function setAndRequestImageToPeer(event, pId) {
    if(event.data === "thisImageDownloadEnded") {
        console.log("image blob transmission ended")

        // Setting downloaded blolbs to img
        let concateImage = new window.Blob(imageBlobList[whoSendWhat[pId].num])
        if(document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].getAttribute("src") !== null && document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].getAttribute("src") === '') {
            document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].src = URL.createObjectURL(concateImage)
        } else if(document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].style["background-image"] !== null && document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].style["background-image"] === '') {
            document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].style["background-image"] = `url(${URL.createObjectURL(concateImage)})`
        }

        // Set flags
        imageBlobList[whoSendWhat[pId].num] = concateImage
        downloadStateImageBlobList[whoSendWhat[pId].num] = 1
        whoSendWhat[pId].num = -1

        // Request new blob
        requestImageToPeer(pId)
    } else if(event.data === "allImageDownloadEnded") {

        // Setting downloaded blolbs to img
        let concateImage = new window.Blob(imageBlobList[whoSendWhat[pId].num])
        if(document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].getAttribute("src") !== null && document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].getAttribute("src") === '') {
            document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].src = URL.createObjectURL(concateImage)
        } else if(document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].style["background-image"] !== null && document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].style["background-image"] === '') {
            document.querySelectorAll("[data-src]")[whoSendWhat[pId].num].style["background-image"] = `url(${URL.createObjectURL(concateImage)})`
        }

        // Set flags
        imageBlobList[whoSendWhat[pId].num] = concateImage
        downloadStateImageBlobList[whoSendWhat[pId].num] = 1
        whoSendWhat[pId].num = -1

        socket.emit("allImageDownloadEnded", room)
    } else {
        imageBlobList[whoSendWhat[pId].num].push(event.data)
    }
    
    console.log(imageBlobList)
}

function respondImageMetaDataToPeer(pId) {
    let imageMetaData = []

    imageBlobList.forEach(function(imageBlob, index) {
        imageMetaData[index] = {
            name : imageBlob.name,
            size : imageBlob.size,
            type : imageBlob.type
        }
    })

    imageMetaData.flag = "imageMetaDataResponse"

    sendDataChannelList[pId].send(JSON.stringify(imageMetaData))
    console.log("imageMetaData", imageMetaData)
}

function respondImageToPeer(event, pId) {
    let image = imageBlobList[JSON.parse(event.data).num]

    console.log("Image is " + [image.name, image.size, image.type])

    // WebRTC DataChannel API Recommendation (16KB : 킬로바이트)
    let chunkSize = 16384

    const sliceFile = function(offset) {
        let reader = new window.FileReader()
        reader.onload = (function() {
            return function(e) {
                console.log("Sending image blob : end image false", e.target.result.byteLength)
                sendDataChannelList[pId].send(e.target.result)

                if(image.size > offset + e.target.result.byteLength) {
                    window.setTimeout(sliceFile, 0, offset + chunkSize)
                } else {
                    // image blob을 쪼개서 다 보낸 후, 다 전송되었다고 알리는 flag
                    if(JSON.parse(event.data).num === imageBlobList.length - 1) {
                        console.log("Sending flag : end all image true", e.target.result.byteLength)
                        sendDataChannelList[pId].send("allImageDownloadEnded")
                    } else {
                        console.log("Sending flag : end image true", e.target.result.byteLength)
                        sendDataChannelList[pId].send("thisImageDownloadEnded")
                    }
                }
            }
        })(image)

        let slice = image.slice(offset, offset + chunkSize)
        reader.readAsArrayBuffer(slice)
    }
    sliceFile(0)
}