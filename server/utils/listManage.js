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

module.exports.determineMaxNumOfRoom = () => {
    return 100
}