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

CycleDAO.prototype.findOne = function(id,cb) {
	DBClient.collection("cycles").findOne({_id:id}, function(err,doc) {
		if(err)
			console.log(err);
		else{
			cb(doc);
		}
	});
}

CycleDAO.prototype.insertInterval = function(interval,cb) {
	DBClient.collection("cycles").insert({name:interval.name, on:interval.on, off:interval.off}, function(err,result) {
		cb(result.insertedIds[0]);
	});
}

module.exports = CycleDAO;