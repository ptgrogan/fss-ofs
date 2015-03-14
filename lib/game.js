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

define(function(require) {
	var fss = require("fss-ofs");
	
    function Game() {
		this.numSectors = 6;
		this.altitudes = ['LEO', 'MEO', 'GEO'];
		this.numFederates = 1;
		
		this.systemTypes = [
			{type: "Ground Station", cost: 500, maxSize: 4},
			{type: "Small Sat", cost: 200, maxSize: 2},
			{type: "Medium Sat", cost: 300, maxSize: 4},
			{type: "Large Sat", cost: 400, maxSize: 6}
		];
		this.eventTypes = [
			{number: 8, type: 'demand', spec: {type: "SAR P1", phenomena: "sar", size: 1, valueSchedule: [[1,500],[4,400]], defaultValue: -50}},
			{number: 12, type: 'demand', spec: {type: "SAR P2", phenomena: "sar", size: 1, valueSchedule: [[2,450],[5,350]], defaultValue: -100}},
			{number: 23, type: 'demand', spec: {type: "SAR P3", phenomena: "sar", size: 1, valueSchedule: [[3,400],[6,300]], defaultValue: -150}},
			//{number: 8, type: 'demand', spec: {type: "VIS P1", phenomena: "vis", size: 1, valueSchedule: [[1,600],[4,500]], defaultValue: -50}},
			//{number: 17, type: 'demand', spec: {type: "VIS P2", phenomena: "vis", size: 1, valueSchedule: [[2,500],[5,400]], defaultValue: -100}},
			//{number: 8, type: 'demand', spec: {type: "VIS P3", phenomena: "vis", size: 1, valueSchedule: [[3,450],[6,350]], defaultValue: -150}},
			{number: 5, type: 'disturb', spec: {hitChance: 1/6, maxHits: 1}}
		];
		this.subsystemTypes = [
			{type: "SGL(p)", protocol: "p", cost: 50, size: 1, maxTransmitted: 1, maxReceived: 1},
			{type: "SGL(o)", protocol: "o", cost: 100, size: 1, maxTransmitted: 1, maxReceived: 1},
			{type: "SAR", phenomena: "sar", cost: 200, size: 1, capacity: 1, maxSensed: 1},
			{type: "VIS", phenomena: "vis", cost: 250, size: 1, capacity: 1, maxSensed: 1}
		];
    };
	
	Game.prototype.buildContext = function(seed) {
		var locations = [];
		for(var i = 0; i < this.numSectors; i++) {
			locations.push(new fss.Surface({
				id: "SUR"+(i+1), 
				sector: i+1
			}));
			for(var j = 0; j < this.altitudes.length; j++) {
				locations.push(new fss.Orbit({
					id: this.altitudes[j]+(i+1), 
					altitude: this.altitudes[j], 
					sector: i+1
				}));
			}
		}
		var events = [];
		for(var i = 0; i < this.eventTypes.length; i++) {
			for(var j = 0; j < this.eventTypes[i].number; j++) {
				if(this.eventTypes[i].type==='disturb') {
					events.push(new fss.Disturbance(this.eventTypes[i].spec));
				} else if(this.eventTypes[i].type==='demand') {
					events.push(new fss.Demand(this.eventTypes[i].spec));
				}
			}
		}
		
		var federates = [];
		for(var i = 0; i < this.numFederates; i++) {
			federates.push(new fss.Federate({
					id: "FSS"+(i+1),
					initialCash: 1200,
					systems: []
			}));
		}
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