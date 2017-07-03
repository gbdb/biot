var express = require('express');
var router = require('express').Router();
var bodyParser = require('body-parser');

var SensorDAO = require('../DAO/SensorDAO.js');
var CycleDAO = require('../DAO/CycleDAO.js');
var RelayDAO = require('../DAO/RelayDAO.js');
var AlertsDAO = require('../DAO/AlertsDAO.js');

var relays = new RelayDAO();
var cycles = new CycleDAO();
var sensors = new SensorDAO();
var alerts = new AlertsDAO();

router.use(bodyParser.json());

router.get('/API/sensors', function(req, res, next) {
	sensors.fetchAll(function(data) {
		res.json(data);
	});
});

router.get('/API/relays', function(req, res, next) {
	console.log("fetching some relays");
	relays.fetchAll(function(data) {
		res.json(data);
	});
});

router.get('/API/cycles', function(req, res, next) {
	cycles.fetchAll(function(data) {
		res.json(data);
	});
});

router.get('/API/alerts', function(req, res, next) {
	alerts.fetchAll(function(data) {
		res.json(data);
	});
});

router.put('/API/cycles/', function(req, res, next) {
	var cycle = req.body;
	//console.log(cycle);
	//console.log(cycle.relay_id);
	cycles.insertInterval(cycle, function(cycleId) {
		if(cycle.relay_id != undefined){
			relays.updateOne(cycle.relay_id,{currentCycle_id:cycleId});
			
		}
		res.json({message:"Perfecto!"});
		console.log("CYCLE SAVED");
		console.log("------------");
	});
});

module.exports = router;