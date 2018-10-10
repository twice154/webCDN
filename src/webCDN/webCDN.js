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
/*
{
    name1: {
        size: 10000000
    },
    name2: {
        ...
    },
    ...
}
*/
let imageBlobsMeta = {}
// imageBlobs는 un-downloaded인 size 0 짜리도 저장을 하지만, imageBlobsMeta는 다른 피어에게 본인이 가진 것들을 알려줘야 하기 때문에 저장하지 않는다.

// 내가 지금 몇 명의 피어에게 업로드하고 있는가. Upload Bandwidth를 조절하기 위해서
// let numOfCurrentUploads = 0

/* 새로운 피어가 접속했을때 데이터 주고받는 Convention
1. Swarm 내에 이미 존재하는 피어들과 WebRTC 연결 [Async]
2. n개의 img 다운로드 [Async]
-------------------------------------------------- 위의 Async 작업들이 완료된 시점에서
3. 새로운 피어가 본인의 img-metadata 전송
4. 기존의 피어가 받고 싶은 img-name, 본인의 img-metadata 전송
5. 새로운 피어가 img-file과 ,,, 받고 싶은 img-name, 본인의 img-metadata 전송
6. 기존의 피어가 img-file과 ,,, 받고 싶은 img-name, 본인의 img-metadata 전송
7. 5,6번의 과정을 두 피어가 모두 다운로드 완료될때까지 반복
8. 두 피어가 모두 다운로드가 완료되면 서로의 RTCPeerConnection을 해제
*/
/* downloaded 피어가 데이터 주고받는 Convention
1. 기존에 연결되어있는 피어들은 downloaded될 때까지 책임을 진다
2. downloaded 피어와는 연결을 해제하고 새로운 non-downloaded 피어를 찾아서 연결 요청을 보낸다.
3. 위의 새로운 피어가 접속했을때 데이터 주고받는 Convention 사용
*/
/*
{
    metadata : {imageBlobsMeta, videoBlobsMeta ...},
    want : {imageBlobs에 있는 name 프로퍼티, startingBlobNum: 0} -> startingBlobNum부터 해서 10개 전송해준다. (0~9 번까지)
}
*/

//////////////////////////////////////////////////
/* Socket.io Initialize */
// URL주소를 통해서 room 구분
const socket = io("http://localhost:3000")
const room = "foo" //document.URL

if(room != '') {
    socket.emit("create or join", room)
    console.log("Attempted to create or join room : ", room)
}

socket.on("created", function(room) {
    loadAllImagesFromSource()
        .then(function() {
            // downloaded 피어가 데이터 주고받는 Convention에 따라서 진행

        })
    // iterateRequestSwarmToServer(1000)
    console.log("Created room " + room)
})
socket.on("full", function(room) {
    console.log("Room " + room + " is now full. You can't participate webCDN")
    // socket을 서버에서 연결 해제한다
    socket.close()
    loadAllImagesFromSource()
        .then(function() {
            // do nothing
        })
})
socket.on("joined", function(info) {
    console.log("I joined room : " + info.room)
    deleteMeInSwarm(info.yourSwarm)
    mySwarm = info.yourSwarm
    console.log("mySwarm is " + JSON.stringify(mySwarm, undefined, 2))

    if(Object.keys(mySwarm).length < determineMinimumPeerNumInSwarm()) {
        loadAllImagesFromSource()
            .then(function() {
                // downloaded 피어가 데이터 주고받는 Convention에 따라서 진행

            })
        // iterateRequestSwarmToServer(1000)
    } else {
        /* Starting webCDN in earnest */
        // 1. Swarm 내에 있는 다른 피어들과 WebRTC 연결을 시도한다. -> 그냥 WebRTC 연결이되기만 하면 되서 img-download와 sync를 맞출 필요가 없다
        requestPeerConnection(Object.keys(mySwarm))
        startingPeerConnection(Object.keys(mySwarm))
        // 2. n개의 이미지를 소스로부터 받아온다.
        loadRandomImagesFromSource(5)
    }
})
socket.on("responseSwarm", function(swarm) {
    deleteMeInSwarm(swarm)
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
function isJson(arrbuf) {
    try {
        JSON.parse(arrbuf)
    } catch (e) {
        return false
    }
    return true
}
// swarm을 서버에서 전송받으면 거기에 본인도 포함되어있어서, 본인과 WebRTC Connection하는 것을 방지하기 위해서
function deleteMeInSwarm(swarm) {
    delete swarm[socket.id]
}

////////////////////////////////////////////////////////////////////////////////////////////////////
/* Modularization : torrentFunction.js */
function pieceSelectionAlgorithm() {
    return 0
}

/* TODO
- Swarm에 있는 피어들이 모두 가지고 있지 않은 파일을 어떻게 식별하고 어느시점에 서버에서 불러올 것인가
*/

////////////////////////////////////////////////////////////////////////////////////////////////////
/* Modularization : webrtcFunction.js */
function messageHandling(message) {
    // RTCPeerConnection을 생성해서 자신과 연결하자는 신호
    if(message.type = "requestPeerConnection") {
        startingPeerConnectionBySignal(message.fromSocket)
    // PeerConnection을 처음에 요청한 피어에서 ice candidate를 전송했을 때 -> sync 문제 생겼을 시 해결해야할 부분
    } else if(message.type = "candidateFromNew" && rtcPeers[message.fromSocket].pc) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        })
        rtcPeers[message.fromSocket].pc.addIceCandidate(candidate)
    // PeerConnection 요청을 받은 피어에서 ice candidate를 전송했을 때 -> sync 문제 생겼을 시 해결해야할 부분
    } else if(message.type = "candidateFromOld" && rtcPeers[message.fromSocket].pc) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        })
        rtcPeers[message.fromSocket].pc.addIceCandidate(candidate)
    // offer를 받았을 때 -> sync 문제 생겼을 시 해결해야할 부분
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
            // 3. 새로운 피어가 본인의 img-metadata 전송
            sendMetaDataBetweenPeer(rtcPeers[peerArray[i]].dc, false)
        }

        rtcPeers[peerArray[i]].dc.onmessage = function(event) {

        }

        // sync 문제가 발생한다면, 상대방도 PeerConnection 생성을 완료했다는 시그널을 받은 후에 전송하도록 옮겨야함
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

        // rtcPeers[peerId].dc.onopen = function() {

        // }

        rtcPeers[peerId].dc.onmessage = function(event) {

        }
    }
}

function sendMetaDataBetweenPeer(peerDataChannel, wantActivate) {
    if(wantActivate) {
        peerDataChannel.send(JSON.stringify({
            metadata: {
                imageBlobsMeta
            },
            want: pieceSelectionAlgorithm()
        }))
    } else {
        peerDataChannel.send(JSON.stringify({
            metadata: {
                imageBlobsMeta
            },
            want: undefined
        }))
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
/* Modularization : mediaFunction.js */
function loadAllImagesFromSource() {
    return new Promise(function (resolve, reject) {
        const images = document.querySelectorAll("[image-src]")
        // images.length와 비교해서 값이 같아지면 downloaded라고 판단. async한 fetch호출에 대해서 sync를 맞추기 위함
        let downloadedFlag = 0

        // fetch가 비동기적으로 일어나서 querySelectorAll에서 정렬된 NodeList의 순서는 고정적이지만, imageBlobList의 원소들 순서가 제각각이다. 또한 이들은 새로운 browser instance마다도 모두 다르다.
        images.forEach(function (image, index) {
            const imageSource = image.getAttribute("image-src")
            if (!imageSource)
                return

            // Async 호출 : 메인 쓰레드에서도 비동기적으로 실행된다.
            fetch(`${image.getAttribute("image-src")}`)
                .then(function (res) {
                    return res.blob()
                })
                .then(function (res) {
                    // html에서 이미지를 삽입한 케이스
                    if (image.getAttribute("src") !== null && image.getAttribute("src") === '') {
                        image.src = URL.createObjectURL(res)
                        // css에서 이미지를 삽입한 케이스
                    } else if (image.style["background-image"] !== null && image.style["background-image"] === '') {
                        image.style["background-image"] = `url(${URL.createObjectURL(res)})`
                    } else {
                        console.log("There is not src tag or background-image property")
                    }

                    imageBlobsMeta[imageSource] = {
                        size: res.size
                    }
                    // slicing the blob, and put them into imageBlobs
                    imageBlobs[imageSource] = {
                        Blobs: [],
                        size: res.size
                    }

                    // WebRTC DataChannel API Recommendation (16KB : 킬로바이트)
                    for (let i = 0; i < Math.ceil(res.size / 16384); i++) {
                        imageBlobs[imageSource]["Blobs"][i] = res.slice(i * 16384, (i + 1) * 16384)
                    }

                    downloadedFlag += 1;

                    // downloaded이고, socket이 서버에 연결되어 있을 때(image 다운로드를 완료한 시점에서 sync를 맞추려면 여기 안에다가 작성해야함) -> Promise로 변환
                    if (downloadedFlag === images.length && socket.connected) {
                        socket.emit("imageDownloadedAll")
                        resolve()
                    }
                })
        })
        // fetch가 Async하긴한데, imageBlobs에 알맞은 값들이 출력된다.
        console.log("imageBlobs", imageBlobs)
    })
}
function loadRandomImagesFromSource(loadImageNum) {
    const images = document.querySelectorAll("[image-src]")
    // images.length와 비교해서 값이 같아지면 downloaded라고 판단. async한 fetch호출에 대해서 sync를 맞추기 위함
    let downloadedNumFlag = 0

    // 0 <= random < images.length 에 포함된 random n개를 추출해서 배열로 만든다.
    loadImageIndex = []
    while (loadImageIndex.length < loadImageNum) {
        const random = Math.floor(Math.random() * images.length)
        if (!loadImageIndex.includes(random))
            loadImageIndex.push(random)
    }

    // fetch가 비동기적으로 일어나서 querySelectorAll에서 정렬된 NodeList의 순서는 고정적이지만, imageBlobList의 원소들 순서가 제각각이다. 또한 이들은 새로운 browser instance마다도 모두 다르다.
    images.forEach(function (image, index) {
        if (loadImageIndex.includes(index)) {
            const imageSource = image.getAttribute("image-src")
            if (!imageSource)
                return

            fetch(`${image.getAttribute("image-src")}`)
                .then(function (res) {
                    return res.blob()
                })
                .then(function (res) {
                    // html에서 이미지를 삽입한 케이스
                    if (image.getAttribute("src") !== null && image.getAttribute("src") === '') {
                        image.src = URL.createObjectURL(res)
                        // css에서 이미지를 삽입한 케이스
                    } else if (image.style["background-image"] !== null && image.style["background-image"] === '') {
                        image.style["background-image"] = `url(${URL.createObjectURL(res)})`
                    } else {
                        console.log("There is not src tag or background-image property")
                    }

                    imageBlobsMeta[imageSource] = {
                        size: res.size
                    }
                    // slicing the blob, and put them into imageBlobs
                    imageBlobs[imageSource] = {
                        Blobs: [],
                        size: res.size
                    }

                    // WebRTC DataChannel API Recommendation (16KB : 킬로바이트)
                    for (let i = 0; i < Math.ceil(res.size / 16384); i++) {
                        imageBlobs[imageSource]["Blobs"][i] = res.slice(i * 16384, (i + 1) * 16384)
                    }

                    downloadedNumFlag += 1;

                    // Input num만큼의 이미지를 다운로드 했고, socket이 서버에 연결되어 있을 때(image 다운로드를 완료한 시점에서 sync를 맞추려면 여기 안에다가 작성해야함) -> Promise로 변환
                    // if (downloadedNumFlag === loadImageNum && socket.connected) {
                    
                    // }
                })
        } else {
            const imageSource = image.getAttribute("image-src")
            if (!imageSource)
                return

            imageBlobs[imageSource] = {
                Blobs: [],
                size: 0
            }
        }
    })
    console.log("imageBlobs", imageBlobs)
}