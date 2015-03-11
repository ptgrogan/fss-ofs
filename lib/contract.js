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
	var mas = require("mas");
	
    function Contract() {
		this.demand = null;
		this.elapsedTime = 0;
		this.nextElapsedTime = 0;
		mas.sim.Entity.apply(this, arguments);
    };
	
	Contract.prototype = new mas.sim.Entity();
	
	Contract.prototype.getValue = function() {
		for(var i = 0; i < this.demand.valueSchedule.length - 1; i++) {
			// return schedule value if elapsed time is below deadline
			if(this.elapsedTime <= this.demand.valueSchedule[i][0]) {
				return this.demand.valueSchedule[i][1];
			}
		}
		// return default value if past last value deadline
		return this.defaultValue;
	}
	
	Contract.prototype.isDefaulted = function(context) {
		// check if data has been lost (null location)
		// check if elapsed time exceeds longest value deadline
		return context.getDataLocation(this) === null 
				|| this.elapsedTime > this.demand.valueSchedule[this.demand.valueSchedule.length - 1][0];
	}
	
	Contract.prototype.isCompleted = function(context) {
		// check if data exists (non-null location)
		// check if data is at a surface location
		return context.getDataLocation(this)
				&& context.getDataLocation(this).isSurface();
	}
	
	Contract.prototype.init = function(sim) {
		this.elapsedTime = 0;
	}
	
	Contract.prototype.tick = function(sim) {
		this.nextElapsedTime = this.elapsedTime + sim.timeStep;
	}
	
	Contract.prototype.tock = function(sim) {
		this.elapsedTime = this.nextElapsedTime;
	}
	
    return Contract;
});