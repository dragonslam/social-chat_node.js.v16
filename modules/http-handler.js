/**
 * Express handler
 * by dragonslam, 2023-03-28
 */

const config 		= require('config')
	, express		= require('express')
	, bodyParser	= require('body-parser')
	, cookieParser	= require('cookie-parser')
	, http			= require('http')
	, path			= require('path');
const { v4: uuidV4 }= require('uuid');

class ExpressHandler {
	constructor(options = {}) {
		// Http Server Port..
		this.port	= config.get('system')?.port || 8088;
		this.path	= path.join(__dirname, '/..');
		
		this.options= options;

		// import custom module..
		this.httpLogger	 = require('./http-logger.js');
		this.errorHandler= require('./error-handler.js');
		
		// express template engine.
		this.express	 = express();
		
		this.init();
	}
	
	// init.
	init() {
		// useing express..
		const app = this.express;
		// options
		const opt = this.options;
		
		app.use(function(req, res, next) {
			res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
			res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
			next();
		});

		// parse application/x-www-form-urlencoded
		// { extended: true } : nested object를 지원한다.
		// https://stackoverflow.com/questions/29960764/what-does-extended-mean-in-express-4-0
		app.use(bodyParser.urlencoded({ extended: true }));
		app.use(bodyParser.json()	);	// parse application/json
		app.use(cookieParser()		);	// parse cookie
		app.use(this.httpLogger		);	// express default logger
		app.use(this.errorHandler	);	// express error handler
		app.use('/public/css', express.static(this.path +'/public/css'));
		app.use('/public/js' , express.static(this.path +'/public/js'));
		app.use('/public/js' , express.static(this.path +'/node_modules/jquery/dist')); 		// redirect JS jQuery
		app.use('/public/js' , express.static(this.path +'/node_modules/popper.js/dist'));		// redirect popper JS
		app.use('/public/css', express.static(this.path +'/node_modules/bootstrap/dist/css'));	// redirect CSS bootstrap
		app.use('/public/js' , express.static(this.path +'/node_modules/bootstrap/dist/js')); 	// redirect bootstrap JS
		app.use('/public/css', express.static(this.path +'/node_modules/bootstrap-colorpicker/dist/css'));
		app.use('/public/js' , express.static(this.path +'/node_modules/bootstrap-colorpicker/dist/js'));
		app.use('/public/js' , express.static(this.path +'/node_modules/socket.io/client-dist'));

		// Template Engine setting.
		// Template default directory.{views}
		app.set('views', this.path + '/views');
		app.set('view engine', 'ejs');
		app.engine('ejs', require('ejs').renderFile);

		// Http configuration....
		app.set('port', this.port);
		
		// express routes
		this.routes();
		
		return app;
	}
	
	/* *********************************************************************************
	** express routes
	** ****************************************************************************** */
	routes() {
		// useing express..
		const app = this.express;
		// options
		const opt = this.options;
		
		// Http root.. 
		app.get('/', (request, response) => {
			response.render('index', { body : 'Connect Succeress.. <br/><br/><h3>Hello World!!</h3>'});
			//response.send('Connect Succeress.. <br/><br/><h3>Hello World!!</h3>');
		});
		// Http post connection..
		app.post('/signin', (request, responses) => {
			const { username, password } = request.body;
			// 클라이언트로부터 전송된 페이로드를 그대로 response한다.
			responses.send({ username, password });
		});
		
		// Template View 호출.
		if (opt?.server === 'chart') {
			// Chat Main : https://dragonslam.run.goorm.site/chart/index
			app.get('/chart/:page/', (request, responses) => {
				const { page, uuid } = request.params;
				responses.render(`chart/${page}`, { 
					body : `views/chart/${page} Connect Succeress.. Hello World!!`,
					uuid : uuid || uuidV4()
				});
			});			
		}
		if (opt?.server === 'upbit') {
			// Upbit Main : https://dragonslam.run.goorm.site/upbit/index
			app.get('/upbit/:page/', (request, responses) => {
				const { page, uuid } = request.params;
				responses.render(`upbit/${page}`, { 
					body : `views/upbit/${page} Connect Succeress.. Hello Upbit!!`,
					uuid : uuid || uuidV4()
				});
			});
		}

	}
}

module.exports.create = function(option = {}){
	return (new ExpressHandler(option)).init();
};