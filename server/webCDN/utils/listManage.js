module.exports.addRoomToList = (clientList, room) => {
    clientList[room] = {}
}

module.exports.addClientToRoom = (clientList, room, socketId) => {
    let newClient = {
        socketId : socketId,
        downloaded : false,
        numOfCurrentUploadPeers : 0
    }
    clientList[room][socketId] = newClient
}

module.exports.numOfClientsInRoom = (clientList, room) => {
    return Object.keys(clientList[room]).length
}

// URL하나에 동시접속 가능한 최대 클라이언트수. 돌아가는 것 보고 유동적으로 바꾸자.
module.exports.determineMaxNumOfRoom = () => {
    return 100
}