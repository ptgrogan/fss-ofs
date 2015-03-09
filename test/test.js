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

requirejs(['mas','fss-ofs','game'], function(mas,fss,Game) {
	var game = new Game();
	var context = game.buildContext(0);
	var sim = new mas.sim.Simulator({
		entities: [context],
		initTime: 0,
		timeStep: 1,
		maxTime: 5
	});
	sim.init();
	
	console.log(context.locations);
	
	console.log(context.federations[0].federates[0]);
	
	var gs = new fss.GroundStation({name: "X", cost: 500, maxSize: 4});
	var sc = new fss.Spacecraft({name: "A", cost: 200, maxSize: 2});
	context.federations[0].federates[0].design(gs);
	var b = context.federations[0].federates[0].commission(gs, 
			context.locations[0], context);

	console.log(context.federations[0].federates[0]);
	
	context.federations[0].federates[0].design(sc);
	context.federations[0].federates[0].commission(sc, 
			context.locations[1], context);
			
	console.log(context.federations[0].federates[0]);
	
	sim.advance();
	
	console.log(context.federations[0].federates[0]);
});