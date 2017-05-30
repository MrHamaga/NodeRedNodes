var _ = require('underscore')
var sonos = require('sonos')

var TIMEOUT = 2000 // Search for 2 seconds, increase this value if not all devices are shown
var devices = []

  // Functions to process device information

function getBridges (deviceList) {
  var bridges = []
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === 'BRIDGE' && bridges.indexOf(device.ip + ':' + device.port) === -1) {
      bridges.push(device.ip + ':' + device.port)
    }
  })
  return bridges
}

function getBridgeDevices (deviceList) {
  var bridgeDevices = []
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === 'BRIDGE') {
      bridgeDevices.push(device)
    }
  })
  return bridgeDevices
}

function getZones (deviceList) {
  var zones = []
  deviceList.forEach(function (device) {
    if (zones.indexOf(device.CurrentZoneName) === -1 && device.CurrentZoneName !== 'BRIDGE') {
      zones.push(device.CurrentZoneName)
    }
  })
  return zones
}

function getZoneDevices (zone, deviceList) {
  var zoneDevices = []
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === zone) {
      zoneDevices.push(device)
    }
  })
  return zoneDevices
}

function getZoneCoordinator (zone, deviceList) {
  var coordinator
  deviceList.forEach(function (device) {
    if (device.CurrentZoneName === zone && device.coordinator === 'true') {
      coordinator = device
    }
  })
  return coordinator
}


module.exports = function(RED) {
    function FindSonosDevices(config) {
        RED.nodes.createNode(this,config);
        var node = this;		
		//node.log('\t' + JSON.stringify(config))			 		
		node.searchtype = config.searchtype;
		//node.log('\t' + this.searchtype)
        this.on('input', function(msg) {

			sonos.search({timeout: TIMEOUT}, function (device, model) {
				  var data = {ip: device.host, port: device.port, model: model}

				  device.getZoneAttrs(function (err, attrs) {
					if (!err) {
					  _.extend(data, attrs)
					}
					device.getZoneInfo(function (err, info) {
					  if (!err) {
						_.extend(data, info)
					  }
					  device.getTopology(function (err, info) {
						if (!err) {
						  info.zones.forEach(function (group) {
							if (group.location === 'http://' + data.ip + ':' + data.port + '/xml/device_description.xml') {
							  _.extend(data, group)
							}
						  })
						}
						devices.push(data)
					  })
					})
				  })
			})
			
			setTimeout(function () {
				//node.log('\nBridges:\n--------')
				//node.log(node.searchtype);
 
				 switch (node.searchtype.toLowerCase()){
					case "bridges":
						var bridges = getBridges(devices);
						bridges.forEach(function (bridge) {
							// node.log(bridge)
							getBridgeDevices(devices).forEach(function (device) {
							// node.log('\t' + JSON.stringify(device))
								var debugMessage = {payload:device};
								node.send([null, debugMessage]);
							})
						})
						break;
					 
					  case "zones":	  
					//  node.log('\nZones (coordinator):\n--------------------')
						getZones(devices).forEach(function (zone) {
							var coordinator = getZoneCoordinator(zone, devices)
							if (coordinator !== undefined) {
								var newMsg;
								if(typeof msg.payload === 'object'){
									newMsg = msg;
								}else{
									newMsg = {payload : {orig : msg.payload}};
								}
								newMsg.payload.coordinator=coordinator;
								newMsg.payload.zone=zone;

								node.send([newMsg, null]);
						  //    	node.log(zone + ' (' + coordinator.ip + ':' + coordinator.port + ')')
							}		
							getZoneDevices(zone, devices).forEach(function (device) {
								
								  //node.log('\t' + JSON.stringify(device))		
							})
					  })
				  }
			}, TIMEOUT)
        });
    }
    RED.nodes.registerType("find-sonos-devices",FindSonosDevices);
}