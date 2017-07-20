const CronJob = require('cron').CronJob;
const moment = require('moment');
const logger = require('./logging/logger.js');
const timeFormat = 'MMMM Do YYYY, h:mm:ss a';

var Cycle = function(timeOn, timeOff, name){

	this.isActive = true;
	this.name = name;
	this.timeOn = timeOn;
	this.timeOff = timeOff;
	this.isOn = true;
	
	var self = this;

	this.cron = new CronJob(new Date(), function() {
		self.cron.stop();
	}, function(){
		if(self.isActive) {
			self.nextState();
			self.cron.start();
		}
	});

	this.nextState = function() {
		self.isOn =! self.isOn;
		var nextStateInterval = self.isOn ? self.timeOn : self.timeOff;
		var nextStateTime = moment().add(nextStateInterval, "seconds");
		console.log("GOING:" + self.isOn + " " + nextStateTime.format(timeFormat));
		self.cron.cronTime.source = nextStateTime;
	}
}

Cycle.prototype.start = function() {
	console.log(this.name + " HAS STARTED");
	this.isActive = true;
	var cycle = moment();
	cycle.add(this.timeOn, "seconds");
	this.cron.cronTime.source = cycle;
	this.cron.start();
	console.log(this.isOn);
}

Cycle.prototype.stop = function() {
	console.log(this.name + " HAS STOPPED");
	this.isActive = false;
	this.cron.stop();
}

module.exports = Cycle;