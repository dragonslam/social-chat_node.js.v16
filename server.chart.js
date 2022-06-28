/**
 * Node HTTP Server for express Module dependencies.
 *  - Social Chat Server.
 * 
 * by dragonslam, 2022-04-20
 */

// import express..
const express		= require('express')
	, bodyParser	= require('body-parser')
	, cookieParser	= require('cookie-parser')
	, mysql			= require('mysql')
	, http			= require('http')
	, path			= require('path');

const { v4: uuidV4 }= require('uuid');

//const dbconfig   = require('./.config/config.mysql.js');
//const connection = mysql.createConnection(dbconfig);

// import custom module..
const httpLogger	= require('./modules/http-logger.js')
	, errorHandler	= require('./modules/error-handler.js');

// useing express..
const app = express();

// Http Server Port..
const port= 8088;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// parse application/x-www-form-urlencoded
// { extended: true } : nested object를 지원한다.
// https://stackoverflow.com/questions/29960764/what-does-extended-mean-in-express-4-0
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());		// parse application/json
app.use(cookieParser());		// parse cookie
app.use(httpLogger);			// express default logger
app.use(errorHandler);			// express error handler
app.use('/public/css', express.static(__dirname + '/public/css'));
app.use('/public/js' , express.static(__dirname + '/public/js'));
app.use('/public/js' , express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/public/js' , express.static(__dirname + '/node_modules/popper.js/dist'));
app.use('/public/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/public/js' , express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/public/css', express.static(__dirname + '/node_modules/bootstrap-colorpicker/dist/css'));
app.use('/public/js' , express.static(__dirname + '/node_modules/bootstrap-colorpicker/dist/js'));
app.use('/public/js/socket.io' , express.static(__dirname + '/node_modules/socket.io/client-dist'));

// Template Engine setting.
// Template default directory.{views}
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').renderFile);


// Http configuration....
app.set('port', process.env.PORT || port);


/* *********************************************************************************
** express routes
** ****************************************************************************** */
// Http root.. 
app.get('/', (request, response) => {
	response.render('index', { body : 'Connect Succeress.. <br/><br/><h3>Hello World!!</h3>'});
	//response.send('Connect Succeress.. <br/><br/><h3>Hello World!!</h3>');
});

// Template View 호출.
app.get('/chart/:page/', (request, responses) => {
	const { page, uuid } = request.params;
	responses.render(`chart/${page}`, { 
		body : `views/chart/${page} Connect Succeress.. Hello World!!`,
		uuid : uuid || uuidV4()
	});
});

// Http post connection..
app.post('/signin', (request, responses) => {
	const { username, password } = request.body;
	// 클라이언트로부터 전송된 페이로드를 그대로 response한다.
	responses.send({ username, password });
});



/* *********************************************************************************
** Initialize Http Server.
** ****************************************************************************** */
console.log('## ######################################## ##');
console.log('## Start Server.');
const httpServer = http.createServer(app)
	.listen(app.get('port'), () => {
		console.log('   >> Http Server Start..  port : '+ port);
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
** Initialize Chartting Server.
** ****************************************************************************** */
const chartServer = require('./modules/chat/chat-server.js').createServer(io);


/* *********************************************************************************
** Initialize Video Chartting Server.
** ****************************************************************************** */
const videoServer = require('./modules/chat/video-server.js').createServer(io);
