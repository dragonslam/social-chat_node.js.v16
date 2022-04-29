// express http logger.. 
module.exports = function(request, response, next) {
	console.log('    > Http Call['+ Date.now() +']:'+ request.method +':'+ request.url );
	next(); // Call the next middleware in the stack.
};