// OpenAiChartServer module.

const config = require('config')
const { Configuration, OpenAIApi } = require("openai");


let openAiServer= null;
class OpenAiServer {
	constructor(options = {}) {
		this.env 		= config.get('openAi');
		this.apiKey		= this.env.api_key;
		this.apiEngine	= options['engine']||this.env['api_engine']||'davinci';
		this.apiOptions	= {
			model		: this.apiEngine,
			temperature	: options['temperature']||this.env['temperature']||0.7,
			max_tokens	: options['max_tokens']||this.env['max_tokens']||150,
			top_p		: options['top_p']||this.env['top_p']||1,
			frequency_penalty : options['frequency_penalty']||this.env['frequency_penalty']||0,
			presence_penalty  : options['presence_penalty']||this.env['presence_penalty']||0.6,
		};
		this.initServer();
	}
	
	// init.
	initServer() {
		const This = this;
		This.apiConfiguration = new Configuration({
		  apiKey : This.apiKey
		});
		This.apiServer = new OpenAIApi(This.apiConfiguration);
		
		This.logging('info', 'initalize complete.');
	}
	
	async answer(message, options={}) {		
		const responseData = await this.answerWhitResponse(message, options);
		const responseChoices = responseData?.choices;
		if (Array.isArray(responseChoices) && responseChoices.length > 0) {
			this.logging('info', 'Api respnse : ', responseChoices[0]);
			return String(responseChoices[0]['text']||'').trim();
		} else {
			return '';
		}
	}
	async answerWhitResponse(message, options={}) {
		const apiOption= Object.assign({}, this.apiOptions, options, {
			prompt	: message,
			stop	: '\n'
		});
		this.logging('info', 'Api call options : ', apiOption);
		const response = await this.apiServer.createCompletion(apiOption);
		//this.logging('info', 'Api respnse : ', response);
		if (response.status == 200 && response.statusText == 'OK') {
			return response.data;
		} else {
			this.logging('errr', 'Api Error : ', response);
		}		
	}
	
	// Logging
	logging(title, msg, obj) {
		console.log (`   >> OpenAiServer[${title}] ${msg}`, obj||'');
	}
}

module.exports.createServer = function() {
	openAiServer = new OpenAiServer();
	return openAiServer;
};