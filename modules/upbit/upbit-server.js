// UP-BIT API Server module.
const config 	    = require('config')
    , crypto        = require('crypto')
    , axios         = require('axios')
    , https         = require('https');

const MA = require('moving-average')
	, TI = require('technicalindicators');
	
const Telegram	= require('../telegram/telegram-bot.js');
class UpBitApiServer {
	constructor(io = {/* socket.io */}) {
		this.bot 		= null;
		this.io 		= io;
		this.socket		= null;
		this.token		= null;
		this.config		= config.get('upbit');
		this.strategys	= this.config?.strategys;
		this.adminKey	= this.config?.adminKey;
		this.adminPwd	= this.config?.adminPwd;
		this.endpoint	= this.config?.endpoint;
		this.accessKey	= this.config?.accessKey;
		this.secretKey	= this.config?.secretKey;
		this.currentBalance = null;
		this.init();
	}
	init() {
		const This = this;
		if(!This.io || !This.io?.on) throw new Error('Need Socket.IO Server.');
		if(!This.endpoint || !This.accessKey || !This.secretKey) throw new Error('Need API Key.');
		if(!This.adminKey || !This.adminPwd) throw new Error('Need Admin Auth info.');
		
		This.bot = Telegram.create({
			name : 'upbit',
			onConnectCallback: this.onTelegramConnect,
			onCloseCallback	 : this.onTelegramClose,
			onReceivCallback : this.onTelegramMessageReceiver
		});

		This.initTechnicalIndicator();
		This.initSocketIO();
		return This;
	}
	initTechnicalIndicator(){
		const This = this;
		// Initialize technical indicators
		// https://www.npmjs.com/package/technicalindicators
		This.periods= {
			smaShort: {period:This.config?.periods.smaShort},
			smaLong	: {period:This.config?.periods.smaLong },
			bbands	: {period:This.config?.periods.bbands  },
			rsi		: {period:This.config?.periods.rsi, stdDev:2},
			macd	: { 
				fastPeriod	: This.config?.periods.macd, 
				slowPeriod	: This.config?.periods.macd * 2, 
				signalPeriod: This.config?.periods.signal,
				SimpleMAOscillator: false,
				SimpleMASignal    : false
			}
		};
		This.indicators	= {
			/** Bollinger Bands (BB) 
			* - https://runkit.com/anandaravindan/bb
			* - return [Object {middle: 48.5, upper: 51.2, lower: 45.8}]
			*/
			bbands	: (values)=> TI.BollingerBands.calculate(Object.assign({values:values}, This.periods.bbands)),
			
			/** Simple Moving Average (SMA)
			* - https://runkit.com/anandaravindan/sma
			* - return [...]
			*/
			smaShort: (values)=> TI.SMA.calculate( Object.assign({values:values}, This.periods.smaShort)),
			smaLong	: (values)=> TI.SMA.calculate( Object.assign({values:values}, This.periods.smaLong )),
			
			/** Relative Strength Index (RSI)
			* - https://runkit.com/anandaravindan/rsi
			* - return [...]
			*/
			rsi		: (values)=> TI.RSI.calculate( Object.assign({values:values}, This.periods.rsi)),
			
			/** Moving Average Convergence Divergence (MACD)
			* - https://runkit.com/anandaravindan/macd
			* - return [Object {MACD:20.01, signal:18.72, histogram:1.29}]
			*/
			macd	: (values)=> TI.MACD.calculate(Object.assign({values:values}, This.periods.macd)),
		};		
		return This;
	}
	initSocketIO() {
		const This = this;
		// 클라이언트 연결 시
		This.io.on('connection', function(socket) {
			This.logging('Client connected', socket.id);
			This.socket = socket;
			This.token	= null;
			
			// 로그인 처리 요청을 수신하여 API 인증 토큰 생성 및 결과 전송
			This.socket.on('upbit-login', async function(menberId, memberPwd) {
				const loginResult = {
					success	: false,
					code	: '0000',
					message	: ''
				};
				if (!menberId || !memberPwd || (menberId!=This.adminKey || memberPwd!=This.adminPwd)) {
					Object.assign(loginResult, {code:'0099', message:'인증불가'});
				} else {
					const token = This.getApiToken();
					const options = {
						method: 'GET',
						headers: {Authorization: token},
						url: `${this.endpoint}/accounts`
					};
					try {
						This.logging('upbit-login start', token);
						const data = await request(options);
						if (data.error) {
							This.error('upbit-login faild', data);
							This.token = null;
							Object.assign(loginResult, {code:'0999', message:'UPBIT 인증실패'});
						} else {
							This.logging('upbit-login success', data);
							This.token = token;
							 Object.assign(loginResult, {success:true, code:'0001', message:'UPBIT 인증성공'});
						}
					} catch (err) {
						This.error('upbit-login error', err);
						This.token = null;
						Object.assign(loginResult, {code:'0001', message:'UPBIT 인증오류'});
					}	
				}
				This.send('upbit-loginResult', loginResult);
			});

			// 잔액 정보 요청을 수신하여 API 호출 후 결과 전송
			This.socket.on('upbit-balance', async function() {
				try {
					// 현재 잔액 조회
					This.currentBalance = await This.getBalance();            
					This.send('upbit-balanceList', This.currentBalance);
				} catch (err) {
					This.error(err);
					This.send('upbit-balanceList', {});
				}
			});
			// 거래 가능한 화폐 목록 요청을 수신하여 API 호출 후 결과 전송
			This.socket.on('upbit-coins', async function() {
				const options = {
					method: 'GET',
					headers: {Authorization: This.token},
					url: `${This.endpoint}/market/all`
				};
				try {
					const data = await This.request(options);
					const coins = [];
					for (const market of data) {
						if (market.market.includes('KRW-')) {
							const coin = market.market.split('KRW-')[1];
							coins.push(coin);
						}
					}
					This.send('upbit-coins', coins);
				} catch (err) {
					This.error(err);
					This.send('upbit-coins', []);
				}
			});

			// 자동 거래 시작 요청을 수신하여 거래 진행
			This.socket.on('upbit-start', function(coin, condition) {
				This.logging('Trading', `${coin} 자동 거래 시작`, true);
				const interval = setInterval(async () => {
					const options = {
						method: 'GET',
						headers: {Authorization: This.token},
						url: `${This.endpoint}/ticker?markets=${coin}-KRW`
					};
					try {
						const ticker = await This.getTicker(coin);                
						if (ticker.trade_price <= condition.price) {
							try {
								// 구매 주문
								const buyPrice = ticker.trade_price;
								await This.buyCoin(coin, condition.quantity, buyPrice);

								try {
									// 판매 주문
									const sellPrice = condition.sellPrice || ticker.trade_price * 1.1;
									await This.sellCoin(coin, condition.quantity, sellPrice);

								} catch (err) {
									This.error(err);
									clearInterval(interval);
									This.logging('Trading', `${coin} 자동 거래 종료`, true);
								} 
							} catch (err) { 
								This.error(err);
								clearInterval(interval); 
								This.logging('Trading', `${coin} 자동 거래 종료`, true);
							} 
						} else { 
							This.logging('Trading', `${coin} 조건 미충족, 거래 대기 중`, true);
						} 
					} catch (err) { 
						This.error(err);
						clearInterval(interval);
						This.logging('Trading', `${coin} 자동 거래 종료`, true);
					}
				}, 1000);
			});
			
			// 자동 거래 시작 요청을 수신하여 거래 진행
			This.socket.on('start-auto', function(coin, condition) {
				This.logging('AutoTrading', `${coin} 자동 거래 시작`, true);
				const interval = setInterval(async () => {
					try {
						// 5분 캔들로 기술 분석 진행
						const indicators = This.calculateStrategys(coin, 5);
						// 현재 가격 정보 조회
						const ticker	= await This.getTicker(coin);

						// 거래 조건 확인
						if (indicators.smaShort > indicators.smaLong && indicators.rsi_value <= 30) {
							// 현재 잔액 조회
							const balance = await This.getBalance();

							// 최대 매수 가능 수량 계산
							const availableBalance = balance.KRW;
							const buyPrice = ticker.trade_price;
							const quantity = Math.floor(availableBalance / buyPrice * 10000) / 10000;
							if (quantity > 0) {
								// 구매 주문
								await This.buyCoin(coin, quantity, buyPrice);

								// 판매 조건 대기
								const sellPrice = condition.sellPrice || ticker.trade_price * 1.1;
								const sellCondition = {
									price: sellPrice,
									quantity: quantity
								};
								This.send('sellCondition', sellCondition);
							} else {
								This.logging('AutoTrading', `${coin} 매수 가능 금액 부족, 거래 대기 중`, true);
							}

						// 매도 조건 충족 시 매도 주문 처리
						} else if (indicators.smaShort < indicators.smaLong && indicators.rsi_value >= 70) {
							// 현재 매도 조건 확인
							const sellCondition = await This.getSellCondition(coin);
							if (sellCondition) {
								// 판매 주문
								await This.sellCoin(coin, sellCondition.quantity, sellCondition.price);

								// 판매 조건 삭제
								This.send('deleteSellCondition', coin);
							} else {
								This.logging('AutoTrading', `${coin} 매도 조건 없음, 거래 대기 중`, true);
							}
						} else {
							This.logging('AutoTrading', `${coin} 조건 미충족, 거래 대기 중`, true);
						}
						
						// Crossover 계산
						let crossoverLog = '';
						let crossoverSma = await This.calculateCrossover(coin, 5, 5);
						if (crossoverSma > 0) {
							crossoverLog = "BUY : 50-period SMA crosses above 200-period SMA";
						} else if (crossoverSma < 0) {
							crossoverLog = "SELL: 50-period SMA crosses below 200-period SMA";
						} else {
							crossoverLog = "HOLD: 50-period SMA is equal to 200-period SMA";
						}
						This.logging('AutoTrading(SMA)', crossoverLog, true);
						
					} catch (err) {
						This.error(err);
						clearInterval(interval);
						This.logging('AutoTrading', `${coin} 자동 거래 종료`, true);
					}
				}, 3000);
			});

			// // 주문 조건 확인하는 부분에 이동평균선 및 RSI 값을 계산하는 로직 추가
			// This.socket.on('start-auto', function(coin, condition) {
			// 	This.logging('AutoTrading', `${coin} 자동 거래 시작`, true);
			// 	const interval = setInterval(async () => {
			// 		try {
			// 			// 현재 가격 정보 조회
			// 			const ticker	= await This.getTicker(coin);
						
			// 			// 이동평균선 계산
			// 			const shortTermMA= await This.calculateMovingAverage(coin, 5, 5); // 5분 캔들로 5개 기간의 단기 이동평균선
			// 			const longTermMA = await This.calculateMovingAverage(coin, 5, 20); // 5분 캔들로 20개 기간의 장기 이동평균선

			// 			// RSI 계산
			// 			const rsi = await This.calculateRSI(coin, 5, 14); // 5분 캔들로 14개 기간의 RSI

			// 			// 거래 조건 확인
			// 			if (shortTermMA > longTermMA && rsi <= 30) {
			// 				// 현재 잔액 조회
			// 				const balance = await This.getBalance();

			// 				// 최대 매수 가능 수량 계산
			// 				const availableBalance = balance.KRW;
			// 				const buyPrice = ticker.trade_price;
			// 				const quantity = Math.floor(availableBalance / buyPrice * 10000) / 10000;
			// 				if (quantity > 0) {
			// 					// 구매 주문
			// 					await This.buyCoin(coin, quantity, buyPrice);

			// 					// 판매 조건 대기
			// 					const sellPrice = condition.sellPrice || ticker.trade_price * 1.1;
			// 					const sellCondition = {
			// 						price: sellPrice,
			// 						quantity: quantity
			// 					};
			// 					This.send('sellCondition', sellCondition);
			// 				} else {
			// 					This.logging('AutoTrading', `${coin} 매수 가능 금액 부족, 거래 대기 중`, true);
			// 				}

			// 			// 매도 조건 충족 시 매도 주문 처리
			// 			} else if (shortTermMA < longTermMA && rsi >= 70) {
			// 				// 현재 매도 조건 확인
			// 				const sellCondition = await This.getSellCondition(coin);
			// 				if (sellCondition) {
			// 					// 판매 주문
			// 					await This.sellCoin(coin, sellCondition.quantity, sellCondition.price);

			// 					// 판매 조건 삭제
			// 					This.send('deleteSellCondition', coin);
			// 				} else {
			// 					This.logging('AutoTrading', `${coin} 매도 조건 없음, 거래 대기 중`, true);
			// 				}
			// 			} else {
			// 				This.logging('AutoTrading', `${coin} 조건 미충족, 거래 대기 중`, true);
			// 			}
						
			// 			// Crossover 계산
			// 			let crossoverLog = '';
			// 			let crossoverSma = await This.calculateCrossover(coin, 5, 5);
			// 			if (crossoverSma > 0) {
			// 				crossoverLog = "BUY : 50-period SMA crosses above 200-period SMA";
			// 			} else if (crossoverSma < 0) {
			// 				crossoverLog = "SELL: 50-period SMA crosses below 200-period SMA";
			// 			} else {
			// 				crossoverLog = "HOLD: 50-period SMA is equal to 200-period SMA";
			// 			}
			// 			This.logging('AutoTrading(SMA)', crossoverLog, true);
						
			// 		} catch (err) {
			// 			This.error(err);
			// 			clearInterval(interval);
			// 			This.logging('AutoTrading', `${coin} 자동 거래 종료`, true);
			// 		}
			// 	}, 3000);
			// });
			
		});
		return This;
	}
	send(...args) {
		this.socket?.emit?.apply(this.socket, args);
	}
	error(err) {
		this.logging('error', err);
	}
	logging(level, msg, isSend = false) {
		if (typeof msg !== 'string') {
			console.log (`   >> [${new Date().toLocaleString()}] UpBitApiServer[${level}]`, msg);
		} else {
			console.log (`   >> [${new Date().toLocaleString()}] UpBitApiServer[${level}] ${msg}`);
			if (isSend === true) {
				this.send('log', msg);
			}
		}
	}

	// HTTPS Request 통신.
	request(options) {
		return new Promise((resolve, reject) => {
			const req = https.request(options, res => {
				let data = '';
				res.on('data', chunk => {
					data += chunk;
				});
				res.on('end', () => {
					resolve(JSON.parse(data));
				});
			});
			req.on('error', err => {
				reject(err);
			});
			if (options?.json) {
				req.write(JSON.stringify(options.json));
				req.end();
			} else {
				reject('json is required');
			}
		});
	}

	// API 인증 토큰 생성
	getApiToken() {
		const payload = {
			access_key: this.accessKey,
			nonce: Date.now()
		};
		const payloadString = Object.entries(payload)
			.map(([key, value]) => `${key}=${value}`)
			.join('&');
		const signature = crypto.createHmac('sha512', this.secretKey)
			.update(payloadString)
			.digest('hex');
		const authorizationToken = `Bearer ${this.accessKey}:${signature}:${payload.nonce}`;
		return authorizationToken;
	};

	async getTicker(coin) {
		const options = {
			method	: 'GET',
			headers	: {Authorization: this.token},
			url		: `${this.endpoint}/ticker?markets=${coin}-KRW`
		};
		const data = await this.request(options);
		return data[0];
	}
	async getBalance() {
		const options = {
			method	: 'GET',
			headers	: {Authorization: this.token},
			url		: `${this.endpoint}/accounts`
		};
		try {
			const data = await this.request(options);
			const balance = {
				KRW	: 0
			};
			for(const account of data) {
				const [currency, coin] = account.currency.split('-');
				if (currency === 'KRW') {
					balance[currency] = Number(account.balance);
				} else if (coin && account.balance > 0) {
					if (!balance[coin]) {
						balance[coin] = 0;
					}
					balance[coin] += Number(account.balance);
				}
			}
			return balance;
		} catch (err) {
			this.error(err);
			return null;
		}
	}
	async getHistoricalData(coin, interval, count) {
		const response = await axios.get(`${this.endpoint}/candles/minutes/${interval}`, {
			params: {
				market: `KRW-${coin}`,
				count : count
			}
		});
		return response.data;
	}
	async calculateMovingAverage(coin, interval, length) {
		const data= await this.getHistoricalData(coin, interval, length);
		const sum = data.reduce((acc, candle) => acc + candle.trade_price, 0);
		return sum/ length;
	}
	async calculateRSI(coin, interval, length) {
		const data = await this.getHistoricalData(coin, interval, length + 1);
		let gains = 0;
		let losses = 0;

		for (let i = 1; i < data.length; i++) {
			const change = data[i - 1].trade_price - data[i].trade_price;
			if (change > 0) {
				gains += change;
			} else {
				losses -= change;
			}
		}

		const avgGain = gains / length;
		const avgLoss = losses/ length;
		if (avgLoss === 0) {
			return 100;
		} else {
			const rs = avgGain / avgLoss;
			const rsi = 100 - (100 / (1 + rs));
			return rsi;
		}
	}
	// Helper function to calculate the moving average crossover
	async calculateCrossover(coin, interval, length) {
		const data = await this.getHistoricalData(coin, interval, length);
		const closePrices = data.map(candle => candle.trade_price);
		const sma50 = this.indicators.SMA.calculate({ period: 50, values: closePrices });
		const sma200 = this.indicators.SMA.calculate({ period: 200, values: closePrices });
		const crossover = sma50[sma50.length - 1] - sma200[sma200.length - 1];
		return crossover;
	}
	async calculateStrategys(coin, interval) {
		const This = this;
		const shortData = await this.getHistoricalData(coin, interval, This.strategys.short);
		const longData	= await this.getHistoricalData(coin, interval, This.strategys.long );
		const prices	= longData.map(candle => candle.trade_price);
		const priceSum  = longData.reduce((acc, candle) => acc + candle.trade_price, 0);
		
		const ti_bbands	= This.indicators.bbands(prices);	// Calculate Bollinger Bands
		const ti_rsi	= This.indicators.rsi(prices);	 	// Calculate Relative Strength Index
		const ti_macd	= This.indicators.macd(prices);	 	// Calculate Moving Average Convergence Divergence
		const ti_short	= This.indicators.smaShort(prices);	// Simple Moving Average (SMA)
		const ti_long 	= This.indicators.smaLong(prices);	// Simple Moving Average (SMA)
		const ti_result	= {
			coinShortData:shortData,
			coinLongData: longData,
			coinPrices	: prices,
			coinSum		: priceSum,
			coinAverage	: priceSum / This.strategys.long,
			bbands		: ti_bbands,
			bbandsUpper	: ti_bbands[ti_bbands.length-1]?.upper,
			bbandsLower	: ti_bbands[ti_bbands.length-1]?.lower,
			rsi			: ti_rsi,
			rsi_value	: ti_rsi [ti_rsi.length -1],
			macd		: ti_macd,
			macd_value	: ti_macd[ti_macd.length-1]?.MACD,
			macd_signal	: ti_macd[ti_macd.length-1]?.signal,
			smaShort	: ti_short,
			smaLong		: ti_long ,
			smaCrossover:(ti_short[ti_short.length-1] - ti_long[ti_long.length-1]),
		};
		console.log('calculateStrategys : ', ti_result);
		return ti_result;
	}

	// 구매 주문
	async buyCoin(coin, quantity, buyPrice) {
		const buyOptions = {
			method	: 'POST',
			headers	: {Authorization: this.token},
			url		: `${this.endpoint}/orders`,
			json	: {
				market	: `${coin}-KRW`,
				volume	: String(quantity),
				price	: String(buyPrice),
				side	: 'bid',
				ord_type: 'limit'
			}
		};
		const data= {};//await this.request(buyOptions);
		this.logging('BuyCoin', `${coin} 구매 주문 완료: 가격=${buyPrice}, 수량=${quantity}`, true);
		return data;
	}

	// 판매 주문
	async sellCoin(coin, quantity, sellPrice) {
		const sellOptions = {
			method	: 'POST',
			headers	: {Authorization: this.token},
			url		: `${this.endpoint}/orders`,
			json	: {
				market	: `${coin}-KRW`,
				volume	: String(quantity),
				price	: String(sellPrice),
				side	: 'ask',
				ord_type: 'limit'
			}
		};
		const data= {};//await this.request(sellOptions);
		this.logging('SellCoin', `${coin} 판매 주문 완료: 가격=${sellPrice}, 수량=${quantity}`, true);
		return data;
	}


	onTelegramConnect(message) {
		if (!this.socket) return false;
		this.logging('debug', 'Telegram Connect.', true);
	}
	onTelegramClose(message) {
		if (!this.socket) return false;		
		this.bot = null;
		this.logging('debug', 'Telegram Close.', true);
	}
	onTelegramMessageReceiver(telegramMessage = {}) {
		if (!this.socket) return false;
		if (!telegramMessage?.text) return false;
		
		this.logging('debug', '[onTelegramMessageReceiver] '+ telegramMessage.text, true);
	}
}

module.exports.createServer = function(io){
	return new UpBitApiServer(io);
};