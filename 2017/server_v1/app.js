var five = require("johnny-five"), board;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var SensorDAO = require('./DAO/SensorDAO.js');
var CycleDAO = require('./DAO/CycleDAO.js');
var RelayDAO = require('./DAO/RelayDAO.js');
var AlertsDAO = require('./DAO/AlertsDAO.js')
var owts = require('one-wire-temps');
var Cycle = require("./Cycle.js");
var relaysDAO = new RelayDAO();
var cyclesDAO = new CycleDAO();
var sensorsDAO = new SensorDAO();

var CycleManager = require("./CycleManager.js");

var notification = require('./notifications.js');

//notification.send("jte casse les dents");


var relays = {};


//var cycles = [];


app.get('/', function(req, res) {res.send("home")});
app.use('/', require('./API/index'));
app.use('/', require('./API/action'));

io.on('connection', function(socket) {
  console.log("Android User connected");
  initRelays();
  socket.on('event', function(event) {
    console.log("yo");
    switch (event.type) {
      case "TOGGLE_PUMP":
        //console.log(event);
        //Cycle1.stop();
        //CycleManager.printAll();
        console.log(event);
        relaysDAO.updateOne(event.args.id, {status:event.args.status} );
        var relay = relays[event.args.id];
        if (relay != undefined){
          relay.toggle();
          //relaysDAO.updateOne(event.args.id, relay.isOn);
        }
        break;
    }
  });
  socket.on('disconnect', function() {
    console.log("Android User disconnected");
  });
});

var board = new five.Board();
var config = { cycleDelay:0, nextDeviceDelay:2000 };
var onewiretemps = new owts.obj(board, 9, {cycleDelay:100});

board.on("ready", function() {


    initRelays(five, function() {
      Cycle1.start(relays["595524c051a6a6683f6d5619"]);
    });

    
    //---------------------WATER LEVEL---------------------
    var bottom = 10;
    var middle = 11;
    var top = 12;
    this.pinMode(bottom, five.Pin.INPUT);
    this.pinMode(middle, five.Pin.INPUT);
    this.pinMode(top, five.Pin.INPUT);

    var bottomWater = true;
    var middleWater = true;
    var topWater = true;

    this.loop(500, function() {
      /*
      if(!bottomWater)
        sendNotification("TABARNAK, PU D'EAU, LA POMPE VA BRISER!");
      else if(!middleWater)
        sendNotification("Moins que la moitié de l'eau!!");
      else if(!bottomWater)
        sendNotification("On ferme la pompe!");
      */
    });

    this.digitalRead(bottom, function(value) {
      console.log("BOTTOM: " + value);
      if(value == 0)
        bottomWater = true;
      else
        bottomWater = false;

    });

    this.digitalRead(middle, function(value) {
      console.log("MIDDLE: " + value);

      if(value == 0)
        middleWater = true;
      else
        middleWater = false;
    });

    this.digitalRead(top, function(value) {
      console.log("TOP: " + value);

      if(value == 0)
        topWater = true;
      else
        topWater = false;

    });

    this.repl.inject({
      io:io
    });
});

setInterval(onewiretemps.getTemperatures,5000000, owts.unit_celcius, function(temps, lastUpdates){
    console.log(temps);

    var temperatures = { "temp1" :round(temps[0]), "temp2": round(temps[1]) };
    if(temps != undefined)
      io.emit("newTemp", temperatures);
});

function round(number) {
    return Math.round(number * 100) / 100;
}

//to change
function initRelays(/*five,*/cb) {
  relaysDAO.fetchAll(function(data){
    data.forEach(function(item){

      //relays[item._id] = new five.Relay(item.pin);
        //var j5_relay = relays[item._id];
        if(item.currentCycle != undefined){
          var cycle = CycleManager.init(item.currentCycle);
          cycle.start()
          
          //cycle.start(relays[item._id])
        }
        
      });
      //relays[item._id] = new five.Relay(item.pin);

    });
    //cb();
};

http.listen(port, function() {
  console.log("J'ecoute sur:" + port);
});