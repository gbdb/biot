var DBClient = require('./DB.js');

DBClient.connect(function(data) {
	DBClient = data;
});

var RelayDAO = function() {};

RelayDAO.prototype.fetchAll = function(cb) {
	var relays = DBClient.collection('relays');
	relays.find().toArray(function(err, doc) {
		cb(doc);
	});
}

module.exports = RelayDAO;