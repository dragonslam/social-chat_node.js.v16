// express http logger.. 
module.exports = function(request, response, next) {
	const ip = request.socket.remoteAddress;
	console.log(`HTTP> [${new Date().toLocaleString()}][${ip}] ${request.method}:${request.url}`);
	next(); // Call the next middleware in the stack.
};