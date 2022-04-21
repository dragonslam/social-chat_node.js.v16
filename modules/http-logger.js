// express http logger.. 
module.exports = function(request, response, next) {
	console.log('>> LOGGED['+ Date.now() +']:'+ request.method +':'+ request.url );
	next(); // Call the next middleware in the stack.
};