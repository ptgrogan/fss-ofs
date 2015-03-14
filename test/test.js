/*
 * Copyright 2015 Paul T. Grogan
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var requirejs = require('requirejs');

requirejs.config({
  baseUrl: '../lib',
  nodeRequire: require
});

requirejs(['underscore','mas','fss-ofs','game'], function(_,mas,fss,Game) {
	var game = new Game();
	var context = game.buildContext(0);
	var sim = new mas.sim.Simulator({
		entities: [context],
		initTime: 0,
		timeStep: 1,
		maxTime: 24
	});
	
	sim.on("init", function() {
		var gs = new fss.GroundStation(_.findWhere(game.systemTypes, {type: "Ground Station"}));
		gs.subsystems.push(new fss.SpaceGroundLink(_.findWhere(game.subsystemTypes, {type: "SGL(p)"})));
		
		var federate = context.federations[0].federates[0];
		
		federate.design(gs);
		federate.commission(gs, context.locations[0], context);
		
		var sc = new fss.Spacecraft(_.findWhere(game.systemTypes, {type: "Small Sat"}));
		sc.subsystems.push(new fss.Sensor(_.findWhere(game.subsystemTypes, {type: "SAR"})));
		sc.subsystems.push(new fss.SpaceGroundLink(_.findWhere(game.subsystemTypes, {type: "SGL(p)"})));
		
		federate.design(sc);
		federate.commission(sc, context.locations[1], context);
	});
	
	sim.on("init advance", function(time) {
		console.log('Start Turn ' + time);
		
		_.each(context.federations, function(federation) {
			_.each(federation.federates, function(federate) {
				console.log(federate.id + ' cash: ' + federate.cash);
				federate.autoDecommission(context);
				federate.autoContractAndSense(context);
				federate.autoDownlink(context);
				federate.autoContractAndSense(context);
			});
		});
		console.log('End Turn ' + time);
	});
	
	sim.on("complete", function() {
		_.each(context.federations, function(federation) {
			_.each(federation.federates, function(federate) {
				federate.liquidate(context);
				_.each(federate.contracts, function(contract) {
					federate.defaultContract(contract, context);
				}, this);
				console.log(federate.id + ' cash: ' + federate.cash);
			}, this);
		}, this);
	});
	
	sim.execute();
});