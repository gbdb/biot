
var SensorDAO = function () {};
var MongoClient = require('mongodb').MongoClient
var url = 'mongodb://localhost:27017/Jardin';
var db;

MongoClient.connect(url, function(err, ourBD) {
  console.log("connected");
  db = ourBD;
});

SensorDAO.prototype.log = function () {
    console.log('doo!');
}

SensorDAO.prototype.fetchAllRelays = function(cb) {
   var relays = db.collection('relays');
   relays.find().toArray(function(err,doc) {
   	cb(doc);
    });
}

module.exports = SensorDAO;