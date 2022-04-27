// SocialChartSession module.
class SocialChartSession {
	constructor(name) {
		this.id		= 0;
		this.name	= name;
		this.count	= 0;
		this.color	= "";
		this.point_x= 0;
		this.point_y= 0;
	}
}

module.exports.connect = function(name) {
	return new SocialChartSession(name);
};