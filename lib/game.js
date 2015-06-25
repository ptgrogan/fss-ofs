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

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

/** 
 * A module to represent a game.
 * @module context
 */
define('game',function(require) {
    var _ = require("underscore");
    var fss = require("fss-ofs");
    
    /** 
     * @constructor
     * @alias module:game
     */
    function Game() {
        this.numSectors = 6;
        this.altitudes = ['LEO', 'MEO', 'GEO'];
        this.numPlayers = 1;
        this.initialCash = 1200;
        this.numTurns = 10;
        
        // override default attributes or methods
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
        
        // define event types
        this.eventTypes = [
            {number: 8, type: 'demand', spec: {type: "SAR1", phenomena: "SAR", size: 1, valueSchedule: [[1,500],[4,400]], defaultValue: -50}},
            {number: 12, type: 'demand', spec: {type: "SAR2", phenomena: "SAR", size: 1, valueSchedule: [[2,450],[5,350]], defaultValue: -100}},
            {number: 23, type: 'demand', spec: {type: "SAR3", phenomena: "SAR", size: 1, valueSchedule: [[3,400],[6,300]], defaultValue: -150}},
            {number: 8, type: 'demand', spec: {type: "VIS1", phenomena: "VIS", size: 1, valueSchedule: [[1,600],[4,500]], defaultValue: -50}},
            {number: 17, type: 'demand', spec: {type: "VIS2", phenomena: "VIS", size: 1, valueSchedule: [[2,500],[5,400]], defaultValue: -100}},
            {number: 8, type: 'demand', spec: {type: "VIS3", phenomena: "VIS", size: 1, valueSchedule: [[3,450],[6,350]], defaultValue: -150}},
            {number: 5, type: 'disturb', spec: {type: "Debris", hitChance: 1/6, maxHits: 1}}
        ];
        
        // define spacecraft types
        this.spacecraftTypes = [
            {type: "SmallSat", cost: 200, maxSize: 2},
            {type: "MediumSat", cost: 300, maxSize: 4},
            {type: "LargeSat", cost: 400, maxSize: 6}
        ];
        // define ground stations
        this.stationTypes = [{type: "GroundSta", cost: 500, maxSize: 4}];
        // define SGL subsystems
        this.sglTypes = [
            {type: "pSGL", protocol: "pSGL", cost: 50, size: 1, maxTransmitted: 1, maxReceived: 1},
            {type: "oSGL", protocol: "oSGL", cost: 100, size: 1, maxTransmitted: 1, maxReceived: 1}
        ];
        // define ISL subsystems
        this.islTypes = [
            {type: "pISL", protocol: "pISL", cost: 50, size: 1, maxTransmitted: 1, maxReceived: 1},
            {type: "oISL", protocol: "oISL", cost: 100, size: 1, maxTransmitted: 1, maxReceived: 1}
        ];
        // define sensor subsystems
        this.sensorTypes = [
            {type: "SAR", phenomena: "SAR", cost: 200, size: 1, capacity: 1, maxSensed: 1},
            {type: "VIS", phenomena: "VIS", cost: 250, size: 1, capacity: 1, maxSensed: 1}
        ];
        // define storage subsystems
        this.storageTypes = [
            {type: "DAT", cost: 50, size: 1, capacity: 1}
        ];
        // define defense subsystems
        this.defenseTypes = [
            {type: "DEF", cost: 100, size: 1},
        ];
    };
    
    /**
     * Builds the context for this game.
     * @param {Number} seed - The seed for the random number stream.
     * @param {String} ops - The federate operations model.
     * @param {String} fops - The federation operations model.
     * @returns {object} The context.
     */
    Game.prototype.buildContext = function(seed, ops, fops) {
        // define locations for each sector
        var locations = [];
        for(var i = 0; i < this.numSectors; i++) {
            locations.push(new fss.Surface({
                id: "SUR"+(i+1), 
                sector: i+1
            }));
            _.each(this.altitudes, function(altitude) {
                locations.push(new fss.Orbit({
                    id: altitude+(i+1), 
                    altitude: altitude, 
                    sector: i+1
                }));
            });
        }
        // define the array of events
        var events = [];
        _.each(this.eventTypes, function(eventType) {
            for(var i = 0; i < eventType.number; i++) {
                if(eventType.type==='disturb') {
                    events.push(new fss.Disturbance(eventType.spec));
                } else if(eventType.type==='demand') {
                    eventType.spec.id = eventType.spec.type+"."+(i+1);
                    events.push(new fss.Demand(eventType.spec));
                }
            }
        });
        // define the federates
        var federates = [];
        for(var i = 0; i < this.numPlayers; i++) {
            var operations;
            if(ops !== undefined && ops.match(/s/)) {
                operations = new fss.SimpleFederateOperations();
            } else if(ops !== undefined && ops.match(/d/)) {
				var horizon = 6;
				if(ops.match(/\d+/)) {
					horizon = parseInt(ops.match(/(\d+)/)[1]);
				}
                operations = new fss.DynamicFederateOperations({planningHorizon:horizon});
            } else {
                operations = new fss.Operations();
            }
            federates.push(new fss.Federate({
                    id: "FSS"+(i+1),
                    initialCash: this.initialCash,
                    operations: operations,
                    systems: []
            }));
        }
		var fedOperations;
		if(fops !== undefined && fops.match(/d+/)) {
			var horizon = 6;
			if(fops.match(/(\d+)/)) {
				horizon = parseInt(fops.match(/(\d+)/)[1]);
			}
			fedOperations = new fss.DynamicFederationOperations({planningHorizon:horizon});
		} else {
			fedOperations = new fss.Operations();
		}
        // construct and return the context
        return new fss.Context({
            locations: locations,
            events: events,
            seed: seed,
            federations: [
                new fss.Federation({
                    id: "FSS",
                    federates: federates,
					operations: fedOperations
                })
            ]
        });
    };
    
    return Game;
});