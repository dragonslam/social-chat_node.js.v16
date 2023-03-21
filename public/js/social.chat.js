function socialChat (w, elements = {}) {
	if (!w) {
		throw new Error("argument exception.");
	}
	
	var  d = w.document
		,l = d.location
		,p = l.port
	;
	
	this.isDebug		= true;
	this.isCon			= false;
	this.isVideo		= false;
	this.defaultColor	= "#000000";
	this.serverUri		= l.protocol + "//" + l.hostname;
	this.serverPort		= (p ? ":"+p : "");
	this.socket			= undefined;
	this.peer			= undefined;
	this.peers			= {};
	this.video			= undefined;
	this.currentUser	= undefined;
	this.currentX		= 0;
	this.currentY		= 0;
	this.userLists		= {};
	this.room_uuid		= (CHAT_UUID || ('videoChat:'+Date.now()));
	this.currentVideoRoomId = '';

	this.panel_ChatMsg		= this.getObject(elements['panelChatMsg']||'');
	this.panel_LogMsg		= this.getObject(elements['panelLogMsg']||'');
	this.panel_UserName		= this.getObject(elements['panelUserName']||'');
	this.panel_CanvasGroup	= this.getObject(elements['panelCanvasGroup']||'');
	this.panel_VideoGroup	= this.getObject(elements['panelVideoGroup']||'');
	this.panel_Canvas		= this.getObject(elements['panelCanvasView']||'');
	this.panel_PenColor		= this.getObject(elements['panelPenColor']||'');
	this.panel_UserPoint	= this.getObject(elements['panelUserPoint']||'');
	this.panel_Template		= this.getObject(elements['panelTemplate']||'');
	this.panel_Video		= this.getObject(elements['panelVideo']||'');
	this.txt_ChatMsg		= this.getObject(elements['txtChatMsg']||'');
	this.txt_UserName		= this.getObject(elements['txtUserName']||'');
	this.txt_SelectUser		= this.getObject(elements['txtSelectUser']||'');
	this.txt_AiChatName		= this.getObject(elements['txtAiChatName']||'');
	this.btn_Connect		= this.getObject(elements['btnConnect']||'');
	this.btn_ConnectAi		= this.getObject(elements['btnConnectAi']||'');
	this.btn_Disconnect		= this.getObject(elements['btnDisconnect']||'');
	this.btn_Send			= this.getObject(elements['btnSend']||'');
	this.btn_Select			= this.getObject(elements['btnSelect']||'');
	this.btn_ChangeColor	= this.getObject(elements['btnChangeColor']||'');
	this.btn_CanvasClear	= this.getObject(elements['btnCanvasClear']||'');
	this.btn_VideoJoin		= this.getObject(elements['btnVideoJoin']||'');
	this.btn_VideoOn		= this.getObject(elements['btnVideoOn']||'');
	this.btn_VideoOff		= this.getObject(elements['btnVideoOff']||'');
	
	this.logging("SocialChat] initialize start.");
	this.initializeUI();

	if (typeof io != "function") {
		this.logging("Not Found 'Node.js' module in 'spcked.io'.");
	} else {
		this.initializeEvent();
		this.initializeVideoChat();
	}

	this.logging("SocialChat] initialize complete.");
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
			if (this.isDebug && console) {
				console.log.apply(window, arguments);
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
		this.showObject(this.btn_ConnectAi, false);
		this.showObject(this.txt_AiChatName, false);
		
		this.showObject(this.panel_CanvasGroup, true);
		this.showObject(this.panel_VideoGroup, false);
		
		this.btn_VideoJoin.removeClass('btn-primary').addClass('btn-secondary');
		this.btn_VideoOn.removeClass('btn-info').addClass('btn-secondary');
		this.btn_VideoOff.removeClass('btn-danger').addClass('btn-secondary');
	
		this.logging("SocialChat] initializeUI complete.");
	},
	/**
	 * 
	 */
	initializeEvent : function() {
		var THIS = this;
	
		THIS.btn_Connect.click(function(e) {
			THIS.connectServer();
		});
		THIS.btn_ConnectAi.click(function(e) {
			THIS.connectAiChat();
		});
		THIS.btn_Disconnect.click(function(e) {	
			THIS.disconnectServer();
		});
		THIS.txt_UserName.keypress(function(e) {				
			if(e.which == 13 && $(this).val() != '') {
				THIS.connectServer();
			}
		});
		THIS.btn_Send.click(function(e) {
			if (THIS.txt_ChatMsg && THIS.txt_ChatMsg.val() != '') {
				THIS.send('send_chat', THIS.txt_ChatMsg.val());
				THIS.txt_ChatMsg.val('');
			}	
		});
		THIS.txt_ChatMsg.keypress(function(e) {	
			if(e.which == 13 && $(this).val() != '') {
				THIS.btn_Send.click();
			}
		});
		THIS.btn_Select.click(function(e) {	
			var selectUser		= '';
			var selectMessage	= '';
	
			if (THIS.txt_SelectUser) 
				selectUser = THIS.txt_SelectUser.val();
			
			if (THIS.txt_ChatMsg && THIS.txt_ChatMsg.val() != '') {
				selectMessage = THIS.txt_ChatMsg.val();
			}
			THIS.send('secret_chat', selectUser, selectMessage);
		});
		THIS.logging("SocialChat] initializeEvent complete.");
	},
	
	/**
	 * initialize Canvers Board
	 */
	initializeCanvers : function() {
		var THIS	= this,
			canvas	= (this.panel_Canvas[0] || undefined);
			
		// Set ColorPicker.
		THIS.setColorPicker(this.panel_PenColor);
		THIS.btn_ChangeColor.click(function() {
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
		THIS.logging("SocialChat] initialize Canvas setting complete.");
	},
	
	/**
	* initialize Video Chat..
	**/	
	initializeVideoChat : function() {
		var THIS = this;
		THIS.btn_VideoOn.click(function(e) {
			if(!THIS.btn_VideoOn.hasClass('btn-secondary')) {
				THIS.btn_VideoOn.removeClass('btn-info').addClass('btn-secondary');
				THIS.connectPeerServer()
					.then(() => {
						THIS.createVideoRoom();
					})
					.then(() => {
						THIS.btn_VideoJoin.removeClass('btn-primary').addClass('btn-secondary');						
						THIS.btn_VideoOff.removeClass('btn-secondary').addClass('btn-danger');	
					});				
			}
		});
		THIS.btn_VideoOff.click(function(e) {
			if(!THIS.btn_VideoOff.hasClass('btn-secondary')) {
				THIS.btn_VideoOff.removeClass('btn-danger').addClass('btn-secondary');	
				THIS.disconnectVideoRoom()
					.then(() => {
						THIS.btn_VideoJoin.removeClass('btn-primary').addClass('btn-secondary');
						THIS.btn_VideoOn.removeClass('btn-secondary').addClass('btn-info');
						THIS.panel_Video.empty();
					});
			}
		});
		THIS.btn_VideoJoin.click(function(e) {
			if(!THIS.btn_VideoJoin.hasClass('btn-secondary')) {
				THIS.btn_VideoJoin.removeClass('btn-primary').addClass('btn-secondary');
				THIS.connectPeerServer()
					.then(() => {
						THIS.createVideoRoom();
					})
					.then(() => {
						THIS.btn_VideoOn.removeClass('btn-info').addClass('btn-secondary');
						THIS.btn_VideoOff.removeClass('btn-secondary').addClass('btn-danger');
					});
			}
		});
		THIS.logging('Video Chat] initializeVideoChat complete.');
	},
	createVideoRoom : async function() {
		var THIS = this;
		
		THIS.logging('Video Chat] createVideoRoom start..');
		THIS.video = document.createElement('video');
		THIS.video.muted = true;
		THIS.currentUser.isHost  = true;
		THIS.currentUser.room_id = THIS.currentVideoRoomId || THIS.room_uuid;		
		
		const setVideoSize = function() {
			var oGrid = THIS.panel_VideoGroup.find('div.video-grid');
			if (oGrid.find('video').length > 1) {
				oGrid.find('video').each(function() {
					$(this).width(270).height(210);
				});
			} else {
				oGrid.find('video').width('100%').height('100%');
			}
		};
		const addVideoStream = function(type, video, stream) {
			THIS.logging('Video Chat] addVideoStream('+ type +')');
			video.srcObject = stream;
			video.addEventListener('loadedmetadata', function() {
				video.play();
			});
			if (type == 'guest') {
				THIS.showObject(THIS.panel_CanvasGroup, false);
				THIS.showObject(THIS.panel_VideoGroup, true);
				THIS.panel_VideoGroup.find('div.video-grid').append(video);
				setVideoSize();
			} else {
				THIS.panel_Video.append(video);	
			}
		};
		const connectToNewUser = function(userId, stream) {
			THIS.logging('Video Chat] connectToNewUser('+userId+')');
			
			const call = THIS.peer.call(userId, stream);
			const video= document.createElement('video');
			call.on('stream', function(userVideoStream) {
				addVideoStream('guest', video, userVideoStream)
			});
			call.on('close', function() {
				video.remove();
				setVideoSize();
			});
			THIS.peers[userId] = call;
		};
		
		navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(
			function(stream) {
				addVideoStream('self', THIS.video, stream);

				THIS.peer.on('call', call => {
					THIS.logging('Video Chat] peer.on.call()');
					call.answer(stream);
					const userVideo = document.createElement('video');
					call.on('stream', userVideoStream => {
						THIS.logging('Video Chat] peer.on.call() -> userVideoStream');
						addVideoStream('guest', userVideo, userVideoStream);
					});
				});
				THIS.socket.on('user-connected', userId => {
					THIS.logging('Video Chat] user-connected('+ userId +')');
					setTimeout(() => {
						connectToNewUser(userId, stream);
						THIS.logging('Video Chat] user-connected('+ userId +') successfully!');
					}, 3000);
				});
			}, 
			function(e) {
				THIS.logging('Video Chat] '+ (e['message']||'Could not start video source!'));
				THIS.peer.on('call', call => {
					THIS.logging('Video Chat] peer.on.call().None');
					const userVideo = document.createElement('video');
					call.on('stream', userVideoStream => {
						THIS.logging('Video Chat] peer.on.call().None -> userVideoStream');
						addVideoStream('guest', userVideo, userVideoStream);
					});
				});
				THIS.socket.on('user-connected', userId => {
					THIS.logging('Video Chat] user-connected('+ userId +').None');
				});
			});
		
		if(!THIS.isVideo) {
			THIS.peer.on('open', peerId => {
				THIS.logging('Video Chat] peer-open('+ peerId +')')
				THIS.currentUser.peer_id = peerId;
				THIS.socket.emit('join-room', THIS.currentUser.room_id, THIS.currentUser.peer_id);
				THIS.socket.emit('sync_status', THIS.currentUser);
			});
			THIS.socket.on('user-disconnected', userId => {
				THIS.logging('Video Chat] user-disconnected('+ userId +')');
				THIS.currentVideoRoomId = '';
				if (THIS.peers[userId]) THIS.peers[userId].close();
				setTimeout(() => {
					if (THIS.panel_VideoGroup.find('video').length == 0) {
						THIS.showObject(THIS.panel_CanvasGroup, true);
						THIS.showObject(THIS.panel_VideoGroup, false);
					}
					THIS.logging('Video Chat] user-disconnected('+ userId +') complete!');				
				}, 3000);
			});
			THIS.isVideo = true;
		}
		THIS.currentVideoRoomId = THIS.currentUser.room_id;
		THIS.logging('Video Chat] createVideoRoom complate. {'+ THIS.currentVideoRoomId +'}');
		return THIS;
	},
	connectPeerServer: async function() {
		if(!this.peer) {
			//this.peer = new Peer();
			//this.peer = new Peer(undefined, {host:'peerjs-server.herokuapp.com', secure:true, port:443});	
			this.peer = new Peer(undefined, {host:'peerjs-server.run.goorm.io', secure:true, port:443});	
		}
		return this;
	},
	connectVideoRoom : function(roomId) {
		if (roomId != this.currentUser['room_id'] && roomId != this.currentVideoRoomId) {
			this.logging('Video Chat] connectVideoRoom('+ roomId +')');
			this.currentVideoRoomId = roomId;
			this.btn_VideoJoin.removeClass('btn-secondary').addClass('btn-primary');
			this.btn_VideoOn.removeClass('btn-info').addClass('btn-secondary');
			this.btn_VideoOff.removeClass('btn-danger').addClass('btn-secondary');
		}
		return this;
	},
	disconnectVideoRoom: async function() {
		if (this.currentUser['room_id']) {
			this.logging('Video Chat] disconnectVideoRoom('+ this.currentUser.room_id +')');
			this.socket.emit('disconnect-room');
			this.currentUser.room_id = '';
			this.currentUser.peer_id = '';
			this.socket.emit('sync_status', this.currentUser);	
		}
		return this;
	},

	

	/**
	 * connect chat server.
	 * use by node.js, socket.io
	 */
	connectServer : function(options = {}) {
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
		THIS.socket = io.connect((THIS.serverUri + THIS.serverPort), {'force new connection': true } );		
		
		// 서버에 연결되면 연결 메시지 보여줌
		THIS.socket.on('connect', function(){
			THIS.socket.emit("connect_user", THIS.txt_UserName.val() );
			THIS.isCon = true;
			THIS.clearChatPanel();
			THIS.appendMsg( "connected server.", true);	
			THIS.txt_UserName.attr("readonly", true);
			THIS.txt_UserName.css({'backgroundColor': '#333'});
			THIS.btn_VideoOn.removeClass('btn-secondary').addClass('btn-primary');
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
			//THIS.logging("update_users - " + data.users[data.users.length-1].name);
			//console.log("update_users", data);	
			for(var i=data.users.length-1; i>=0; i--){ 
				if (THIS.txt_UserName.val() == data.users[i].name) {
					THIS.currentUser = data.users[i];
					break;
				}
			}
			for(var i=0; i<data.users.length; i++){ 
				var user = data.users[i];
				if (user && user.id) {
					if(!THIS.userLists["u_"+ user.id]) {
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
			THIS.socket= undefined;
			THIS.peer  = undefined;
			THIS.video = undefined;
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
		THIS.showObject(THIS.btn_ConnectAi, true);
		THIS.showObject(THIS.txt_AiChatName, true);
		
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
		this.showObject(this.btn_ConnectAi, false);
		this.showObject(this.txt_AiChatName, false);
		this.btn_VideoJoin.removeClass('btn-info').addClass('btn-secondary');
		this.btn_VideoOn.removeClass('btn-primary').addClass('btn-secondary');
		this.btn_VideoOff.removeClass('btn-danger').addClass('btn-secondary');
	
		if (this.socket)
			this.socket.disconnect();
	},
	
	connectAiChat : function() {
		if (this.isCon && this.socket) {
			this.socket.emit("ai_create", this.txt_AiChatName.val() );	
			this.appendMsg( "crated Ai Chat.", true);	
			//this.txt_AiChatName.attr("readonly", true);
			//this.txt_AiChatName.css({'backgroundColor': '#333'});
			this.txt_AiChatName.val('');
		}
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
				isCurrentUser = true;
			}
			if (isCurrentUser) {
				this.panel_PenColor.css("backgroundColor", user.color);
			} else {
				if (user.room_id && user.room_id != '') {
					this.connectVideoRoom(user.room_id);
				}
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
			if (user.peer_id != '') {
				userPanel.find("strong").text('# '+ user.name + ' #');
			} else {
				userPanel.find("strong").text(user.name);
			}
			userPanel.find("span.badge").empty().append(user.count);
			userPanel.find("span.color-picker").css("backgroundColor", user.color);
			
			this.drowUserMousePoint(user);
		}
	},
	
	deleteUser : function(user) {
		if (user && user.id) {
			if (user.id == this.currentUser.id) {
				if (this.currentUser.room_id && this.peers[this.currentUser.room_id]) {
					this.peers[this.currentUser.room_id].close();
				}
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