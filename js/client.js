'use strict'

var localVideo = document.getElementById('local_video');//本地视频
var remoteVideo = document.getElementById('remote_video');//对端视频
var callOut = document.getElementById('callOut');//呼叫按钮
var takeIn = document.getElementById('takeIn');//接受按钮
var hangUp = document.getElementById('hangUp');//挂断按钮
//添加点击事件
callOut.addEventListener('click', callOutAction);
takeIn.addEventListener('click', takeInAction);
hangUp.addEventListener('click', hangUpAction);

takeIn.disabled = true;
hangUp.disabled = true;

var localStream;
var pc1;
var pc2;
var socket = io.connect();
var config = {
	'iceServers': [{
		'urls': 'stun:stun.l.google.com:19302'
	}],
};
const offerOptions = {
	offerToReceiveVideo: 1,
	offerToReceiveAudio: 1
};
var room = '1';//自定义房间号

/*socket.emit向服务器发送消息*/
socket.emit('create or join', room);//进入房间请求

/*socket.on接收服务器消息*/
socket.on('create', function(room, id) {
	console.log('创建聊天房间', room + id);
});
socket.on('join', (room) => {
	console.log('双方已加入房间');
});
socket.on('full', (room) => {
	console.log('房间已满' + room);
});

//呼叫
function callOutAction() {
	socket.emit('callMassage', room, '2')
	callOut.disabled = true;
	hangUp.disabled = false;
}
//接起
function takeInAction() {
	socket.emit('callMassage', room, '1')
	takeIn.disabled = true;
	startAction();
}
//挂断
function hangUpAction() {
	socket.emit('callMassage', room, '0')
	closeAction()
	callOut.disabled = false;
	takeIn.disabled = true;
	hangUp.disabled = true;
}
//关闭视频
function closeAction() {
	if (pc1) {
		localStream.getTracks().forEach(track => track.stop());
		pc1.close()
	}
	if (pc2) {
		pc2.close()
	}
	pc1 = null;
	pc2 = null;
}

socket.on('callMassage', (room, message) => {
	if (message == '2') {
		console.log("收到呼叫", room, message)
		callOut.disabled = true;
		takeIn.disabled = false;
		hangUp.disabled = false;
	} else if (message == '1') {
		console.log("对方已接起", room, message)
		startAction();
	} else if (message == '0') {
		console.log('对方已挂断', room, message)
		closeAction()
	}
})
socket.on('answer', function(message) {
	if (pc1 !== 'undefined') {
		pc1.setRemoteDescription(new RTCSessionDescription(message));
		console.log('remote answer');
	}
});
socket.on('ice_reply', function(message) {
	if (pc1 !== 'undefined') {
		pc1.addIceCandidate(new RTCIceCandidate(message));
		console.log('become candidate');
	}
});
socket.on('signal', function(message) {
	// console.log("接收signal", message);
	pc2 = new RTCPeerConnection(config);
	pc2.setRemoteDescription(new RTCSessionDescription(message));
	pc2.createAnswer().then(function(answer) {
		pc2.setLocalDescription(answer);
		socket.emit('answer', room, answer);
	});

	pc2.addEventListener('icecandidate', function(event) {
		var iceCandidate = event.candidate;
		if (iceCandidate) {
			socket.emit('ice_reply', room, iceCandidate);
		}
	});

	pc2.addEventListener('addstream', function(event) {
		// console.log('这是', event.stream);
		remoteVideo.srcObject = event.stream;
	});
});
socket.on('ice', function(message) {
	// console.log("接收ice", message);
	pc2.addIceCandidate(new RTCIceCandidate(message));
});



function startAction() {
	console.log("采集");
	//采集摄像头视频
	navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})
		.then(function(mediaStream) {
			localStream = mediaStream;
			localVideo.srcObject = mediaStream;
			callAction();
			//             startButton.disabled = true;
			//             callButton.disabled = false;
		}).catch(function(error) {
			console.log(JSON.stringify(error));
		});

}

function callAction() {
	//     callButton.disabled = true;
	//     hangupButton.disabled = false;
	console.log("发送");
	//发送视频数据
	pc1 = new RTCPeerConnection(config);
	localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));

	pc1.createOffer(offerOptions).then(function(offer) {
		pc1.setLocalDescription(offer);
		socket.emit('signal', room, offer);
	});
	pc1.addEventListener('icecandidate', function(event) {
		var iceCandidate = event.candidate;
		if (iceCandidate) {
			socket.emit('ice', room, iceCandidate);
		}
	});
}
