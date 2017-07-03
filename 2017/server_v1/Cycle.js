var CronJob = require('cron').CronJob;
var moment = require('moment');

var Cycle = function(timeOn, timeOff){

	this.timeOn = timeOn;
	this.timeOff = timeOff;

	var now = new Date();
	this.nextCycle = new Date(now.getTime() + this.timeOn*60000);

	//console.log(now);
	//console.log(this.nextCycle);

	var self = this;

	this.isContinue = true;

	this.cycleOn = new CronJob(this.nextCycle, function() {
		self.cycleOn.stop();
		//relay.toggle();
		//console.log(self.nextCycle);
		console.log("OFF");
		console.log(new Date(new Date().getTime()));
	  }, function () {
	  	self.nextCycle = new Date(new Date().getTime() + self.timeOff*60000);
	  	//console.log(self.nextCycle);
	  	self.cycleOff.cronTime.source = moment(self.nextCycle);
	  	if(self.isContinue)
	    	self.cycleOff.start();
	  },
	  false
	);

	this.cycleOff = new CronJob(this.nextCycle, function() {
		self.cycleOff.stop();
		//relay.toggle();
		console.log("ON");
		console.log(new Date(new Date().getTime()));
	  }, function () {
	    self.nextCycle = new Date(new Date().getTime() + self.timeOn*60000);
	  	self.cycleOn.cronTime.source = moment(self.nextCycle);
	  	if(self.isContinue)
	    	self.cycleOn.start();
	  },
	  false
	);
}

Cycle.prototype.start = function(/*relay*/) {
	console.log("THE TIMER HAS STARTED");
	this.isContinue = true;
	var now = new Date();
	this.nextCycle = new Date(now.getTime() + this.timeOn*60000);
	this.cycleOn.start();
}

Cycle.prototype.stop = function() {
	console.log("THE TIMER HAS STOPPED");
	this.isContinue = false;
	this.cycleOn.stop();
	this.cycleOff.stop();
}

module.exports = Cycle;