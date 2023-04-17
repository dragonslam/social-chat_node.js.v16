// OpenAiChartServer module.

const config = require('config')
	, fs	 = require('fs');
const { Configuration, OpenAIApi } = require('openai');


class OpenAiServer {
	constructor(options = {}) {
		this.env 		= config.get('openAi');
		this.apiKey		= this.env.api_key;
		this.apiRole	= this.env.api_role;
		this.apiModel	= options['model']||this.env['api_model']||'davinci';
		this.apiOptions	= {
			model		:  this.apiModel,
			stop		: ["\n"],
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
		if (!this.apiKey) {
			throw new Error('Need to api key.');
		}

		let configuration = new Configuration({apiKey: this.apiKey});
		this.openAI = new OpenAIApi(configuration);
		this.logging('info', 'initalize complete.');
	}
	
	async answer(message, options={}) {		
		const responseData = await this.createCompletion(message, options);
		const responseChoices = responseData?.choices;
		if (Array.isArray(responseChoices) && responseChoices.length > 0) {
			this.logging('debug', 'Api responseChoices : ', responseChoices[0]);
			if (responseChoices[0].message) {
				return String(responseChoices[0].message.content||'').trim();
			} else {
				return String(responseChoices[0].text||'').trim();
			}			
		} else {
			return '';
		}
	}
	async createCompletion(message, options={}) {
		// openai의 API를 호출해 결과를 반환. 
		let apiMethod = '';
		let apiOption = Object.assign({}, this.apiOptions, options);
		if (apiOption.model.indexOf('davinci') > -1) {
			apiMethod = 'createCompletion';
			apiOption.stop	 = '\n';
			apiOption.prompt = message;
		} else {
			apiMethod = 'createChatCompletion';
			apiOption.stop		= ['\n'];
			apiOption.messages	= [this.apiRole, {role:'user', content:message}];
		}
		this.logging('debug', 'Api call options : ', apiOption);

		const response = await this.openAI[apiMethod]?.(apiOption);
		//this.logging('info', 'Api respnse : ', response);
		if (response.status == 200 && response.statusText == 'OK') {
			this.logging('info', 'Api respnse.data : ', response.data);
			return response.data;
		}
	}
	/**
	 * 이미지에서 키워드 추출,
	 * - 이미지에서 키워드를 추출하는 기능은 현재 OpenAI에서 제공하는 기능이 아님. 
	 * - ChartGPT에 질의해서 얻은 결과이나 이는 없는 기능을 아려준 경우.
	 * > 이미지를 분석해 키워드 및 라벨등의 정보를 얻기 위해서는 Google, AWS, MS Azure 등의 Vision API를 사용해야 함.  
	 * @param {*} imageFilePath 
	 * @returns 
	 */
	async extractImageKeywords(imageFilePath) {
		if (!imageFilePath) throw new Error('Need to Images file path');
		try {
			// Load the image file
			const imageBuffer = fs.readFileSync(imageFilePath);

			// Convert the image buffer to base64 encoding
			const imageBase64 = Buffer.from(imageBuffer).toString('base64');

			// Call the OpenAI image analysis API
			const response = await this.openAI.images.analyze({base64: imageBase64});

			// Extract the keywords from the API response
			const keywords = response.keywords.map(keyword => keyword.name);

			return keywords;
		}
		catch(err) {
			this.error(err);
		}		
	}
	async getModelList() {
		this.logging('debug', 'Api call listModels()');
		const response = await this.openAI.listModels();
		if (response.status == 200 && response.statusText == 'OK') {
			return response.data;
		} else {
			this.error(response);
		}
	}
	
	// Logging
	error(err) {
		this.logging('error', err);
	}
	logging(title) {
		let logs = Array.from(arguments);
			logs[0] = `   >> [${new Date().toLocaleString()}] OpenAiServer[${title}]`;
		console.log.apply(true, logs);
	}
}

module.exports.createServer = function(option = {}) {
	return new OpenAiServer(option);
};