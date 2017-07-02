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

/*router.get('/API/cycles', function(req, res, next) {
	relays.fetchAll(function(data) {
		res.json(data);
	});
});*/

router.get('/API/alerts', function(req, res, next) {
	alerts.fetchAll(function(data) {
		res.json(data);
	});
});

router.put('/API/cycles/:id', function(req, res, next) {
	console.log(req.params);
	console.log(req.body);
	var cycle = req.body;
	cycles.insertInterval(cycle);
	res.json({message:"Perfecto!"});
});

//todo: CREATE/UPDATE/DELETE routes with user defined params

module.exports = router;