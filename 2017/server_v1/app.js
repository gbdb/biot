var five = require("johnny-five"), board;
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var SensorDAO = require('./DAO/SensorDAO.js');
var CycleDAO = require('./DAO/CycleDAO.js');
var RelayDAO = require('./DAO/RelayDAO.js');
var AlertsDAO = require('./DAO/AlertsDAO.js')
var owts = require('one-wire-temps');
var admin = require("firebase-admin");

var serviceAccount = require("./jardiniot-firebase-adminsdk-p1ya9-cf6f3bf45b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://jardiniot.firebaseio.com"
});

var relaysDAO = new RelayDAO();
var cyclesDAO = new CycleDAO();
var sensorsDAO = new SensorDAO();

var relays = {};

app.get('/', function(req, res) {});

app.use('/', require('./API'));

var time_off = 5000;
var time_on = 3000;
clientSocket = "";

var payload = {
  data: {
    message: "Jardin prêt"
  }
};

function notifySysReady() {

  admin.messaging().sendToTopic("events", payload)
  .then(function(response) {
    // See the MessagingTopicResponse reference documentation for the
    // contents of response.
    console.log("Successfully sent message:", response);
  })
  .catch(function(error) {
    console.log("Error sending message:", error);
});
}

notifySysReady();



io.on('connection', function(socket) {
  clientSocket = socket;
  console.log("Android User connected");
  socket.on('event', function(event) {
    switch (event.type) {
      case "TOGGLE_PUMP":
        console.log(event);
        var relay = relays[event.args.id];
        if (relay != undefined)
          relay.toggle();
        break;
      case "NEW_INTERVAL":
        time_off = event.args.tempsOff * 60 * 1000;
        time_on = event.args.tempsOn * 60 * 1000;
        console.log(time_off + " " + time_on);
        //cyclesDAO.insertInterval(time_off,time_on);
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
      start();
    });

    notifySysReady();
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

      if(value == 1)
        io.emit("event","On est dans marde en tabarnak!!! Niveau d'eau super bas");
    });*/

  
    //////////////////////////////////////////////////
    this.digitalRead(middle, function(value) {
      console.log("MIDDLE: " + value);

      //if(value == 1)
        //io.emit("event", {message:"Attention! Le niveau d'eau est à moins de 50%!"})
    });

    this.digitalRead(top, function(value) {
      console.log("TOP: " + value);

      //if(value == 1)
        //io.emit("event", {message:"Attention! Le niveau d'eau est à moins de 50%!"})
    });
    ///////////////////////////////////////////////////

    this.repl.inject({
      io:io
    });
});

setInterval(onewiretemps.getTemperatures,2000000, owts.unit_celcius, function(temps, lastUpdates){
    console.log(temps);

    var temperatures = { "temp1" :round(temps[0]), "temp2": round(temps[1]) };
    if(temps != undefined)
      io.emit("newTemp", temperatures);
});

function round(number) {
    return Math.round(number * 100) / 100;
}

//to change
function initRelays(five,cb) {
  relaysDAO.fetchAll(function(data){
    data.forEach(function(item){
      relays[item._id] = new five.Relay(item.pin);
    });
    cb();
  });
};

function start() {
  var relay = relays[Object.keys(relays)[0]];
  onInterval(relay);
}

function offInterval(relay) {
  io.emit("event", {message:"OFF"});
  relay.toggle();
  setTimeout(function() {
    onInterval(relay);
  }, time_off);
  
}

function onInterval(relay) {
  //io.emit("event", {message:"ON"});
  relay.toggle();
  setTimeout(function() {
    offInterval(relay);
  }, time_on);
  console.log("ON");
}

http.listen(port, function() {
  console.log("J'ecoute sur:" + port);
});