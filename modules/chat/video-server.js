// video server module.

let videoServer= null;
class SocialVideoChartServer {
	constructor(io) {
		this.io = io;
		this.sockets= io.sockets;
		this.initServer();
	}
	
	// init.
	initServer() {
		const This = this;
		
		// use PeerJs Library.
		// https://github.com/emyduke/webrtc-video-chart--Nodejs
		This.io.on('connect', function(socket) {
			This.logging('debug', 'New connection.');
			
			socket.on('join-room', (roomId, userId) => {
				This.logging('debug', `join-room(${roomId}, ${userId}) >> broadcast start.!!`);
				
				socket.join(roomId);
				socket.broadcast.emit('user-connected', userId);
				
				socket.on('disconnect-room', () => {
					socket.broadcast.emit('user-disconnected', userId)
				});
			});
		});
		
		This.logging('infor', 'initalize complete.');
	}
	
	// Logging
	error(err) {
		this.logging('error', err);
	}
	logging(title) {
		let logs = Array.from(arguments);
		 logs[0] = `   >> [${new Date().toLocaleString()}] VideoServer[${title}]`;
		console.log.apply(true, logs);
	}
}

module.exports.createServer = function(io) {
	videoServer = new SocialVideoChartServer(io);
	return videoServer;
};