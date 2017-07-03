var express = require('express');
var router = require('express').Router();
var bodyParser = require('body-parser');

var CycleManager = require("../CycleManager.js");

var RelayDAO = require('../DAO/RelayDAO.js');
var relaysDAO = new RelayDAO();

router.use(bodyParser.json());

/*router.get('/action/stop/:id', function(req, res, next) {
	console.log("PARMAS " + req.params);
	CycleManager.get(0).stop();
	res.send("nigga");
});*/

router.get('/action/start/:id', function(req, res, next) {
	CycleManager.get(0).start();
	res.send("nigga");
});

router.put('/action/stop/:id', function(req,res,next) {
	
	console.log(req.body);
});

router.put('/action/reset/:id', function(req,res,next){

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

module.exports = router;