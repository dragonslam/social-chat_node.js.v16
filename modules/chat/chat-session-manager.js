// SocialChartSessionManager module.
class SocialChartSessionManager {
	constructor() {		
		this.userList = [];
	}
	
	add( session ) {	
		this.userList.push( session );
	}
	
	users() {
		return this.userList;	
	}
	
	find( id ) {
		for (var i = 0 ; i < this.userList.length ; i++ ) {
			if (this.userList[i].id == id ) return this.userList[i];
		}		
		return null;		
	}
	
	findByName( name ) {		
		for (var i = 0 ; i < this.userList.length ; i++ ) {
			if ( this.userList[i].name == name )  {
				return this.userList[i];
			}
		}
		return null;		
	};	
	
	deleteWithID( id ) {
		for (var i = 0 ; i <  this.userList.length ; i++ ) {
			if (this.userList[i].id == id ) {			
				this.userList.splice( i,1 );
			}
		}		
	}

	delete( obj ) {		
		for (var i = 0 ; i <  this.userList.length ; i++ ) {
			if (this.userList[i] == obj ) {
				this.userList.splice( i,1 );
			}
		}
	}
	
	print() {
		for (var i = 0 ; i < this.userList.length ; i++ ) {
			console.log ( "#### session:" +this.userList[i].id  +"," + this.userList[i].name );
		}
	}
}

module.exports.create = function() {
	return new SocialChartSessionManager();
};