var CycleDAO = require('./DAO/CycleDAO.js');
var Cycle = require("./Cycle.js");
var cyclesDAO = new CycleDAO();

var cycles = []

function add(relayId,cycleId){
	cyclesDAO.findOne(cycleId, function(cycle) {
		cycles[relayId] = new Cycle(cycle.on, cycle.off);
		cycles[relayId].start();
	});
}

function putCycle(cycle) {
	cycles[cycle.relay_id] = new Cycle(cycle.on,cycle.off);
}

function get(relayId){
	return cycles[relayId];
}

function printAll() {
	Object.keys(cycles).forEach(function(key) {
    	console.log(key, cycles[key]);
	});
}

module.exports.add = add;
module.exports.get = get;
module.exports.printAll = printAll;
module.exports.putCycle = putCycle;