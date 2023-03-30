console.log('## ################################################################################ ##');
console.log('## Node HTTP Server for express server start.');

// config root setting.
process.env["NODE_CONFIG_DIR"] = __dirname + '/.config/';

const config	= require('config')
	, http		= require('http')
	, path		= require('path');

// express handler.
const express	= require('./modules/http-handler.js').create({server:'chart'});

const dbConfig	= config.get('mySql');
//const connection = mysql.createConnection(dbConfig);

/* *********************************************************************************
** Initialize Http Server.
** ****************************************************************************** */
const httpServer = http.createServer(express)
	.listen(express.get('port'), () => {
		console.log(`   >> [${new Date().toLocaleString()}] Http Server Start..  port=>${express.get('port')}`);
	});

/* *********************************************************************************
** Initialize Socket-io.
** ****************************************************************************** */
const { Server } = require('socket.io');
//const io = new Server(httpServer);
const io = new Server(httpServer, {
	origins: '*:*',
	transports: ['polling']
});
io.sockets.on('error', e => console.log(e));

/* *********************************************************************************
** Initialize Video Chartting Server.
** ****************************************************************************** */
const videoServer = require('./modules/chat/video-server.js').createServer(io);

/* *********************************************************************************
** Initialize Chartting Server.
** ****************************************************************************** */
const chartServer = require('./modules/chat/chat-server.js').createServer(io);

