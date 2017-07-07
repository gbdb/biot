var express = require('express');
var router = require('express').Router();
var bodyParser = require('body-parser');

var CycleManager = require("../CycleManager.js");

var RelayDAO = require('../DAO/RelayDAO.js');
var relaysDAO = new RelayDAO();

router.use(bodyParser.json());

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/Jardin');

var relaySchema = mongoose.Schema({
	name: String,
	pin: Number
});

var Relay = mongoose.model('relay', relaySchema);


router.get('/action/start/:id', function(req, res, next) {
	CycleManager.get(0).start();
	res.send("nigga");
});

router.put('/action/stop/:id', function(req,res,next) {
	
	console.log(req.body);
});

router.put('/action/reset/', function(req,res,next){

	var data = req.body;
	relaysDAO.findOne(data.cycle.relay_id, function(doc) {

		var selectedCycle = CycleManager.get(data.cycle.relay_id);

		selectedCycle.stop();

		console.log(data);

		CycleManager.putCycle(data.cycle);

		var newCycle = CycleManager.get(data.cycle.relay_id);

		newCycle.start();

		res.json({message:"Perfecto!"});
	
	})
});

router.post('/action/toggle/', function(req,res,next){
	console.log("hey");
	console.log(req.params);
	console.log(req.body);
	res.send("ok");
});

module.exports = router;