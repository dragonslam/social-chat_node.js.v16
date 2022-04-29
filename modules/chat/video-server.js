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
			This.logging('dbug', 'New connection.');
			
			socket.on('join-room', (roomId, userId) => {
				This.logging('dbug', `join-room(${roomId}, ${userId}) >> broadcast start.!!`);
				
				socket.join(roomId);
				socket.broadcast.emit('user-connected', userId);
				
				socket.on('disconnect-room', () => {
					socket.broadcast.emit('user-disconnected', userId)
				});
			});
		});
		
		This.logging('info', 'initalize complete.');
	}
	
	// Logging
	logging(title, msg) {
		console.log (`   >> VideoServer[${title}] ${msg}`);
	}
}

module.exports.createServer = function(io) {
	videoServer = new SocialVideoChartServer(io);
	return videoServer;
};