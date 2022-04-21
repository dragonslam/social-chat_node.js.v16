// express http error handler.. 
module.exports = function(error, request, response, next) {
	console.error('>> ERROR['+ Date.now() +']:'+ request.method +':'+ request.url +'\n' + error.stack);
	response.status(error.status || 500);
	response.send(error.message || 'Error!!');	
	next(error);
};