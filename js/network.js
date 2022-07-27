// ==========================================
// Network
//
// This class manages the connection between the client and the
// server and everything involved.
// ==========================================

// ==========================================
// Client
// ==========================================

// Constructor( socketio )
//
// Creates a new client using the specified socket interface.

function Client( socketio )
{
	this.io = socketio;
	this.eventHandlers = {};
	this.kicked = false;
}

// connect( uri, nickname )
//
// Connect to a server with the specified nickname.

Client.prototype.connect = function( uri, nickname )
{
	var socket = this.socket = this.io.connect( uri, { reconnect: false } );
	this.nickname = nickname;

	// Hook events
	var s = this;
	socket.on( "connect", function() { s.onConnection(); } );
	socket.on( "disconnect", function() { s.onDisconnection(); } );
	socket.on( "world", function( data ) { s.onWorld( data ); } );
	socket.on( "spawn", function( data ) { s.onSpawn( data ); } );
	socket.on( "setblock", function( data ) { s.onBlockUpdate( data ); } );
	socket.on( "msg", function( data ) { s.onMessage( data ); } );
	socket.on( "kick", function( data ) { s.onKick( data ); } );
	socket.on( "join", function( data ) { s.onPlayerJoin( data ); } );
	socket.on( "leave", function( data ) { s.onPlayerLeave( data ); } );
	socket.on( "player", function( data ) { s.onPlayerUpdate( data ); } );
	socket.on( "setpos", function( data ) { s.onPlayerSetPos( data ); } );
}

// setBlock( x, y, z, mat )
//
// Called to do a networked block update.

Client.prototype.setBlock = function( x, y, z, mat )
{
	this.socket.emit( "setblock", {
		x: x,
		y: y,
		z: z,
		mat: mat.id
	} );
}

// sendMessage( msg )
//
// Send a chat message.

Client.prototype.sendMessage = function( msg )
{
	this.socket.emit( "chat", {
		msg: msg
	} );
}

// updatePlayer()
//
// Sends the current player position and orientation to the server.

Client.prototype.updatePlayer = function()
{
	var player = this.world.localPlayer;

	this.socket.emit( "player", {
		x: player.pos.x,
		y: player.pos.y,
		z: player.pos.z,
		pitch: player.angles[0],
		yaw: player.angles[1]
	} );
}

// on( event, callback )
//
// Hooks an event.

Client.prototype.on = function( event, callback )
{
	this.eventHandlers[event] = callback;
}

// onConnection()
//
// Called when the client has connected.

Client.prototype.onConnection = function()
{
	if ( this.eventHandlers["connect"] ) this.eventHandlers.connect();

	this.socket.emit( "nickname", { nickname: this.nickname } );
}

// onDisconnection()
//
// Called when the client was disconnected.

Client.prototype.onDisconnection = function()
{
	if ( this.eventHandlers["disconnect"] ) this.eventHandlers.disconnect( this.kicked );
}

// onWorld( data )
//
// Called when the server has sent the world.

Client.prototype.onWorld = function( data )
{
	// Create world from string representation
	var world = this.world = new World( data.sx, data.sy, data.sz );
	world.createFromString( data.blocks );

	if ( this.eventHandlers["world"] ) this.eventHandlers.world( world );
}

// onSpawn( data )
//
// Called when the local player is spawned.

Client.prototype.onSpawn = function( data )
{
	// Set spawn point
	this.world.spawnPoint = new Vector( data.x, data.y, data.z );

	if ( this.eventHandlers["spawn"] ) this.eventHandlers.spawn();
}

// onBlockUpdate( data )
//
// Called when a block update is received from the server.

Client.prototype.onBlockUpdate = function( data )
{
	var material = BLOCK.fromId( data.mat );

	if ( this.eventHandlers["block"] ) this.eventHandlers.block( data.x, data.y, data.z, this.world.blocks[data.x][data.y][data.z], material );

	this.world.setBlock( data.x, data.y, data.z, material );
}

// onMessage( data )
//
// Called when a message is received.

Client.prototype.onMessage = function( data )
{
	if ( data.type == "chat" ) {
		if ( this.eventHandlers["chat"] ) this.eventHandlers.chat( data.user, data.msg );
	} else if ( data.type == "generic" ) {
		if ( this.eventHandlers["message"] ) this.eventHandlers.message( data.msg );
	}
}

// onKick( data )
//
// Called when a kick message is received.

Client.prototype.onKick = function( data )
{
	this.kicked = true;
	if ( this.eventHandlers["kick"] ) this.eventHandlers.kick( data.msg );
}

// onPlayerJoin( data )
//
// Called when a new player joins the game.

Client.prototype.onPlayerJoin = function( data )
{
	data.moving = false;
	data.aniframe = 0;
	this.world.players[data.nick] = data;
}

// onPlayerLeave( data )
//
// Called when a player has left the game.

Client.prototype.onPlayerLeave = function( data )
{
	if ( this.world.players[data.nick].nametag ) {
		this.world.renderer.gl.deleteBuffer( this.world.players[data.nick].nametag.model );
		this.world.renderer.gl.deleteTexture( this.world.players[data.nick].nametag.texture );
	}

	delete this.world.players[data.nick];
}

// onPlayerUpdate( data )
//
// Called when the server has sent updated player info.

Client.prototype.onPlayerUpdate = function( data )
{
	if ( !this.world ) return;

	var pl = this.world.players[data.nick];
	if ( Math.abs(data.x - pl.x) > 0.1 ||
		 Math.abs(data.y - pl.y) > 0.1 ||
		 Math.abs(data.z - pl.z) > 0.1)
	{
		pl.moving = true;
	}

	pl.x = data.x;
	pl.y = data.y;
	pl.z = data.z;
	pl.pitch = data.pitch;
	pl.yaw = data.yaw;
	window.setTimeout(function(){pl.moving=false},100);
}

// onPlayerSetPos( data )
//
// Called when the server wants to set the position of the local player.

Client.prototype.onPlayerSetPos = function( data )
{
	this.world.localPlayer.pos = new Vector( data.x, data.y, data.z );
	this.world.localPlayer.velocity = new Vector( 0, 0, 0 );
}