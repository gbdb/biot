var five = require("johnny-five");
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/Jardin';
var db;

MongoClient.connect(url, function(err, ourBD) {
  console.log("connected");
  db = ourBD;
});

var fetchAllRelays = function(cb) {
   var relays = db.collection('relays');
   relays.find().toArray(function(err,doc) {
   	cb(doc);
    });
};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('event', function(msg){
    console.log(msg);

    switch(msg.type){
    	case "TOGGLE_PUMP":
    		fetchAllRelays(function(data) {
    			console.log(data);
    		});
    		var relay = relays[msg.args.id];
    		if(relay != undefined)
    			relay.toggle();
    }

  });
});

http.listen(port, function(){
  console.log("J'ecoute sur:" + port);
});


var board = new five.Board();

relays = {};
board.on("ready", function() {
  var relay = new five.Relay(2);

  relays = {"Relay-7":new five.Relay(2), "Relay-8":new five.Relay(3)};
  this.repl.inject({
    relay: relay,
    relays: relays
  });

});