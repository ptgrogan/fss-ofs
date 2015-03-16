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
    
    var game = new Game({
        numTurns: (argv.d&&_.isNumber(argv.d))?argv.d:24,
        initialCash: (argv.i&&_.isNumber(argv.i))?argv.i:1200
    });
    var context = game.buildContext((argv.s&&_.isNumber(argv.s))?argv.s:0);
    
    var sim = new mas.sim.Simulator({
        entities: [context],
        initTime: 0,
        timeStep: 1,
        maxTime: game.numTurns
    });
    
    sim.on("init", function() {
        var federate = context.federations[0].federates[0];
        
        _.each(argv._, function(design) {
            var specs = design.split(",");
            if(specs.length > 0 && specs[0].split("@").length === 2) {
                var systemType = specs[0].split("@")[0];
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
                    federate.design(system);
                    
                    federate.commission(system, location, context);
                }
            }
        });
    });
    
    sim.on("init advance", function(time) {
        logger.verbose('Start Turn ' + time);
        
        _.each(context.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                federate.autoDecommission(context);
                federate.autoContractAndSense(context);
                federate.autoDownlink(context);
                federate.autoContractAndSense(context);
                logger.verbose(federate.id + ' cash: ' + federate.cash);
            });
        });
        logger.verbose('End Turn ' + time);
    });
    
    sim.on("complete", function() {
        _.each(context.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                federate.liquidate(context);
                _.each(federate.contracts, function(contract) {
                    federate.defaultContract(contract, context);
                }, this);
                logger.info(federate.id + ' final cash: ' + federate.cash);
                logger.info(federate.id + ' ROI: ' + (federate.cash/federate.initialCash));
            }, this);
        }, this);
        console.log(context.federations[0].federates[0].cash);
    });
    
    sim.execute();
});