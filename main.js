	// HTML elements
    var page = {};
    page.renderSurface = document.getElementById( "renderSurface" );
    page.materialSelector = document.getElementById( "materialSelector" );
    page.chatbox = document.getElementById( "chatbox" );
    page.chatboxText = document.getElementById( "chatbox_text" );
    page.chatboxEntry= document.getElementById( "chatbox_entry" );
    page.nickname = document.getElementById( "nickname" );
    page.nicknameInput = document.getElementById( "nickname_input" );
    page.joinInfo = document.getElementById( "joininfo" );
    page.joinInfoText = document.getElementById( "joininfo_text" );

    // Game elements
    var client, render, world, player

    // Focus on username field
    page.nicknameInput.focus();

    // Respond to username entry
    function onNicknameEnter( nicknameInput, keyEvent )
    {
        var nickname = nicknameInput.value.trim();

        if ( keyEvent.keyCode != 13 ) return;
        if ( nickname.length == 0 ) return;

        nicknameInput.blur();

        joinGame( nickname );
    }

    //Handle on press connect
    function handleOnPressConnect(){
    
        onNicknameEnter(page.nicknameInput, {keyCode: 13});
    }

    // Respond to chat message entry
    function onChatEnter( chatInput, keyEvent )
    {

        var msg = chatInput.value.trim();

        if ( keyEvent.keyCode != 13 ) return;
        chatInput.blur();
        page.chatbox.style.height = null;
        if ( msg.length == 0 ) return;

        client.sendMessage( msg );

        chatInput.value = "";
    }

    // Join game
    function joinGame( nickname )
    {
        // Show join info
        page.nickname.style.visibility = "hidden";
        page.joinInfo.style.visibility = null;
        page.joinInfoText.innerHTML = "Connecting to server...";

        // Create client and attempt connection
        client = new Client( io );
        client.connect( "https://band-eager-mouse.glitch.me", nickname );

        // Update connection status
        client.on( "connect", function()
        {
            console.log('hai');
            page.joinInfoText.innerHTML = "Receiving world...";
        } );

        // Initialise world
        client.on( "world", function( w )
        {
            page.joinInfoText.innerHTML = "Building chunks...";

            // Set up world
            world = w;

            // Set up renderer and build level chunks
            render = new Renderer( "renderSurface" );
            render.setWorld( world, 8 );
            render.setPerspective( 60, 0.01, 200 );

            // Build all world chunks
            render.buildChunks( 999 );

            page.joinInfoText.innerHTML = "Spawning...";
        } );

        // Spawn local player
        client.on( "spawn", function()
        {
            // Set up local player
            player = new Player();
            player.setWorld( world );
            player.setClient( client );
            player.setInputCanvas( "renderSurface" );
            player.setMaterialSelector( "materialSelector" );

            // Handle open chat on 't' event
            player.on( "openChat", function()
            {
                page.chatboxEntry.focus();
                page.chatbox.style.height = ( render.gl.viewportHeight - 145 ) + "px";
            } );

            // Open game view
            page.joinInfo.style.visibility = "hidden";
            page.renderSurface.style.visibility = null;
            page.materialSelector.style.display = null;
            page.chatbox.style.visibility = null;
            page.chatboxEntry.style.visibility = null;

            // Render loop
            var lastUpdate = +new Date() / 1000.0;
            setInterval( function()
            {
                var time = +new Date() / 1000.0;

                // Update local player
                player.update();

                // Update networked player
                if ( time - lastUpdate > 0.033 ) {
                    client.updatePlayer();
                    lastUpdate = time;
                }

                // Build chunks
                render.buildChunks( 5 );

                // Draw world
                render.setCamera( player.getEyePos().toArray(), player.angles );
                render.draw();

                while ( new Date().getTime() / 1000 - time < 0.016 );
            }, 1 );
        } );

        // Display chat messages
        client.on( "chat", function( username, message )
        {
            page.chatboxText.innerHTML += "&lt;<span style=\"color: #0a0\">" + username + "</span>&gt " + message + "<br />";
        } );

        client.on( "message", function( message )
        {
            page.chatboxText.innerHTML += "<span style=\"color: #ff8\">" + message + "</span><br />";
        } );

        // Handle kicking
        client.on( "kick", function( message )
        {
            page.joinInfo.style.visibility = null;
            page.renderSurface.style.visibility = "hidden";
            page.materialSelector.style.display = "none";
            page.chatbox.style.visibility = "hidden";
            page.chatboxEntry.style.visibility = "hidden";

            page.joinInfoText.innerHTML = "<span style=\"color: #f00; text-shadow: #a00 2px 2px 0px\">Kicked:</span> " + message;
        } );

        // Handle being disconnected
        client.on( "disconnect", function( kicked )
        {
            if ( !kicked ) {
                page.joinInfo.style.visibility = null;
                page.renderSurface.style.visibility = "hidden";
                page.materialSelector.style.display = "none";
                page.chatbox.style.visibility = "hidden";
                page.chatboxEntry.style.visibility = "hidden";

                page.joinInfoText.innerHTML = "<span style=\"color: #f00; text-shadow: #a00 2px 2px 0px\">Connection Problem:</span> Lost connection to server!";
            }
        } );
    }