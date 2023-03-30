// express http logger.. 
module.exports = function(request, response, next) {
	console.log(`HTTP> [${new Date().toLocaleString()}] ${request.method}:${request.url}`);
	next(); // Call the next middleware in the stack.
};