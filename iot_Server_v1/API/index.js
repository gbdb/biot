var express = require('express');
var router = require('express').Router();

var SensorDAO = require('../DAO/SensorDAO.js');
var CycleDAO = require('../DAO/CycleDAO.js');
var RelayDAO = require('../DAO/RelayDAO.js');

var relays = new SensorDAO();
var cycles = new CycleDAO();
var sensors = new SensorDAO();

router.get('/API/sensors', function(req, res, next) {
	sensors.fetchAll(function(data) {
		res.json(data);
	});
});

router.get('/API/relays', function(req, res, next) {
	relays.fetchAll(function(data) {
		res.json(data);
	});
});

router.get('/API/cycles', function(req, res, next) {
	relays.fetchAll(function(data) {
		res.json(data);
	});
});

//todo: CREATE/UPDATE/DELETE routes with user defined params

module.exports = router;