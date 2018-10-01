module.exports.addRoomToSwarm = (peerSwarm, room) => {
    peerSwarm[room] = {}
}

module.exports.addClientToRoom = (peerSwarm, room, socketId) => {
    let newClient = {
        socketId,
        downloaded : false
    }
    peerSwarm[room][socketId] = newClient
}

module.exports.numOfClientsInRoom = (peerSwarm, room) => {
    return Object.keys(peerSwarm[room]).length
}

// URL하나에 동시접속 가능한 최대 클라이언트수. 돌아가는 것 보고 유동적으로 바꾸자.
module.exports.determineMaxNumOfRoom = () => {
    return 100
}