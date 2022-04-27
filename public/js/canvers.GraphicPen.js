/**
    GraphicPen객체  정의
*/
function GraphicPen( oCanvas ){
	
	this.pen	= oCanvas.getContext('2d');
	this.option	= {
		 lineWidth	: 2
		,lineColor	: '#336699'
	};
	//////////////////////////////
	// 생성자 내부에 필요한 함수를 정의한다.
	this.moveTo	= function( point ){
		this.pen.beginPath();
		this.pen.lineWidth  = this.option.lineWidth;
		this.pen.strokeStyle= this.option.lineColor;
		this.pen.moveTo( point.x, point.y );
	}
	
	this.draw	= function( point ){
	    this.pen.scale(1, 1);
		this.pen.lineTo( point.x, point.y );
		this.pen.stroke();
	}
}