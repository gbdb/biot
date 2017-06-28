var DBClient = require('./DB.js');

DBClient.connect(function(data) {
	DBClient = data;
});

var AlertsDAO = function() {};

AlertsDAO.prototype.fetchAll = function(cb) {
	var alerts = DBClient.collection('alerts');
	alerts.find().toArray(function(err, doc) {
		cb(doc);
	});
}

AlertsDAO.prototype.insertInterval = function(message) {
	DBClient.collection("alerts").insert({message:message});
}

module.exports = AlertsDAO;