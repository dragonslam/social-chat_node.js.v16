// OpenAiChartServer module.
const config 		= require('config');
const TelegramBot	= require('node-telegram-bot-api');

class TelegramBotManager {
	constructor(options = {}) {
		this.env 		= config.get('telegram');
		this.keys		= this.env.bot_keys;		
		this.token		= options['token'] || this.env.api_key;
		this.chatId		= options['chatId']|| '';
		this.onConnect	= options['onConnectCallback']||undefined;
		this.onClose	= options['onCloseCallback']  ||undefined;
		this.onReceiv	= options['onReceivCallback'] ||undefined;
		this.botName	= 'TelegramBot';
		this.bot		= null;
		this.isInit		= false;
		this.isConnected= false;
		if (options['name'] && this.keys[options['name']]) {
			this.token	= this.keys[options['name']];
			this.botName= options['name'] + 'TelegramBot';
		}
		this.init();
	}
	
	// init.
	init() {
		const This = this;
		if (This.token) {
			This.bot	= new TelegramBot(This.token, { polling: true });	
			This.isInit	= true;
			This.logging('infor', 'initalize start. Use token:'+ This.token);			

			// Check bot connection status
			This.bot.on('polling_error', (error) => {
				This.isInit	= false;
				This.isConnected = false;
				This.error?.(error);
				This.onClose?.(error);
			});
			This.bot.on('webhook_error', (error) => {
				This.isInit	= false;
				This.isConnected = false;
				This.error?.(error);
				This.onClose?.(error);
			});
			This.bot.on('message', (msg)=>{
				This.logging('infor', 'onMessage()', msg);
				if (!msg?.chat?.id) return;
				let message = msg.text;
				This.chatId = msg.chat.id;
				This.isInit = true;
				This.isConnected = true;
				if (message.indexOf('/echo') > -1) {
					This.send("야호~: "+ message.replace('/echo',''));	
				}
				This.onReceiv?.(msg);
				This.connect('Telegram onMessage()');
			});
			This.logging('infor', 'initalize complete.');
			This.connect('Telegram initalize complete');
		} 
		else {
			This.logging('error', 'token is null.');
		}
	}
	connect(message) {
		if (this.isInit && this.chatId && !this.isConnected) {
			this.isConnected = true;
			this.onConnect?.(message);
		}
	}
	send(message) {
		const This = this;
		if (This.isInit && This.chatId) {
			This.bot.sendMessage(This.chatId, message)
				.then(() => {
					This.logging('send', 'Bot is connected and message sent successfully');
				})
				.catch((error) => {
					This.error(error);
				});
		} else {
			This.logging('error', 'none chatId.');	
		}
	}
	
	// Logging
	error(err) {
		this.logging('error', err);
	}
	logging(title) {
		let logs = Array.from(arguments);
		 logs[0] = `   >> [${new Date().toLocaleString()}] ${this.botName}[${title}]`;
		console.log.apply(true, logs);
	}
}

module.exports.create = function(options = {}) {
	return new TelegramBotManager(options);
};