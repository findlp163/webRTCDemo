'use strict'

var express = require('express');
var app = express();

// /*http*/
// var http = require('http').createServer(app);
// var io = require('socket.io')(http);
// var server = http.listen(2020, '127.0.0.1', function () {
//   console.log('http:')
// });

/*https*/
var fs = require('fs');
//你的https证书
var options = {
	key: fs.readFileSync('./cert/3607503_houbourai.containersai.com.key'),
	cert: fs.readFileSync('./cert/3607503_houbourai.containersai.com.pem'),
}
var https = require('https').createServer(options, app);
var io = require('socket.io')(https);
var server = https.listen(2020,'192.168.1.79', function() {
		console.log('https:')
	});

app.use('/js', express.static('js'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

//监听客户端链接,回调函数会传递本次链接的socket
io.on('connection', function (socket) {
  //进入房间
  socket.on('create or join', function (room) {
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    if (numClients === 0) { //没有人时创建
      socket.join(room);
      socket.emit('create', room, socket.id);
    } else if (numClients === 1) { //有一人时加入
      socket.join(room);
      io.in(room).emit('join', room);
    } else { //最多两个人
      socket.emit('full', room);
    }
  });
  //呼叫
  socket.on('callOut', function (room, message) {
    socket.to(room).emit('callOut', room, message);
  });
  //呼叫回复
  socket.on('callMassage', function (room, message) {
    socket.to(room).emit('callMassage', room, message);
  });
  //发送视频流
  socket.on('signal', function (room, message) {
    socket.to(room).emit('signal', message);
  });
  socket.on('ice', function (room, message) {
    socket.to(room).emit('ice', message);
  });
  //接收视频流后返回
  socket.on('answer', function (room, message) {
    socket.to(room).emit('answer', message);
  });
  socket.on('ice_reply', function (room, message) {
    socket.to(room).emit('ice_reply', message);
  });
});

