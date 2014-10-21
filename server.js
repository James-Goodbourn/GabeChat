var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	UUID = require('node-uuid');

var path = require('path');

app.use(express.static(path.join(__dirname, 'public_html')));

http.listen(8080, function(){
  console.log('listening on *:8080');
});

var Chat = function(){

	var users = {
		'server': {
			clientid: 0,
			key: 'server',
			nick: 'Gabe Newell',
			colour: '#333',
			ip: 'Lord Gabe doesn\'t need an ip address, he is everywhere and everything',
			lastActive: new Date()
		}
	},
	userCount = 0;

	function stripHtml(str){
		return str.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi, '').trim();
	}
	function isUserNickTaken(newNick){
		for(var key in users){
			if(users[key].nick.toLowerCase()==newNick)
				return true;
		}
		return false;
	}

	return {
		addUser: function(user){
			userCount++;
			user.clientid = userCount;
			user.nick = 'Gabe Lover '+userCount;
			user.colour = '#333';
			user.ip = user.handshake.address;
			user.lastActive = new Date();
			console.log('Connection: '+user.ip);
			this.broadcastMsg(this.buildMsg('server','status', user.nick+' Connected'));
			users[user.key] = user;
			this.updateUserList();
		},
		disconnectUser: function(user){
			delete users[user.key];
			this.broadcastMsg(this.buildMsg('server','status', user.nick+' Disconnect'));
			this.updateUserList();
		},
		updateUserList: function(){
			var user_return = [];
			for(var user_key in users){
				user_return.push({
					id: users[user_key].clientid,
					nick: users[user_key].nick,
					lastActive: users[user_key].lastActive,
					ip: users[user_key].ip
				});
			}
			io.emit('updateUsers', user_return);
		},
		broadcastMsg: function(object){
			io.emit('msg', object);
			this.updateUserList();
		},
		sendMsg: function(key,object){
			users[key].emit('msg', object);
		},
		buildMsg: function(sender,type,msg){
			return {
				'time': Date(),
				'type': type,
				'user': users[sender].nick,
				'color': users[sender].colour,
				'ip': users[sender].ip,
				'msg': msg
			}
		},
		parseMsg: function(key,msg){

			users[key].lastActive = new Date();

			if(msg.substring(0,1)=='/'){
				this.parseCommand(key,msg.substring(1,msg.length));
				return;
			}

			msg = stripHtml(msg);

			link_regex_match = /((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi;
			msg =  msg.replace(link_regex_match, function(url) {
				return '<a href="' + url + '" target="_BLANK">' + url + '</a>';
			});

			if(msg.length>0){
				this.broadcastMsg(this.buildMsg(key,'message',msg));
			}
		},
		parseCommand: function(key,command){
			if(command.length>0){
				command = command.split(' ');
				switch(command[0].toLowerCase()){
					case 'nick':
						if(typeof command[1]!='undefined' && command[1].length>0){
							var oldNick = users[key].nick, newName = stripHtml(command[1]);

							if(isUserNickTaken(newName.toLowerCase())){
								this.sendMsg(key,this.buildMsg('server','status', 'Username has already been taken'));
								break;
							}
							users[key].nick = newName;
							this.broadcastMsg(this.buildMsg('server','status', oldNick+' renamed to '+newName));
							this.updateUserList();
						}
					break;
					case 'whois':
						if(typeof command[1]!='undefined' && command[1].length>0){
							var name = stripHtml(command[1]);
							this.broadcastMsg(this.buildMsg('server','status', 'Who is '+name+'? '+name+' is a faggot'));
						}
					break;
					case 'setcolour':
						if(typeof command[1]!='undefined' && command[1].length>0){
							// Parse hex code
							users[key].colour = stripHtml(command[1]);
							this.sendMsg(key,this.buildMsg('server','status', 'Your text colour has changed'));
						}
					break;
					case 'bump':
						this.broadcastMsg(this.buildMsg('server','status', users[key].nick+' bumped the chat'));
					break;
				}
			}
		},
	}
}

var chat_server = new Chat();

io.set('authorization', function (handshake, cb) {
    //console.log('Auth: ', handshake.query);
    cb(null, true);
});
io.on('connection', function(user){
	user.key = UUID();
	chat_server.addUser(user);

	user.on('disconnect',function(){
		chat_server.disconnectUser(user);
	});
	user.on('msg',function(msg){
		chat_server.parseMsg(user.key,msg);
	});
});