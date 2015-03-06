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
	var System = require('system');
	
    function Spacecraft() {
		System.apply(this, arguments);
		this.nextLocation = this.location;
    };
	
	Spacecraft.prototype = new System();
	
	Spacecraft.getCommissionCost = function() {
		if(this.location.altitude==="LEO") {
			return 0;
		} else if(this.location.altitude==="MEO") {
			return 0.5*this.cost;
		} else if(this.location.altitude==="GEO") {
			return 1.0*this.cost;
		} else {
			return 0;
		}
	};
	
	Spacecraft.prototype.getDecommissionValue = function() {
		if(this.location.altitude==="LEO") {
			return 0.25*this.getDesignCost();
		} else if(this.location.altitude==="MEO") {
			return 0.5*this.getDesignCost();
		} else if(this.location.altitude==="GEO") {
			return 0.5*this.getDesignCost();
		} else {
			return 0;
		}
	};
	
	Spacecraft.prototype.tick = function(sim) {
		System.tick.apply(this, arguments);
		this.nextLocation = sim.propagate(this.location);
	};
	
	Spacecraft.prototype.tock = function(sim) {
		System.tock.apply(this, arguments);
		this.location = this.nextLocation;
	};
	
    return Spacecraft;
});