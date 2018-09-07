module.exports.addRoomToList = (clientList, room) => {
    clientList[room] = []
}
module.exports.addClientToRoom = (clientList, room, socketID) => {
    let newClient = {
        socketID : socketID,
        downloaded : false,
        numOfCurrentPeers : 0,
        currentBandwidth : 0
    }
    clientList[room].push(newClient)
}