var DBClient = require('./DB.js');

DBClient.connect(function(data) {
	DBClient = data;
});

var ObjectID = require('mongodb').ObjectID;

var RelayDAO = function() {};

RelayDAO.prototype.fetchAll = function(cb) {
	var relays = DBClient.collection('relays');
	relays.find().toArray(function(err, doc) {
		cb(doc);
	});
}

RelayDAO.prototype.updateOne = function(id,status) {
	DBClient.collection('relays').updateOne({_id:new ObjectID(id)},{ $set: {status:status}}, function(err, res) {
    	if (err) throw err;
    	console.log("1 record updated");
  });
}
module.exports = RelayDAO;