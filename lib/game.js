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
        this.numFederates = 1;
        this.initialCash = 1200;
        this.numTurns = 10;
        
        // override default attributes or methods
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
        
        // define event types
        this.eventTypes = [
            {number: 8, type: 'demand', spec: {type: "SAR P1", phenomena: "sar", size: 1, valueSchedule: [[1,500],[4,400]], defaultValue: -50}},
            {number: 12, type: 'demand', spec: {type: "SAR P2", phenomena: "sar", size: 1, valueSchedule: [[2,450],[5,350]], defaultValue: -100}},
            {number: 23, type: 'demand', spec: {type: "SAR P3", phenomena: "sar", size: 1, valueSchedule: [[3,400],[6,300]], defaultValue: -150}},
            {number: 8, type: 'demand', spec: {type: "VIS P1", phenomena: "vis", size: 1, valueSchedule: [[1,600],[4,500]], defaultValue: -50}},
            {number: 17, type: 'demand', spec: {type: "VIS P2", phenomena: "vis", size: 1, valueSchedule: [[2,500],[5,400]], defaultValue: -100}},
            {number: 8, type: 'demand', spec: {type: "VIS P3", phenomena: "vis", size: 1, valueSchedule: [[3,450],[6,350]], defaultValue: -150}},
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
            {type: "pSGL", protocol: "prop", cost: 50, size: 1, maxTransmitted: 1, maxReceived: 1},
            {type: "oSGL", protocol: "open", cost: 100, size: 1, maxTransmitted: 1, maxReceived: 1}
        ];
        // define ISL subsystems
        this.islTypes = [
            {type: "pISL", protocol: "prop", cost: 50, size: 1, maxTransmitted: 1, maxReceived: 1},
            {type: "oISL", protocol: "open", cost: 100, size: 1, maxTransmitted: 1, maxReceived: 1}
        ];
        // define sensor subsystems
        this.sensorTypes = [
            {type: "SAR", phenomena: "sar", cost: 200, size: 1, capacity: 1, maxSensed: 1},
            {type: "VIS", phenomena: "vis", cost: 250, size: 1, capacity: 1, maxSensed: 1}
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
     * @returns {object} The context.
     */
    Game.prototype.buildContext = function(seed) {
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
                    events.push(new fss.Demand(eventType.spec));
                }
            }
        });
        // define the federates
        var federates = [];
        for(var i = 0; i < this.numFederates; i++) {
            federates.push(new fss.Federate({
                    id: "FSS"+(i+1),
                    initialCash: this.initialCash,
                    systems: []
            }));
        }
        // construct and return the context
        return new fss.Context({
            locations: locations,
            events: events,
            seed: seed,
            federations: [
                new fss.Federation({
                    id: "FSS",
                    federates: federates
                })
            ]
        });
    };
    
    return Game;
});