// OpenAiChartServer module.
const config 		= require('config')
const TelegramBot	= require('node-telegram-bot-api');

class TelegramBotManager {
	constructor(options = {}) {
		this.env 		= config.get('telegram');
		this.bot		= null;
		this.token		= options['token'] ||this.env.api_key;
		this.chatId		= options['chatId']||'';
		this.onReceiv	= options['onReceivCallback']||undefined;
		this.init();
	}
	
	// init.
	init() {
		const This = this;
		if (This.token) {
			This.bot = new TelegramBot(This.token, { polling: false });	
			This.logging('info', 'initalize start');
			This.logging('info', 'token: '+ This.token);

			This.bot.onText(/\/echo (.+)/, (msg, match) => {   
				This.chatId = msg.chat.id;
				This.logging('info', msg);
				
				// 식별된 "msg"는 보내온 채팅방('chatId')에게 앵무새처럼 재전송한다 ("꺄악: 'msg'")
				const message = "onText: "+match[1]; 
				This.send(message);
			 });
			This.bot.on('message', (msg, match)=>{
				This.chatId = msg.chat.id;
				This.logging('info', msg);

				// send a message to the chat acknowledging receipt of their message
				const message = "onMessage: "+match[1]; 
				This.send(message);
				if (This.onReceiv && typeof This.onReceiv == 'function') {
					This.onReceiv(msg);
				}
			});
			This.logging('info', 'initalize complete.');
		} 
		else {
			This.logging('error', 'token is null.');
		}
	}
	
	send(message) {
		const This = this;
		if (This.chatId) {
			This.bot.sendMessage(This.chatId, message)
				.then(() => This.logging('info', 'message sent'))
				.catch((error) => This.logging('error', error));	
		} else {
			this.logging('error', 'none chatId.');	
		}
	}

	
	// Logging
	logging(title, msg) {
		console.log (`   >> TelegramBot[${title}] ${msg}`);
	}
}

module.exports.create = function(options = {}) {
	return new TelegramBotManager(options);
};