// 한 피어가 전송받을 다른 피어들의 max 수
module.exports.determineOptimisticPeerIdArrayNum = () => {
    return 2
}
// 한 피어가 동시에 몇명의 피어에게 업로드 할 수 있는가
module.exports.determineOptimisticUploadPeerNum = () => {
    return 2
}