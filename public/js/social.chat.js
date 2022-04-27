function socialChat (
	w,
	panelChatMsg, panelLogMsg, panelUserName, panelCanvasView, panelPenColor, panelUserPoint, panelTemplate,
	txtUserName, txtChatMsg, txtSelectUser, 
	btnSend, btnSelect, btnConnect, btnDisconnect,
	btnChangeColor, btnCanvasClear
	
) {
	if (!w) {
		throw new Error("argument exception.");
	}
	
	var  d = w.document
		,l = d.location
		,p = l.port
	;
	
	this.isDebug		= true;
	this.isCon			= false;
	this.defaultColor	= "#000000";
	this.serverUri		= l.protocol + "//" + l.hostname + (p ? ":"+p : "");
	this.socket			= undefined;
	this.currentUser	= undefined;
	this.currentX		= 0;
	this.currentY		= 0;
	this.userLists		= {};

	this.panel_ChatMsg	= this.getObject(panelChatMsg);
	this.panel_LogMsg	= this.getObject(panelLogMsg);
	this.panel_UserName	= this.getObject(panelUserName);
	this.panel_Canvas	= this.getObject(panelCanvasView);
	this.panel_PenColor	= this.getObject(panelPenColor);
	this.panel_UserPoint= this.getObject(panelUserPoint);
	this.panel_Template	= this.getObject(panelTemplate);
	this.txt_ChatMsg	= this.getObject(txtChatMsg);
	this.txt_UserName	= this.getObject(txtUserName);
	this.txt_SelectUser	= this.getObject(txtSelectUser);
	this.btn_Send		= this.getObject(btnSend);
	this.btn_Select		= this.getObject(btnSelect);
	this.btn_Connect	= this.getObject(btnConnect);
	this.btn_Disconnect	= this.getObject(btnDisconnect);
	this.btn_ChangeColor= this.getObject(btnChangeColor);
	this.btn_CanvasClear= this.getObject(btnCanvasClear);
	
	this.logging("Social Chat. initialize start.");
	this.initializeUI();

	if (typeof io != "function") {
		this.logging("Not Found 'Node.js' module in 'spcked.io'.");
	} else {
		this.initializeEvent();
	}

	this.logging("Social Chat. initialize complete.");
};
socialChat.prototype = {
	IIF	: function(exp, val, defaultValue) {
		return (typeof(exp) == "boolean" && exp) ? val : defaultValue;
	},
	getObject : function(obj, defaultValue) {
		return this.IIF((typeof(obj) == "object"), obj, (defaultValue ? defaultValue : null));
	},
	getString : function(str, defaultValue) {
		return this.IIF((typeof(str) == "string"), str, (defaultValue ? defaultValue : ""));
	},
	getName : function(obj) {
		if (obj instanceof jQuery)
			return obj.attr("id");
	},
	setValue : function(obj, value) {
		if (obj instanceof jQuery) {
			obj.val(value);
		}
		else {
			var o = $(obj);
			if (o.length > 0) {
				return this.getName(o);
			}
			else {
				return "";
			}
		}
	},
	showObject : function(obj, isShow) {	
		//this.logging("showObject("+ this.getName(obj) +", "+ isShow +")");
		if (obj instanceof jQuery) {
			if (isShow)
				obj.show();
			else
				obj.hide();
		}
	},
	logging : function(msg) {
		if (typeof msg == "string" && String(msg) != "") {
			if (this.isDebug && window.console) {
				window.console.log.apply(window, arguments);
			}
			this.append(this.panel_LogMsg, msg +"<br/>");
			this.panelScrolling(this.panel_LogMsg);
		}
	},
	append : function(obj, msg) {
		if (obj instanceof jQuery) {
			obj.append(msg);
		}
	},
	appendMsg : function(data, isLogging, isShowMessage) {
		if (typeof data == "object" && !!data.user) {
			var user	= data.user,
				msg		= data.message,
				panel	= this.panel_Template.find("[tmpl-id='panel-chatFnMsg']").clone();
				
			if (this.currentUser.id === user.id) {
				panel	= this.panel_Template.find("[tmpl-id='panel-chatMyMsg']").clone();
			}
			
			panel.find("div.d-flex strong").text(user.name);
			panel.find("div.d-flex small").text((new Date()).format('yyyy-mm-dd HH:mi'));
			panel.find("div.small").html("<span style='color:"+ user.color +";'>"+msg+"</span>");
			
			this.append(this.panel_ChatMsg, panel);
		}
		else {
			
			if (typeof data == "string" && String(data) != "") {
				if (typeof(isLogging) == "boolean" && isLogging === true){
					var panel = this.panel_Template.find("[tmpl-id='panel-logMsg']").clone();
					panel.find("div.small").append("<span style='color:#99999f;'>"+data+"</span>");
					
					this.append(this.panel_ChatMsg, panel);
				}
				if (typeof(isShowMessage) == "boolean" && isShowMessage === true) {
					alert(msg);
				}
			}
		}
		this.panelScrolling(this.panel_ChatMsg);
	},
	clearChatPanel : function() {
		this.panel_ChatMsg.empty();
	},
	panelScrolling : function(obj) {
		var panel = document.getElementById(obj.attr("id"));
		if (panel)	
			panel.scrollTop = panel.scrollHeight;
	},
		
	
	/**
	 * 
	 */
	initializeUI : function() {
		this.showObject(this.btn_Connect, true);
		this.showObject(this.btn_Disconnect, false);
	
		this.logging("Social Chat. initializeUI complete.");
	},
	/**
	 * 
	 */
	initializeEvent : function() {
		var THIS = this;
	
		this.btn_Connect.click(function(e) {
			THIS.connectServer();
		});
		this.btn_Disconnect.click(function(e) {	
			THIS.disconnectServer();
		});
		this.txt_UserName.keypress(function(e) {				
			if(e.which == 13 && $(this).val() != "") {
				THIS.connectServer();
			}
		});
		this.btn_Send.click(function(e) {
			if (THIS.txt_ChatMsg && THIS.txt_ChatMsg.val() != "") {
				THIS.send("send_chat", THIS.txt_ChatMsg.val());
				THIS.txt_ChatMsg.val("");
			}	
		});
		this.txt_ChatMsg.keypress(function(e) {	
			if(e.which == 13 && $(this).val() != "") {
				THIS.btn_Send.click();
			}
		});
		this.btn_Select.click(function(e) {	
			var selectUser	= "";
			var targrtUser	= "";
	
			if (THIS.txt_SelectUser) 
				selectUser = THIS.txt_SelectUser.val();
			
			if (THIS.txt_UserName) {
				targrtUser = THIS.txt_UserName.val();
			}
			THIS.send("secret_chat", selectUser, targrtUser);
		});
		
		this.logging("Social Chat. initializeEvent complete.");
	},
	
	/**
	 * 
	 */
	initializeCanvers : function() {
		var THIS	= this,
			canvas	= (this.panel_Canvas[0] || undefined);
			
		// Canvas Drawing ..
		// panel_Canvas panel_PenColor btn_ChangeColor btn_CanvasClear
		
		// Set ColorPicker.
		this.setColorPicker(this.panel_PenColor);
		
		this.btn_ChangeColor.click(function() {
	    	if (THIS.currentUser) {
	    		THIS.panel_PenColor.colorpicker("show");
	    	}
	    });
	    
	    if (canvas) {
	    	var oPen	= new GraphicPen( canvas );
	    	var oBoard	= new DrawBoard(canvas, {
	    		onDrowStart : function(point) {
	    			if (THIS.currentUser) {
	    				oPen.option.lineColor = THIS.currentUser.color;
	    				oPen.moveTo( point );
	    				THIS.send("drow_start", THIS.currentUser);
	    			}
	    		},
	    		onDrowing : function(point) {
	    			if (THIS.currentUser) {
	    				oPen.draw( point );
	    				THIS.send("drow_line", THIS.currentUser);
	    			}
	    		},
	    		onDrowEnd : function(point) {
	    			
	    		}
	    	});
	    	oBoard.initBoard();
	    	oBoard.cleanCanvas();
	    
	    	// share mouse point.
	   		THIS.panel_Canvas.mousemove(function(e){
				var point = oBoard.getMousePoint(e);
				
				if (THIS.currentX != point.x || THIS.currentY != point.y) {
					//THIS.logging("point chker : "+ e.pageX +"/"+ e.pageY +"?"+ point.x +"/"+ point.y);
					THIS.currentX = point.x;
					THIS.currentY = point.y;
					if (THIS.currentUser) {
						THIS.currentUser.point_x = point.x;
						THIS.currentUser.point_y = point.y;
						THIS.send("sync_point", THIS.currentUser);
					}
				}
			});	
			
			// clear canvas
			THIS.btn_CanvasClear.click(function(e) {
				if (oBoard && oBoard.cleanCanvas) {
					oBoard.cleanCanvas();
				}
			});
	    }
	},



	/**
	 * connect chat server.
	 * use by node.js, socket.io
	 */
	connectServer : function() {
		var THIS = this;
		
		if (String(THIS.txt_UserName.val()).trim() == "") {
			THIS.appendMsg( "Name is empty.!!", true, true);	
			return false;
		}
	
		if (typeof(THIS.socket) == "object") {
			THIS.logging("Is already connected. socket is "+ typeof(THIS.socket) +".");
			return false;
		}
	
		THIS.logging("Try connecting.");
		THIS.socket = io.connect(THIS.serverUri, {'force new connection': true } );
		
		// 서버에 연결되면 연결 메시지 보여줌
		THIS.socket.on('connect', function(){
			THIS.socket.emit("connect_user", THIS.txt_UserName.val() );
			THIS.isCon = true;
			THIS.clearChatPanel();
			THIS.appendMsg( "connected server.", true);	
			THIS.txt_UserName.attr("readonly", true);
			THIS.txt_UserName.css({'backgroundColor': '#333'});
		});
	
		THIS.socket.on('checkvalidation', function (result) {		
			if(result == "-1") 
				THIS.logging( "'socket.io' event on 'checkvalidation'. Already Exists server.");	
	
			THIS.showObject(THIS.btn_Disconnect, false);
			THIS.showObject(THIS.btn_Connect, true);
			
			THIS.socket.removeAllListeners();			
			THIS.socket.disconnect();
		});
		
		THIS.socket.on('update_users', function (data) {					
			THIS.logging("update_users - " + data.peers[data.peers.length-1].name);
	
			//THIS.panel_UserName.html("");
			for(var i=0; i<data.peers.length; i++){ 
				var user = data.peers[i];
				if (user && user.id) {
					if (!THIS.userLists["u_"+ user.id]) {
						THIS.userLists["u_"+ user.id] = user;
					}
					THIS.showUserList(user);
				}
			}
		});
		
		THIS.socket.on('update_chat', function (data) {	
			THIS.logging("update_chat :", data);
			THIS.appendMsg(data);
			THIS.txt_ChatMsg.focus();
		});
		
		THIS.socket.on('update_points', function (data) {
			for(var i=0; i<data.peers.length; i++){ 
				var user = data.peers[i];
				if (user && user.id) {
					THIS.drowUserMousePoint(user);
				}
			}
		});
		
		THIS.socket.on('update_drowStart', function (data) {
			if (data && data.id) {
				var user = THIS.userLists["u_"+ data.id];
				if (user && user.id) {
					user.point_x = data.point_x;
					user.point_y = data.point_y;
					
					if (THIS.currentUser.id != user.id) {
						if (!user.pen) {
							user.pen = new GraphicPen( THIS.panel_Canvas[0] );
						}
						
						user.pen.option.lineColor = data.color;
						user.pen.moveTo( {x:user.point_x, y:user.point_y} );
					}
				}
			}
		});
		THIS.socket.on('update_drowLine', function (data) {
			if (data && data.id) {
				var user = THIS.userLists["u_"+ data.id];
				if (user && user.id) {
					user.point_x = data.point_x;
					user.point_y = data.point_y;
					
					if (THIS.currentUser.id != user.id) {
						if (user.pen) {
							user.pen.draw( {x:user.point_x, y:user.point_y} );
						}
					}
				}
			}
		});
		
		THIS.socket.on("disconnect" , function () {	
			THIS.logging( "disconnected server." );
			THIS.deleteUser(THIS.currentUser);
			THIS.socket = undefined;
			THIS.isCon = false;
		});
		
		THIS.socket.on("disconnect_user", function(data) {
			if (data && data.id) {
				THIS.logging( "disconnect user." );
				THIS.deleteUser(data);
			}
		});
	
		THIS.showObject(THIS.btn_Connect, false);
		THIS.showObject(THIS.btn_Disconnect, true);
		
		// 사용자가 Canva를 사용할 수 있도록 설정함.
		THIS.initializeCanvers();
	},
	/** 
	 * disconnect chat server
	*/
	disconnectServer : function() {
		this.appendMsg( "disconnected server.", true);	
		this.showObject(this.btn_Disconnect, false);
		this.showObject(this.btn_Connect, true);
	
		if (this.socket)
			this.socket.disconnect();
	},
	
	isConnect : function() {
		return (this.socket && this.isCon) ? true : false;
	},
	send : function(cmd, arg1, arg2) {
		if (this.isConnect()) {
			this.socket.emit(cmd, arg1, arg2);
		}
	},
	
	showUserList : function(user) {
		var THIS = this;
		if (user && user.id) {
			if (user.color == "") {
				user.color = this.defaultColor;
			}
			
			var isCurrentUser = false;
			if (this.txt_UserName.val() == user.name) {
				this.currentUser = user;
				isCurrentUser = true;
			}
			if (isCurrentUser) {
				this.panel_PenColor.css("backgroundColor", user.color);
			}
			
			var userPicker,
				userPanel = this.panel_UserName.find("[session-id='"+ user.id +"']");
				
			if (userPanel.length == 0) {
				userPanel = this.panel_Template.find("[tmpl-id='user-item']").clone();
				userPanel.attr("session-id", user.id)
						 .attr("session-name", user.name)
						 .find("strong").text(user.name)
				;
				userPanel.click(function (e) {
					e = (e || event);
					if (e && e.currentTarget) {
						var o = $(e.currentTarget),
							u = o.attr("session-id"),
							n = o.attr("session-name");
						if (n && n != "" && THIS.currentUser && THIS.currentUser.id != u) {
							THIS.txt_SelectUser.val(n);
						}
					}
				});
				this.panel_UserName.append(userPanel);
				
				if (isCurrentUser) {
					userPanel.addClass("active");
					// Set ColorPicker.
					this.setColorPicker(userPanel.find("span.color-picker"));
				}
			}
			userPanel.find("span.badge").empty().append(user.count);
			userPanel.find("span.color-picker").css("backgroundColor", user.color);
			
			this.drowUserMousePoint(user);
		}
	},
	
	deleteUser : function(user) {
		if (user && user.id) {
			
			if (user.id == this.currentUser.id) {
				this.panel_UserName.empty();
				this.panel_UserPoint.empty();
				this.txt_UserName.val("").attr("readonly", false);
				$("div.colorpicker").remove();
			}
			else {
				this.panel_UserName.find("li[session-id='"+ user.id +"']").remove();
				this.panel_UserPoint.find("#uLab_"+ user.id).remove();	
			}
		}
	},

	drowUserMousePoint : function(user) {
		if (user && user.id) {
			if (user.point_x > 0 || user.point_y > 0) {
				//this.panel_Canvas.append("["+user.name+"]["+user.point_x+"/"+user.point_y+"]<br/>");
				
				var userLabId = "uLab_"+ user.id,
					userLable = $("#uLab_"+ user.id),
					lableObj  = this.panel_UserPoint[0];
				if (userLable.length > 0) {					
					userLable.css('top', (user.point_y - 20 + lableObj.offsetTop ))
							 .css('left',(user.point_x + 15 + lableObj.offsetLeft))
							 .find('span.label').css('background', user.color);
				}
				else {
					userLable = this.panel_Template.find("[tmpl-id='panel-userPoint']").clone();
					userLable.attr("id", userLabId)
							 .find("span.label").css("background", user.color).text(user.name);
					this.panel_UserPoint.append(userLable);
				}
			}
		}
	},
	
	setColorPicker : function(o) {
		var THIS	= this,
			oStyle	= o[0].style,
			sColor	= "";
			
		o.colorpicker({
	      	  color: oStyle.backgroundColor
	      	, align: 'left'
      		, horizontal: false
	    })
	    .on('colorpickerChange', function(event) {
	    	if (THIS.currentUser) {
				THIS.logging("selectColor - " + event.color.toHexString());
	    		oStyle.backgroundColor = event.color.toHexString();
				sColor = event.color.toHexString();
	    	}
	    })
	    .on('colorpickerShow', function(event){
	    	if (THIS.currentUser) {
	    		sColor = oStyle.backgroundColor;
	    	}
	    	else {
	    		$(this).colorpicker('hide');
	    	}
	    })
	    .on('colorpickerHide', function(event){
	    	if (THIS.currentUser.color != sColor) {
				oStyle.backgroundColor = sColor;
				THIS.currentUser.color = sColor;
	    		THIS.send("sync_color", THIS.currentUser);
	    	}
	    });
	}
};