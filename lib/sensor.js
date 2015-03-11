
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
	var Subsystem = require("subsystem");
	var Data = require("data");
	
    function Sensor() {
		this.phenomena = "unknown";
		this.maxSensed = 0;
		this.sensed = 0;
		
		Subsystem.apply(this, arguments);
    };
	
	Sensor.prototype = new Subsystem();
		
	Sensor.prototype.canSense = function(demand) {
		// check for compatible phenomena type
		// check contents capacity will not exceed maximum
		// check sensing capacity will not exceed maximum
		return this.phenomena === demand.phenomena
				&& this.getContentsSize() + demand.size <= this.capacity 
				&& this.sensed + demand.size <= this.maxSensed;
	};
	
	Sensor.prototype.sense = function(contract) {
		if(this.canSense(contract.demand)) {
			var data = new Data({
				phenomena: contract.demand.phenomena, 
				size: contract.demand.size, 
				contract: contract.id
			});
			this.contents.push(data);
			this.sensed += data.size;
			return true;
		}
		return false;
	};
		
	Sensor.prototype.init = function(sim) {
		this.sensed = 0;
	};
	
	Sensor.prototype.tick = function(sim) { };
	
	Sensor.prototype.tock = function(sim) {
		this.sensed = 0;
	};

    return Sensor;
});