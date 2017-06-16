var five = require("johnny-five");
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var SensorDAO = require('./DAO/SensorDAO.js');
var CycleDAO = require('./DAO/CycleDAO.js');
var RelayDAO = require('./DAO/RelayDAO.js');

var relays = new SensorDAO();
var cycles = new CycleDAO();
var sensors = new SensorDAO();

app.get('/', function(req, res) {
  console.log("NEG SENTI");
});

app.use('/', require('./API'));

io.on('connection', function(socket) {
  socket.on('event', function(event) {
    console.log(event);

    switch (event.type) {
      case "TOGGLE_PUMP":

        
        var relay = relays[event.args.id];
        if (relay != undefined)
          relay.toggle();
    }
  });
});

var board = new five.Board();
//relays = {};
board.on("ready", function() {
  var relay = new five.Relay(2);
  //relays = {"Relay-7":new five.Relay(2), "Relay-8":new five.Relay(3)};
  this.repl.inject({
    relay: relay,
    relays: relays
  });
});

http.listen(port, function() {
  console.log("J'ecoute sur:" + port);
});