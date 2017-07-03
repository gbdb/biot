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

RelayDAO.prototype.findOne = function(id,cb) {
	console.log("RELAY ID: " + id);
	var object = new ObjectID(id);
	console.log(object);
	DBClient.collection('relays').findOne({_id:object}, function(err,doc) {
		if(err)
			console.log(err);
		else{
			cb(doc);
		}
	});
}

RelayDAO.prototype.updateOne = function(id,values) {
	DBClient.collection('relays').updateOne({_id:new ObjectID(id)},{ $set: values }, function(err, res) {
    	if (err) throw err;
    	console.log("1 record updated");
  });
}
module.exports = RelayDAO;