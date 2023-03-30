console.log('## ################################################################################ ##');
console.log('## Start UP-Bit 자동 거래 시스템 Server.');

// config root setting.
process.env["NODE_CONFIG_DIR"] = __dirname + '/.config/';

const config	= require('config')
	, http		= require('http')
	, path		= require('path');

// express handler.
const express	= require('./modules/http-handler.js').create({server:'upbit'});

/* *********************************************************************************
** Initialize Http Server.
** ****************************************************************************** */
const httpServer = http.createServer(express)
	.listen(express.get('port'), () => {
		console.log('   >> Http Server Start..  port : '+ express.get('port'));
	});

/* *********************************************************************************
** Initialize Socket-io.
** ****************************************************************************** */
const { Server } = require('socket.io');
const io = new Server(httpServer, {
	origins: '*:*',
	transports: ['polling']
});
io.sockets.on('error', e => console.log(e));

/* *********************************************************************************
** Initialize UP-BIT Automated Trading System.
** ****************************************************************************** */
const upbitServer = require('./modules/upbit/upbit-server.js').createServer(io);

