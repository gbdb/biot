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

var time_off = 0;
var time_on = 0;

clientSocket = "";

io.on('connection', function(socket) {
  clientSocket = socket;
  console.log("User connected");
  socket.on('event', function(event) {
    switch (event.type) {
      case "TOGGLE_PUMP":
        console.log(event);
        var relay = relays[event.args.id];
        if (relay != undefined)
          relay.toggle();
    }
  });
});

var board = new five.Board();
var config = { cycleDelay:0, nextDeviceDelay:2000 };
var onewiretemps = new owts.obj(board, 9, {cycleDelay:100});

board.on("ready", function() {
    initRelays(five);


    //---------------------WATER LEVEL---------------------
    var bottom = 10;
    var middle = 11;
    var top = 12;
    this.pinMode(bottom, five.Pin.INPUT);
    this.pinMode(middle, five.Pin.INPUT);
    this.pinMode(top, five.Pin.INPUT);

/*
    this.digitalRead(bottom, function(value) {
      console.log("BOTTOM: " + value);

      if(value == 0)
        io.emit("event","On est dans marde en tabarnak!!! Niveau d'eau super bas");
    });*/

  
    //////////////////////////////////////////////////
    this.digitalRead(middle, function(value) {
      console.log("MIDDLE: " + value);

      if(value == 0)
        io.emit("event", {message:"Attention! Le niveau d'eau est à moins de 50%!"})
    });

    this.digitalRead(top, function(value) {
      console.log("TOP: " + value);

      if(value == 0)
        io.emit("event", {message:"Attention! Le niveau d'eau est à moins de 50%!"})
    });
    ///////////////////////////////////////////////////

    this.repl.inject({
      io:io
    });
});

setInterval(onewiretemps.getTemperatures,20000, owts.unit_celcius, function(temps, lastUpdates){
    console.log(temps);

    var temperatures = { "temp1" :round(temps[0]), "temp2": round(temps[1]) };
    if(temps != undefined)
      io.emit("newTemp", temperatures);
});

function round(number) {
    return Math.round(number * 100) / 100;
}

//to change
function initRelays(five) {
  relaysDAO.fetchAll(function(data){
    data.forEach(function(item){
      relays[item._id] = new five.Relay(item.pin);
    });
  });
};

function start() {
  Object.keys(relays)[0].off();
  onInterval();
}

function offInterval() {
  Object.keys(relays)[0].toggle();
  setInterval(onInterval, 5000);
}

function onInterval() {
  Object.keys(relays)[0].toggle();
  setInterval(offInterval, 3000);
}

http.listen(port, function() {
  console.log("J'ecoute sur:" + port);
});