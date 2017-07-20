const fs = require('fs');

var logger = function() {}

logger.prototype.log = function(message) {
	fs.appendFile('./logging/log.txt', message + "\n", function (err) {
  	if (err) throw err;
  		console.log('Saved!');
	});
}

module.exports = new logger();