var CronJob = require('cron').CronJob;
var moment = require('moment');

var Cycle = function(timeOn, timeOff){
	this.timeOn = timeOn;
	this.timeOff = timeOff;
}


Cycle.prototype.start = function(relay) {
	console.log("THE TIMER HAS STARTED");

	var now = new Date();
	var nextCycle = new Date(now.getTime() + this.timeOn*60000);

	console.log(now);
	console.log(nextCycle);

	var self = this;

	var cycleOn = new CronJob(nextCycle, function() {
		cycleOn.stop();
		relay.toggle();
		console.log("OFF");
	  }, function () {
	  	nextCycle = new Date(new Date().getTime() + self.timeOff*60000);
	  	cycleOff.cronTime.source = moment(nextCycle);
	    cycleOff.start();
	  },
	  false
	);

	var cycleOff = new CronJob(nextCycle, function() {
		cycleOff.stop();
		relay.toggle();
		console.log("ON");
	  }, function () {
	    nextCycle = new Date(new Date().getTime() + self.timeOn*60000);
	  	cycleOn.cronTime.source = moment(nextCycle);
	    cycleOn.start();
	  },
	  false
	);
	cycleOn.start();
}

module.exports = Cycle;