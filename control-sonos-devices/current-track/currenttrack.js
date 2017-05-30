var _ = require('underscore');
var sonos = require('sonos');

var currentlyPlaying = [];

module.exports = function(RED) {
    function ExtractCurrentTrack(config) {
        RED.nodes.createNode(this,config);
        var node = this;		
		node.mode = config.mode;
		
        this.on('input', function(msg) {
			//node.log(JSON.stringify(msg.payload));
			
			switch(node.mode){
				case "Multiple":
					for(i = 0; i < msg.payload.ips.length; i++)
					{						
						var player = new sonos.Sonos(msg.payload.ips[i].ip);
						
						player.currentTrack(function (err, track) {
							currentlyPlaying.push({ip: ip, track:track});
							node.log(JSON.stringify(currentlyPlaying));
						})			
					}			
				node.send(msg);					
				break;
				
				case "Single":					
					var player = new sonos.Sonos(msg.payload.sonosIP);
					player.currentTrack(function (err, track) {
						msg.payload.currenttrack = track;
						node.send(msg);
					})							
				break;			
			}			
        });
    }
    RED.nodes.registerType("ha-sonos-currenttrack", ExtractCurrentTrack);
}