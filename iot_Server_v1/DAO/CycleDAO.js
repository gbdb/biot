var DBClient = require('./DB.js');

DBClient.connect(function(data) {
	DBClient = data;
});

var CycleDAO = function() {};

CycleDAO.prototype.fetchAll = function(cb) {
	var relays = DBClient.collection('cycles');
	relays.find().toArray(function(err, doc) {
		cb(doc);
	});
}

module.exports = CycleDAO;