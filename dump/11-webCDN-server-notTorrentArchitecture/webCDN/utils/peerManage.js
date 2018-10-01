// 한 피어가 전송받을 다른 피어들의 max 수.
// 일단 임의로 10명으로 잡고 있지만, WebRTC Connection이 실패하는 경우까지 20% 오버헤드 생각해서 2명을 추가해서 12명으로 한다.
module.exports.determineOptimisticPeerIdArrayNum = () => {
    return 2
}
// 한 피어가 동시에 몇명의 피어에게 업로드 할 수 있는가
// 정적으로 대략적인 계산에 의해서 모든 클라이언트에 동일하게 설정할 수도 있고, 첫 번째 전송과정에서 네트워크 속도를 대략 계산해서 동적으로 할당할 수도 있다.
module.exports.determineOptimisticUploadPeerNum = () => {
    return 2
}