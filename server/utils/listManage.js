module.exports.addRoomToList = (clientList, room) => {
    clientList[room] = []
}

module.exports.addClientToRoom = (clientList, room, socketID) => {
    let newClient = {
        socketID : socketID,
        downloaded : new Array(50),
        numOfCurrentUploadPeers : 0
    }
    clientList[room].push(newClient)
}

module.exports.numOfClientsInRoom = (clientList, room) => {
    return clientList[room].length
}

module.exports.determineMaxNumOfRoom = () => {
    return 100
}