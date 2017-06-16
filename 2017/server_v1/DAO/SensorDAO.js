var DBClient = require('./DB.js');

DBClient.connect(function(data) {
	DBClient = data;
});

var SensorDAO = function () {};

SensorDAO.prototype.fetchAll = function(cb) {
   var relays = DBClient.collection('sensors');
   relays.find().toArray(function(err,doc) {
   	cb(doc);
    });
}

module.exports = SensorDAO;