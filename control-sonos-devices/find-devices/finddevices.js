var _ = require('underscore');

var url=require('url');
const Sonos = require('sonos')

console.log('Searching for Sonos devices...')
const search = Sonos.DeviceDiscovery({ timeout: 30000 })

//const { DeviceDiscovery  } = require('sonos');

var TIMEOUT = 3000; // Search for 2 seconds, increase this value if not all devices are shown
//var devices = [];

// Functions to process device information

function getBridges(deviceList) {
	var bridges = []
	deviceList.forEach(function (device) {
		if (device.CurrentZoneName === 'BRIDGE' && bridges.indexOf(device.ip + ':' + device.port) === -1) {
			bridges.push(device.ip + ':' + device.port)
		}
	})
	return bridges
}

function getBridgeDevices(deviceList) {
	var bridgeDevices = []
	deviceList.forEach(function (device) {
		if (device.CurrentZoneName === 'BRIDGE') {
			bridgeDevices.push(device)
		}
	})
	return bridgeDevices
}

function getZones(deviceList) {
	var zones = []
	deviceList.forEach(function (device) {
		if (zones.indexOf(device.CurrentZoneName) === -1 && device.CurrentZoneName !== 'BRIDGE') {
			zones.push(device.CurrentZoneName)
		}
	})
	return zones
}

function getZoneDevices(zone, deviceList) {
	var zoneDevices = []
	deviceList.forEach(function (device) {
		if (device.CurrentZoneName === zone) {
			zoneDevices.push(device)
		}
	})
	return zoneDevices
}

function getZoneCoordinator(node, zone, deviceList) {
	var coordinator;
	
	deviceList.forEach(function (device) {
		//node.log('\tZone: '  + zone + ". Device: " + JSON.stringify(device))
		if (device.CurrentZoneName === zone /* && device.coordinator === 'true'*/) {
			coordinator = device;
		}
	})
	return coordinator;
}
function getGroupCoordinator(group) {
	var coordinator = {};
	var coordinatorId = group.Coordinator;
	//console.log('Group from device %s', coordinatorId, JSON.stringify(group, null, 2));
	var coordinatorZoneGroupMember = _.where(group.ZoneGroupMember, {UUID: coordinatorId})[0];
	//console.log('ZoneGroupMember from device %s', coordinatorId, JSON.stringify(coordinatorZoneGroupMember, null, 2));
	coordinator.ip = url.parse(coordinatorZoneGroupMember.Location).hostname;
	coordinator.ZoneGroupMember = coordinatorZoneGroupMember;
	return coordinator;
}


module.exports = function (RED) {
	function FindSonosDevices(config) {

		RED.nodes.createNode(this, config);
		var node = this;
		//node.log('\t' + JSON.stringify(config))			 		
		node.searchtype = config.searchtype;
		// console.log('config %s', JSON.stringify(config, null, 2));
		
		this.on('input', function (msg) {
			var devices = [];
				
			// search.on('DeviceAvailable', function (device, model) {
			
				// var sonosIpsStr = global.get("SonosIps");
				// if(sonosIpsStr===undefined){
					// sonosIpsStr = "";    
				// }
				// sonosIps = sonosIpsStr.split(",");
				// sonosIps.push(device.host);
				// global.set("SonosIps", sonosIps.join(","));
									
			// })
			
			setTimeout(function () {
		
				switch (node.searchtype.toLowerCase()) {
					case "devices":
						devices.forEach(function (dev) {
							var newMsg;
							if (typeof msg.payload === 'object') {
								newMsg = msg;
							} else {
								newMsg = {
									payload: {
										orig: msg.payload
									}
								};
							}
							newMsg.payload.sonosControl = dev;
							newMsg.payload.coordinator = dev;
							newMsg.payload.zone = dev;
							node.send([newMsg, null]);
						});
						break;
					case "bridges":
						var bridges = getBridges(devices);
						bridges.forEach(function (bridge) {
							getBridgeDevices(devices).forEach(function (device) {
								node.log('\t' + JSON.stringify(device))

								var debugMessage = {
									payload: device
								};
								node.send([null, debugMessage]);
							})
						})
						break;

					case "zones":
						node.log('\nZones (coordinator):\n--------------------')
					
						Sonos.DeviceDiscovery().once('DeviceAvailable', (device) => {
							console.log('found device at ' + device.host)
							device.getAllGroups().then(groups => {
							
								for(var i = 0; i < groups.length; i++){
									var coordinator = getGroupCoordinator(groups[i]);
									//console.log('Coordinator %s', JSON.stringify(coordinator, null, 2));
									var newMsg;
									if (typeof msg.payload === 'object') {
										newMsg = msg;
									} else {
										newMsg = { 
											payload: {
												orig: msg.payload
											}
										};
									}
									newMsg.payload.coordinator = coordinator;
									newMsg.payload.zone = groups[i].ID;
								
									node.send([newMsg, null]);	
									
								}								
							}).catch(err => {							 
							  console.warn('Error getting groups: %s', err)
							})
						})											
						node.log('\nZones end :\n--------------------');
				}
			}, TIMEOUT)
			
		});
	}
	RED.nodes.registerType("find-sonos-devices", FindSonosDevices);
}