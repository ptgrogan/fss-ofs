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

requirejs(['underscore','logger','mas','fss-ofs','game'], function(_,logger,mas,fss,Game) {
    var argv = require('minimist')(process.argv.slice(2));
    
    // define the game and build the context
    var game = new Game({
        numTurns: _.isNumber(argv.d)?argv.d:24,
        numPlayers: _.isNumber(argv.p)?argv.p:1,
        initialCash: _.isNumber(argv.i)?argv.i:1200
    });
    var context = game.buildContext(
            (argv.s&&_.isNumber(argv.s))?argv.s:0,
            argv.o==='d'?'dynamic':(argv.o==='n'?'none':'simple'),
			argv.f==='d'?'dynamic':'none');
    
    // define the simulator
    var sim = new mas.sim.Simulator({
        entities: [context],
        initTime: 0,
        timeStep: 1,
        maxTime: game.numTurns
    });
    
    // define callback to initialize game
    sim.on("init", function() {
		var designSets = [];
		_.each(context.federations[0].federates, function(federate, index) {
			designSets[index] = [];
		});
		
        _.each(argv._, function(design) {
            var specs = design.split(",");
            if(specs.length > 0 && specs[0].split("@").length === 2) {
                var systemType;
				var fedInd = 0;
                if(specs[0].split("@")[0].split(".").length === 2) {
                    // determine player ownership
                    var fedInd = parseInt(specs[0].split("@")[0].split(".")[0],10)-1;
                    systemType = specs[0].split("@")[0].split(".")[1];
                } else {
                    // default to player 1 ownership
                    systemType = specs[0].split("@")[0];
                }
                var location = _.find(context.locations, {id: specs[0].split("@")[1]});
                
                var system;
                if(def = _.findWhere(game.stationTypes, {type: systemType})) {
                    system = new fss.GroundStation(def);
                } else if(def = _.findWhere(game.spacecraftTypes, {type: systemType})) {
                    system = new fss.Spacecraft(def);
                }
                
                if(system && location) {
                    var subsystems = [];
                    _.each(specs, function(subsystemType, index) {
                        if(index > 0) {
                            var subsystem;
                            if(def = _.findWhere(game.sglTypes, {type: subsystemType})) {
                                subsystem = new fss.SpaceGroundLink(def);
                            } else if(def = _.findWhere(game.islTypes, {type: subsystemType})) {
                                subsystem = new fss.InterSatelliteLink(def);
                            } else if(def = _.findWhere(game.sensorTypes, {type: subsystemType})) {
                                subsystem = new fss.Sensor(def);
                            } else if(def = _.findWhere(game.storageTypes, {type: subsystemType})) {
                                subsystem = new fss.Storage(def);
                            } else if(def = _.findWhere(game.defenseTypes, {type: subsystemType})) {
                                subsystem = new fss.Defense(def);
                            }
                            if(subsystem) {
                                system.subsystems.push(subsystem);
                            }
                        }
                    });
                }
				designSets[fedInd].push({system: system, location: location});
            }
        });
		_.each(designSets, function(designSet, index) {
			var federate = context.federations[0].federates[index];
			if(federate.initialCash===0) {
				// special case if 0 initial cash: grant enough for initial design
				federate.initialCash = _.reduce(designSet, function(memo, design){
					return memo + design.system.getDesignCost() 
							+ design.system.getCommissionCost(design.location);
				}, 0);
				federate.cash = federate.initialCash;
			}
			
			_.each(designSet, function(design) {
				federate.design(design.system);
				federate.commission(design.system, design.location, context);
			});
		});
    });
    
    // define callback to conclude game
    sim.on("complete", function() {
        _.each(context.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                federate.liquidate(context);
                while(federate.contracts.length > 0) {
                    federate.defaultContract(federate.contracts[0], context);
                }
                logger.info(federate.id + ' final cash: ' + federate.cash);
                logger.info(federate.id + ' ROI: ' + (federate.cash/federate.initialCash));
            }, this);
            console.log(_.map(federation.federates, function(federate) { 
					// TODO replace with initial/final cash
					// return federate.cash;
					return federate.initialCash+":"+federate.cash;
			}).join());
        }, this);
    });
    
    // execute the simulation
    sim.execute();
});