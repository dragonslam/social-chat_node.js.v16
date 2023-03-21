// SocialChartSession module.
class SocialChartSession {
	constructor(name) {
		this.id		= 0;
		this.name	= name;
		this.count	= 0;
		this.color	= "";
		this.point_x= 0;
		this.point_y= 0;
		this.room_id= "";
		this.peer_id= "";
		this.isHost = false;
		
		// AI Chat options.
		this.ai_user= false;
		this.ai_chat= undefined;
		this.ai_temp= undefined;
	}
}

module.exports.connect = function(name) {
	return new SocialChartSession(name);
};