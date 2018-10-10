module.exports.addRoomToSwarm = (peerSwarm, room) => {
    peerSwarm[room] = {}
}

module.exports.addClientToRoom = (peerSwarm, room, socketId) => {
    const newClient = {
        imageDownloaded : false
    }
    peerSwarm[room][socketId] = newClient
}

// URL하나에 동시접속 가능한 최대 클라이언트수. 돌아가는 것 보고 유동적으로 바꾸자.
module.exports.determineMaxNumOfRoom = () => {
    return 100
}