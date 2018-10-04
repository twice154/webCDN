////////////////////////////////////////////////////////////////////////////////////////////////////
/* Modularization : webCDN.js */
//////////////////////////////////////////////////
/* Variable Initialize */
/*
{
    fghuirwhg343g324g34: {
        downloaded: false
    },
    f489hf3247g2hg8gw34f: {
        downloaded: false
    },
    ...
}
*/
// 새로 접속한 피어가 기존 피어들에게 rtcConnection 요청을 보내고, downloaded 피어는 기존의 피어들에게 rtcConnection 요청을 보낸다.
let mySwarm
/*
{
    peerID1(매칭된 상대 피어 소켓아이디) : { 
        pc : RTCPeerConnection,
        dc : RTCDataChannel
    },
    peerID2 : {
        pc : RTCPeerConnection,
        dc : RTCDataChannel
    },
    ...
}
*/
let rtcPeers = {}

// let turnReady = false
/* Some Constraints */
let pcConstraint = {
    "iceServers" : [{
            "urls" : "stun:stun.l.google.com:19302"
        }
        /*
        {
            "urls" : "turn:numb.viagenie.ca",
            "credential" : "123456",
            "username" : "terranada@naver.com"
        }*/
    ]
}
let dcConstraint = null

/*
{
    name1: {
        Blobs: [Blob, Blob, Blob, Blob, ...],
        size: 10000000
    },
    name2: {
        ...
    },
    ...
}
*/
let imageBlobs = {}

// 내가 지금 몇 명의 피어에게 업로드하고 있는가. Upload Bandwidth를 조절하기 위해서
let numOfCurrentUploads = 0

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
const socket = io("http://localhost:3000")
const room = "foo" //document.URL

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room : ", room)
}

// Not useful in real application, just for checking in dev
socket.on("created", function(room) {
    loadAllImagesFromSource()
    // iterateRequestSwarmToServer(1000)
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    loadAllImagesFromSource()
    console.log("Room " + room + " is now full. You can't participate webCDN")
})
socket.on("joined", function(info) {
    console.log("I joined room : " + info.room)
    mySwarm = info.yourSwarm
    console.log("mySwarm is " + JSON.stringify(mySwarm, undefined, 2))

    if(Object.keys(mySwarm).length < determineMinimumPeerNumInSwarm()) {
        loadAllImagesFromSource()
        // iterateRequestSwarmToServer(1000)
    } else {
        /* Starting webCDN in earnest */
        // 1. Swarm 내에 있는 다른 피어들과 WebRTC 연결을 시도한다.
        requestPeerConnection(Object.keys(mySwarm))
        startingPeerConnection(Object.keys(mySwarm))
        // 2. n개의 이미지를 소스로부터 받아온다.
        loadRandomImagesFromSource(5)
        // 3. rtcPeer들에게 내가 가진 이미지에 대한 메타데이터를 전송한다.

    }
})
socket.on("responseSwarm", function(swarm) {
    mySwarm = swarm
})

// 서버에서 보내는 로그들 받는 이벤트리스너
socket.on("log", function (array) {
    console.log.apply(console, array)
})

//////////////////////////////////////////////////
/* Socket.io Messages <CORE SIGNALING PART> */
function sendMessage(message) {
    console.log('Client(I) sending message: ', message);
    socket.emit('message', message);
}
socket.on("message", function (message) {
    console.log("Client received message : ", message)
    messageHandling(message)
})

//////////////////////////////////////////////////
/* etc */
// downloaded 피어들에게 새로운 피어들을 찾아서 이미지를 전송해주기 위해서 사용됨
function iterateRequestSwarmToServer(delay) {
    setInterval(function() {
        socket.emit("requestSwarm")
    }, delay)
}
function determineMinimumPeerNumInSwarm() {
    return 2 + 1 // +1 : 본인까지 방에 포함되기 때문에
}

////////////////////////////////////////////////////////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */
function messageHandling(message) {
    // RTCPeerConnection을 생성해서 자신과 연결하자는 신호
    if(message.type = "requestPeerConnection") {
        startingPeerConnectionBySignal(message.fromSocket)
    // PeerConnection을 처음에 요청한 피어에서 ice candidate를 전송했을 때
    } else if(message.type = "candidateFromNew" && rtcPeers[message.fromSocket].pc) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        })
        rtcPeers[message.fromSocket].pc.addIceCandidate(candidate)
    // PeerConnection 요청을 받은 피어에서 ice candidate를 전송했을 때
    } else if(message.type = "candidateFromOld" && rtcPeers[message.fromSocket].pc) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        })
        rtcPeers[message.fromSocket].pc.addIceCandidate(candidate)
    // offer를 받았을 때
    } else if(message.sdp.type = "offer" && rtcPeers[message.fromSocket].pc) {
        rtcPeers[message.fromSocket].pc.setRemoteDescription(new RTCSessionDescription(message.sdp))

        rtcPeers[message.fromSocket].pc.createAnswer(
            function(sessionDescription) {
                rtcPeers[message.fromSocket].pc.setLocalDescription(sessionDescription)
                console.log("createAnswer callback sending message", sessionDescription)

                sendMessage({
                    sdp: sessionDescription,
                    fromSocket: message.toSocket,
                    toSocket: message.fromSocket
                })
            },
            function (event) {
                console.log('createAnswer() error: ', event)
            }
        )
    // answer를 받았을 때
    } else if(message.sdp.type = "answer" && rtcPeers[message.fromSocket].pc) {
        console.log("I got an answer from remote socket : ", message.fromSocket)
        rtcPeers[message.fromSocket].pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
    }
}

// 서버에게 다른 피어들에게 WebRTC Connection Request Signal을 뿌려달라고 한다.
function requestPeerConnection(peerArray) {
    for(let i = 0; i < peerArray.length; i++) {
        sendMessage({
            type: "requestPeerConnection",
            fromSocket: socket.id,
            toSocket: peerArray[i]
        })
    }
}
// 능동적으로 PeerConnection을 생성하는 과정 : array 가 argument로 들어간다
function startingPeerConnection(peerArray) {
    for(let i = 0; i < peerArray.length; i++) {
        rtcPeers[peerArray[i]] = {}
        rtcPeers[peerArray[i]].pc = new RTCPeerConnection(pcConstraint)
        console.log("Created new RTCPeerConnection")

        rtcPeers[peerArray[i]].pc.onicecandidate = function(event) {
            console.log("My icecandidate event : ", event)
            if(event.candidate) {
                sendMessage({
                    type: "candidateFromNew",
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    fromSocket: socket.id,
                    toSocket: peerArray[i]
                })
            } else {
                console.log("My end of candidates")
            }
        }

        rtcPeers[peerArray[i]].dc = rtcPeers[peerArray[i]].pc.createDataChannel(`from-${socket.id}-to-${peerArray[i]}`)
        rtcPeers[peerArray[i]].dc.binaryType = "arraybuffer"
        console.log("Created new RTCDataChannel")
        
        rtcPeers[peerArray[i]].dc.onopen = function() {

        }

        rtcPeers[peerArray[i]].dc.onmessage = function(event) {

        }

        rtcPeers[peerArray[i]].pc.createOffer(
            function(sessionDescription) {
                rtcPeers[peerArray[i]].pc.setLocalDescription(sessionDescription)
                console.log("createOffer callback sending message", sessionDescription)
            
                sendMessage({
                    sdp: sessionDescription,
                    fromSocket: socket.id,
                    toSocket: peerArray[i]
                })
            },
            function(event) {
                console.log("createOffer() error : ", event)
            }
        )
    }
}
// 서버를 통해서 PeerConnection을 생성해 달라는 요청을 받고나서 생성 : string이 argument로 들어간다
function startingPeerConnectionBySignal(peerId) {
    rtcPeers[peerId] = {}
    rtcPeers[peerId].pc = new RTCPeerConnection(pcConstraint)
    console.log("Created new RTCPeerConnection By Signal")

    rtcPeers[peerId].pc.onicecandidate = function(event) {
        console.log("My icecandidate event : ", event)

        if(event.candidate) {
            sendMessage({
                type: "candidateFromOld",
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate,
                fromSocket: socket.id,
                toSocket: peerId
            })
        } else {
            console.log("My end of candidates")
        }
    }

    rtcPeers[peerId].pc.ondatachannel = function(event) {
        console.log("ondatachannel : ", event.channel)
        rtcPeers[peerId].dc = event.channel
        rtcPeers[peerId].dc.binaryType = "arraybuffer"
        console.log("Received DataChannel")

        rtcPeers[peerId].dc.onopen = function() {

        }

        rtcPeers[peerId].dc.onmessage = function(event) {

        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
/* Modularization : mediaFunction.js */
function loadAllImagesFromSource() {
    const images = document.querySelectorAll("[image-src]")

    // fetch가 비동기적으로 일어나서 querySelectorAll에서 정렬된 NodeList의 순서는 고정적이지만, imageBlobList의 원소들 순서가 제각각이다. 또한 이들은 새로운 browser instance마다도 모두 다르다.
    images.forEach(function(image, index) {
        const imageSource = image.getAttribute("image-src")
        if (!imageSource)
            return

        fetch(`${image.getAttribute("image-src")}`)
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

                // slicing the blob, and put them into imageBlobs
                imageBlobs[imageSource] = {
                    Blobs : [],
                    size : res.size
                }

                // WebRTC DataChannel API Recommendation (16KB : 킬로바이트)
                for(let i = 0; i < Math.ceil(res.size / 16384); i++) {
                    imageBlobs[imageSource]["Blobs"][i] = res.slice(i * 16384, (i + 1) * 16384)
                }
            })
    })
    console.log("imageBlobs", imageBlobs)
}
function loadRandomImagesFromSource(loadImageNum) {
    const images = document.querySelectorAll("[image-src]")

    // 0 <= random < images.length 에 포함된 random n개를 추출해서 배열로 만든다.
    loadImageIndex = []
    while(loadImageIndex.length < loadImageNum) {
        const random = Math.floor(Math.random() * images.length)
        if(!loadImageIndex.includes(random))
            loadImageIndex.push(random)
    }

    // fetch가 비동기적으로 일어나서 querySelectorAll에서 정렬된 NodeList의 순서는 고정적이지만, imageBlobList의 원소들 순서가 제각각이다. 또한 이들은 새로운 browser instance마다도 모두 다르다.
    images.forEach(function (image, index) {
        if(loadImageIndex.includes(index)) {
            const imageSource = image.getAttribute("image-src")
            if(!imageSource)
                return

            fetch(`${image.getAttribute("image-src")}`)
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

                    // slicing the blob, and put them into imageBlobs
                    imageBlobs[imageSource] = {
                        Blobs: [],
                        size: res.size
                    }

                    // WebRTC DataChannel API Recommendation (16KB : 킬로바이트)
                    for(let i = 0; i < Math.ceil(res.size / 16384); i++) {
                        imageBlobs[imageSource]["Blobs"][i] = res.slice(i * 16384, (i + 1) * 16384)
                    }
                })
        } else {
            const imageSource = image.getAttribute("image-src")
            if(!imageSource)
                return
            
            imageBlobs[imageSource] = {
                Blobs: [],
                size: 0
            }
        }
    })
    console.log("imageBlobs", imageBlobs)
}