var _ = require('underscore');
var sonos = require('sonos');

module.exports = function(RED) {
    function PlayNext(config) {
        RED.nodes.createNode(this,config);
        var node = this;			
		
        this.on('input', function(msg) {
						
			var player = new sonos.Sonos(msg.payload.sonosIP);
			
			player.next(function (err, nexted) {
			  if (!err || !nexted) {
				node.log('Complete')
			  } else {
				node.log('OOOHHHHHH NOOOO')
			  }
			})	
			
        });
    }
    RED.nodes.registerType("ha-sonos-playnext", PlayNext);
}