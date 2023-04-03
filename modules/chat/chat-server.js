// chart server module.

const config  = require('config');
const Session = require('./chat-session.js');
const Manager = require('./chat-session-manager.js');
const OpenAi  = require('../openAi/ai-chat-server.js');
const Telegram= require('../telegram/telegram-bot.js');

let chatServer= null;
class SocialChartServer {
	constructor(io) {
		this.env 	= config.get('system');
		this.io 	= io;
		this.sockets= io.sockets;
		this.manager= Manager.create();
		this.bot	= Telegram.create({
			onConnectCallback: this.onTelegramConnect,
			onCloseCallback	 : this.onTelegramClose,
			onReceivCallback : this.onTelegramMessageReceiver
		});
		
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
			This.logging('infor', 'New User Connected. ('+ session.id +')');

			currentSocket.on('connect_user', function ( name ) {				
				This.connectUser(currentSocket, session, name);
			});
			currentSocket.on('disconnect', function () {
				This.disconnect(currentSocket, session);
			});
			
			currentSocket.on('send_chat', function ( msg ) {
				This.sendMessage(currentSocket, session, msg);
			});
			currentSocket.on('secret_chat', function ( user, msg ) {
				This.sendSecretMessage(currentSocket, session, user, msg);
			});
			currentSocket.on('sync_status', function ( data ) {
				This.syncStatus(currentSocket, session, data);
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
			
			currentSocket.on('ai_create', function ( name ) {
				This.connectAi(currentSocket, session, name);
			});
		});
		
		this.logging('infor', 'initalize complete.');
	}
	
	connectUser(currentSocket, session, name) {
		if (this.manager.findByName( name ) == null ) {			
			this.counts++;
			this.current++;
			
			session.id	 = currentSocket.id;
			session.name = name;
			session.color= this.colors[this.counts % this.colors.length];
			this.manager.add( session );

			this.bot.send(`[connectUser] ${name}`);
			this.logging('debug', '[connectUser] '+ session.id +':'+ name);
			this.syncUsers();
		} 
		else {
			this.sockets.emit('checkvalidation', "-1" );	
		}
	}
	syncUsers() {
		this.sockets.emit('update_users' , {users: this.manager.users()} );
	}
	
	sendMessage(currentSocket, session, msg) {
		session.count++;
		this.logging('debug', '[sendMessage]['+ session.count +'] '+ session.id );
		this.sockets.emit('update_chat', {user : session, message : msg});
		this.bot.send(`[${session.name}] ${msg}`);
		this.syncUsers();
	}
	
	sendSecretMessage(currentSocket, session, user, msg) {
		const This = this;
		if ((session.name != user) && (This.manager.findByName(user) != null)) {
			var targetSession = This.manager.findByName(user);
			
			if (targetSession.ai_user && targetSession.ai_chat) {
				// OpenAi ChatGPT에 질의하여 답변을 전파한다.
				targetSession.ai_chat.answer(msg).then(function(responseMsg) {
					This.logging('debug', '[AiCALL] : '+ targetSession.name +'=>'+ responseMsg);
					This.sockets.emit('update_chat', {user : targetSession, message : responseMsg});
				});
			}
			else {
				var targetSocket = This.sockets.sockets[targetSession.id];
				This.logging('debug', '[secret] : '+ session.name +'=>'+ user);

				currentSocket.emit('update_chat', session.name +':'+ msg );
				targetSocket.emit( 'update_chat', session.name +':'+ msg );	
			}			
		}
	}
	
	// Synchroniz User status
	syncStatus(currentSocket, session, data) {
		this.logging('debug', '[syncStatus] '+ data.name +'/'+ data.color );			
		if (this.manager.find( data.id ) != null ){
			session.color	= data.color;
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			session.peer_id = data.peer_id||'';
			session.room_id = data.room_id||'';			
			this.syncUsers();
		}
	}
	
	// Synchroniz User color from colorplcker.
	syncColor(currentSocket, session, data) {
		this.logging('debug', '[syncColor] '+ data.name +'/'+ data.color );			
		if (this.manager.find( data.id ) != null ){
			session.color = data.color;
			this.syncUsers();
		}
	}
	
	// Synchroniz Canvas Point
	syncPoint(currentSocket, session, data) {
		//this.logging('debug', '[syncPoint] '+ data.name +'/['+ data.point_x +'/'+ data.point_y +']' );			
		if (this.manager.find( data.id ) != null ){
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			this.syncUsers();
		}
	}
	
	// drow start 
	drowStart(currentSocket, session, data) {
		this.logging('debug', '[drowStart] '+ data.name +'/['+ data.point_x +'/'+ data.point_y +']' );
		if (this.manager.find( data.id ) != null ){
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			this.sockets.emit('update_drowStart' , session );
		}
	}
	
	// drow line
	drowLine(currentSocket, session, data) {
		//this.logging('debug', '[drowLine] '+ data.name +'/['+ data.point_x +'/'+ data.point_y +']' );		
		if (this.manager.find( data.id ) != null ){
			session.point_x = data.point_x;
			session.point_y = data.point_y;
			this.sockets.emit('update_drowLine' , session );
		}
	}
	
	disconnect(currentSocket, session) {
		this.logging('debug', '[discontUser] '+ session.id );
		if (this.manager.find( session.id ) != null ){	
			this.sockets.emit('update_chat' , session.name +' is out.' );
			this.sockets.emit('disconnect_user', session );
			this.manager.delete(session);
			this.current--;
			this.syncUsers();
		}
	}
	onTelegramConnect(message) {
		if (!this.sockets) return false;
		this.bot.send(`# Node HTTP Server for express start server.`);
		this.bot.send(`# Server connect to ${this.env.protocol}://${this.env.host}:${this.env.port}/${this.env.rootPath}`);
		
		let userInfo = {id: 'Telegram', name: 'Telegram'};
		this.sockets.emit('update_chat', {user: userInfo, message: 'Telegram Connect.'});
	}
	onTelegramClose(message) {
		if (!this.sockets) return false;
		let userInfo = {id: 'Telegram', name: 'Telegram'};
		this.sockets.emit('update_chat', {user: userInfo, message: 'Telegram Close.'});
	}
	onTelegramMessageReceiver(telegramMessage = {}) {
		if (!this.sockets) return false;
		if (!telegramMessage?.text) return false;

		const userInfo = Object.assign(telegramMessage, {
			id	:`telegramId_${telegramMessage.from.id}`, 
			name:`telegramName_${telegramMessage.from.username}`, 
		});
		this.logging('debug', '[onTelegramMessageReceiver] '+ telegramMessage.text);
		this.sockets.emit('update_chat', {user: userInfo, message: telegramMessage.text});
	}
	
	connectAi(currentSocket, session, name) {
		if (this.manager.findByName( name ) == null ) {			
			this.counts++;
			this.current++;
			
			const aiSession = Session.connect('AI Member');
			aiSession.id	 	= session.id +'#_ai'+ this.counts;
			aiSession.name 		= name;
			aiSession.color		= this.colors[this.counts % this.colors.length];
			aiSession.ai_user	= true;
			aiSession.ai_temp	= ((Math.floor(Math.random() * 10) + 1) / 10);
			aiSession.ai_chat	= OpenAi.createServer({temperature : aiSession.ai_temp});
			this.manager.add( aiSession );

			this.logging('debug', '[connectAi] '+ aiSession.id +':'+ aiSession.name +':'+ aiSession.ai_temp);
			this.syncUsers();
		} 
		else {
			this.sockets.emit('checkvalidation', "-1" );	
		}
	}
	
	// Logging
	error(err) {
		this.logging('error', err);
	}
	logging(title) {
		let logs = Array.from(arguments);
		 logs[0] = `   >> [${new Date().toLocaleString()}] ChartServer[${title}]`;
		console.log.apply(true, logs);
	}
}

module.exports.createServer = function(io) {
	chatServer = new SocialChartServer(io);
	return chatServer;
};