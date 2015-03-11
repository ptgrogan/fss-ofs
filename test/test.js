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
		maxTime: 5
	});
	sim.init();
	
	/*
	var gs = new fss.GroundStation({
		id: "X", 
		cost: 500, 
		maxSize: 4, 
		subsystems: []
	});
	var sc = new fss.Spacecraft({
		id: "A", 
		cost: 200, 
		maxSize: 2, 
		subsystems: []
	});
	*/
	
	
	sim.on("init", function() {
		var gs = new fss.GroundStation(_.findWhere(game.systemTypes, {type: "Ground Station"}));
		gs.subsystems.push(new fss.Subsystem(_.findWhere(game.subsystemTypes, {type: "SGL(p)"})));
		
		var federate = context.federations[0].federates[0];
		
		federate.design(gs);
		federate.commission(gs, context.locations[0], context);
		
		var sc = new fss.Spacecraft(_.findWhere(game.systemTypes, {type: "Small Sat"}));
		sc.subsystems.push(new fss.Subsystem(_.findWhere(game.subsystemTypes, {type: "SAR"})));
		sc.subsystems.push(new fss.Subsystem(_.findWhere(game.subsystemTypes, {type: "SGL(p)"})));
		
		federate.design(sc);
		federate.commission(sc, context.locations[1], context);
	});
	
	sim.on("advance", function(time) {
		console.log('Turn ' + time);
		console.log('Cash ' + context.federations[0].federates[0].cash);
		
		var federate = context.federations[0].federates[0];
		var event = _.findWhere(context.currentEvents, {sector: _.findWhere(context.locations, {id: federate.systems[1].location}).sector});
		
		console.log(event);

		if(federate.systems[1].canSense(event, context)) {
			if(contract = federate.contract(event, context)) {
				federate.sense(contract, federate.systems[1], context);
			}
		}
		console.log(federate.systems[1].subsystems[0].contents);
	});
	
	sim.on("complete", function() {
		context.federations[0].federates[0].liquidate(context);
		console.log(context.federations[0].federates[0]);
	});
	
	sim.execute();
});