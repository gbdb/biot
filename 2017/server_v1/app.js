var five = require("johnny-five");
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var SensorDAO = require('./DAO/SensorDAO.js');
var CycleDAO = require('./DAO/CycleDAO.js');
var RelayDAO = require('./DAO/RelayDAO.js');

var relaysDAO = new RelayDAO();
var cyclesDAO = new CycleDAO();
var sensorsDAO = new SensorDAO();

var relays = {};

app.get('/', function(req, res) {});

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
board.on("ready", function() {

  initRelays(five);
});

//to change
function initRelays(five) {
  relaysDAO.fetchAll(function(data){
    data.forEach(function(item){
      relays[item._id] = new five.Relay(item.pin);
    });
  });
};

http.listen(port, function() {
  console.log("J'ecoute sur:" + port);
});