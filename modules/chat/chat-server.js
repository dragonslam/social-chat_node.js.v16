// chart server module.

const Session = require('./chat-session.js');
const Manager = require('./chat-session-manager.js');

let chatServer= null;
class SocialChartServer {
	constructor(io) {
		this.io = io;
		this.sockets= io.sockets;
		this.manager= Manager.create();
		this.counts = 0;
		this.current= 0;
		this.colors	= ['#3b08cc','#cc084f','#08cc27','#08ccc0','#cc8908'];
		this.initServer();
	}
	
	// init.
	initServer() {
		const This = this;
		This.sockets.on('connect', function(currentSocket) {
			const session = Session.connect('New Member');
			This.logging('dbug', 'New User Connected. ('+ session.id +')');
			
			currentSocket.on('connect_user', function ( name ) {				
				This.connectUser(currentSocket, session, name);
			});

			currentSocket.on('send_chat', function ( msg ) {
				This.sendMessage(currentSocket, session, msg);
			});
			
			currentSocket.on('secret_chat', function ( user, msg ) {
				This.sendSecretMessage(currentSocket, session, user, msg);
			});
			
			currentSocket.on('sync_color', function ( data ) {
				This.syncColor(currentSocket, session, data);
			});
			
			currentSocket.on('sync_point', function ( data ) {
				This.syncPoint(currentSocket, session, data);
			});
			
			currentSocket.on('drow_start', function ( data ) {
				This.drowStart(currentSocket, session, data);
			});
			
			currentSocket.on('drow_line', function ( data ) {
				This.drowLine(currentSocket, session, data);
			});
			
			currentSocket.on('disconnect', function () {
				This.disconnect(currentSocket, session);
			});			
		});
	}
	
	connectUser(currentSocket, session, name) {
		if (this.manager.findByName( name ) == null ) {			
			this.counts++;
			this.current++;
			
			session.id	 = currentSocket.id;
			session.name = name;
			session.color= this.colors[this.counts % this.colors.length];
			this.manager.add( session );

			this.logging('dbug', '[connectUser] '+ session.id +':'+ name);
			this.sockets.emit('update_users' , {peers: this.manager.users()} );
		} 
		else {
			this.sockets.emit('checkvalidation', "-1" );	
		}
	}
	
	sendMessage(currentSocket, session, msg) {
		session.count++;
		this.logging('dbug', '[sendMessage]['+ session.count +'] '+ session.id );
		this.sockets.emit('update_chat', {user : session, message : msg});
		this.sockets.emit('update_users', {peers: this.manager.users()} );
	}
	
	sendSecretMessage(currentSocket, session, user, msg) {
		if ((session.name != user) && (this.manager.findByName(user) != null)) {
			var targetSession = this.manager.findByName(user);
			var targetSocket = this.sockets.sockets[targetSession.id];
			this.logging('dbug', '[secret] : '+ session.name +'=>'+ user);
			
			currentSocket.emit('update_chat', session.name +':'+ msg );
			targetSocket.emit( 'update_chat', session.name +':'+ msg );
		}
	}
	
	// Synchroniz User color from colorplcker.
	syncColor(currentSocket, session, data) {
		this.logging('dbug', '[sync_color] '+ data.name +'/'+ data.color );			
		if (this.manager.find( data.id ) != null ){
			session.color = data.color;
			this.sockets.emit('update_users' , {peers: this.manager.users()} );
		}
	}
	
	// Synchroniz Canvas Point
	syncPoint(currentSocket, session, data) {
		this.logging('dbug', '[sync_point] '+ data.name +'/['+ data.point_x +'/'+ data.point_y +']' );			
		if (this.manager.find( data.id ) != null ){
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			this.sockets.emit('update_points' , {peers: this.manager.users()} );
		}
	}
	
	// drow start 
	drowStart(currentSocket, session, data) {
		this.logging('dbug', '[drow_start] '+ data.name +'/['+ data.point_x +'/'+ data.point_y +']' );
		if (this.manager.find( data.id ) != null ){
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			this.sockets.emit('update_drowStart' , session );
		}
	}
	
	// drow line
	drowLine(currentSocket, session, data) {
		this.logging('dbug', '[drow_line] '+ data.name +'/['+ data.point_x +'/'+ data.point_y +']' );		
		if (this.manager.find( data.id ) != null ){
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			this.sockets.emit('update_drowLine' , session );
		}
	}
	
	disconnect(currentSocket, session) {
		this.logging('dbug', '[discontUser] '+ session.id );
		if (this.manager.find( session.id ) != null ){	
			this.sockets.emit('update_chat' , session.name +' is out.' );
			this.sockets.emit('disconnect_user', session );
			this.manager.delete(session);
			this.current--;
		}
	}
	
	// Logging
	logging(title, msg) {
		console.log (`  >> ChartServer[${title}] ${msg}`);
	}
}

module.exports.createServer = function(socket) {
	chatServer = new SocialChartServer(socket);
	return chatServer;
};