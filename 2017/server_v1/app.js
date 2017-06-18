var five = require("johnny-five"), board;
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var SensorDAO = require('./DAO/SensorDAO.js');
var CycleDAO = require('./DAO/CycleDAO.js');
var RelayDAO = require('./DAO/RelayDAO.js');
var owts = require('one-wire-temps');

var relaysDAO = new RelayDAO();
var cyclesDAO = new CycleDAO();
var sensorsDAO = new SensorDAO();

var relays = {};

app.get('/', function(req, res) {});

app.use('/', require('./API'));

clientSocket = "";

io.on('connection', function(socket) {
  clientSocket = socket;
  console.log("nigga has connected");
  socket.on('event', function(event) {
    switch (event.type) {
      case "TOGGLE_PUMP":
        var relay = relays[event.args.id];
        if (relay != undefined)
          relay.toggle();
    }
  });
  socket.on("test", function(data){
    console.log("test");
  });
});

var board = new five.Board();
var config = { cycleDelay:0, nextDeviceDelay:5000 };
var onewiretemps = new owts.obj(board, 2, {cycleDelay:100});

board.on("ready", function() {

  initRelays(five);

  /*
  var temperature = new five.Thermometer({
    controller: "DS18B20",
    pin: "2"
  });


  temperature.once("data", function() {
    console.log('Address', this.address);
    console.log(this.celsius);
  });

  temperature.on("change", function() {
    console.log(this.celsius + "°C");
    // console.log("0x" + this.address.toString(16));
  });*/

});

setInterval(onewiretemps.getTemperatures,5000, owts.unit_celcius, function(temps, lastUpdates){
    console.log(temps);
    var temperatures = { "temp1" :temps[0], "temp2": temps[1]};
    if(temps != undefined)
      io.emit("newTemp", temperatures);
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
