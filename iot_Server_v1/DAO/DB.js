var MongoClient = require('mongodb').MongoClient
var url = 'mongodb://localhost:27017/Jardin';
var lol = require("./test.js")
var db = function() {};

db.prototype.connect = function(cb) {
	MongoClient.connect(url, function(err, db) {
		cb(db);
	});
}

module.exports = new db();