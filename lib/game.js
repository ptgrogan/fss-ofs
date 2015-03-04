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
	var fss = require('fss');
	
    function Game() {
		this.numSectors = 6;
		this.altitudes = ['LEO', 'MEO', 'GEO'];
		this.numFederates = 1;
		
		this.systemTypes = [
			new fss.GroundStation{name: "X", cost: 500, maxSize: 4},
			new fss.Spacecraft{name: "A", cost: 200, maxSize: 2},
			new fss.Spacecraft{name: "B", cost: 300, maxSize: 4},
			new fss.Spacecraft{name: "C", cost: 400, maxSize: 6}
		];
		this.eventTypes = [
			{number: 8, event: new fss.Contract(name: "SAR P1", valueSchedule: [[1,500],[4,400],[Infinity,-50]])},
			{number: 12, event: new fss.Contract(name: "SAR P2", valueSchedule: [[2,450],[5,350],[Infinity,-100]])},
			{number: 23, event: new fss.Contract(name: "SAR P3", valueSchedule: [[3,400],[6,300],[Infinity,-150]])},
			{number: 8, event: new fss.Contract(name: "VIS P1", valueSchedule: [[1,600],[4,500],[Infinity,-50]])},
			{number: 17, event: new fss.Contract(name: "VIS P2", valueSchedule: [[2,500],[5,400],[Infinity,-100]])},
			{number: 8, event: new fss.Contract(name: "VIS P3", valueSchedule: [[3,450],[6,350],[Infinity,-150]])},
			{number: 5, event: new fss.Disturbance(name: "Minor"},
			{number: 1, event: new fss.Disturbance(name: "Major"}
		];
		this.numEvents = [
		
		];
		this.subsystemTypes = [
			new fss.Subsystem({name: "SGL(p)", cost: 50, size: 1, capacity: 0, bandwidth: 1}),
			new fss.Subsystem({name: "SAR", cost: 250, size: 1, capacity: 1, bandwidth: 0})
		];
    };
	
	Game.prototype.buildContext = function() {
		var locations = [];
		for(var i = 0; i < this.numSectors; i++) {
			locations.push(new fss.Surface({
				name: "SUR"+(i+1), 
				sector: i+1
			}));
			for(var j = 0; j < this.altitudes.length; j++) {
				locations.push(new fss.Orbit({
					name: this.altitudes[j]+(i+1), 
					altitude: this.altitudes[j], 
					sector: i+1
				}));
			}
		}
		var events = [];
		for(var i = 0; i < this.eventTypes; i++) {
			for(var j = 0; j < this.eventTypes[i].number; j++) {
				events.push(clone(this.eventTypes[i].event));
			}
		}
		
		var federates = [];
		for(var i = 0; i < this.numFederates; i++) {
			federates.push(new fss.Federate({
					name: "FSS"+(i+1),
					systems: []
			}));
		}
		return new fss.Context({
			locations: locations,
			events: [],
			federations: [new fss.Federation({
				name: "FSS",
				federates: federates
		});
	};
	
	function clone(obj) {
		if(obj == null || typeof(obj) != 'object')
			return obj;

		var temp = obj.constructor(); // changed

		for(var key in obj) {
			if(obj.hasOwnProperty(key)) {
				temp[key] = clone(obj[key]);
			}
		}
		return temp;
	}

    return Data;
});