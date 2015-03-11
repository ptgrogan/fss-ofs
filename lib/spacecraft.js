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
    };
	
	Spacecraft.prototype = new System();
	
	Spacecraft.prototype.canCommission = function(location, context) {
		return !location.isSurface();
	}
	
	Spacecraft.prototype.getCommissionCost = function(location, context) {
		if(!location || location.isSurface()) {
			return 0;
		} else if(location.altitude==="LEO") {
			return 0;
		} else if(location.altitude==="MEO") {
			return 0.5*this.cost;
		} else if(location.altitude==="GEO") {
			return 1.0*this.cost;
		} else {
			return 0;
		}
	};
	
	Spacecraft.prototype.getDecommissionValue = function(context) {
		var location = context.getSystemLocation(this);
		if(!location || location.isSurface()) {
			return 0;
		} if(location.altitude==="LEO") {
			return 0.25*this.getDesignCost();
		} else if(location.altitude==="MEO") {
			return 0.5*this.getDesignCost();
		} else if(location.altitude==="GEO") {
			return 0.5*this.getDesignCost();
		} else {
			return 0;
		}
	};
	
	Spacecraft.prototype.canSense = function(demand, context) {
		var location = context.getSystemLocation(this);
		if(!location) {
			console.log("System is not commissioned.");
		} else if(location.sector !== demand.sector) {
			console.log("System is not in the demand sector ("
					+ location.sector + ' != ' + demand.sector + ").");
		} else if(location.altitude === "GEO") {
			console.log("Cannot sense from GEO.");
		} else {
			for(var i = 0; i < this.subsystems.length; i++) {
				if(this.subsystems[i].canSense(demand)) {
					return true;
				}
			}
		}
		return false;
	}
	
	Spacecraft.prototype.tick = function(sim) {
		System.prototype.tick.apply(this, arguments);
		this.nextLocation = sim.entity('context').propagate(this).id;
	};
	
	Spacecraft.prototype.tock = function() {
		System.prototype.tock.apply(this, arguments);
		this.location = this.nextLocation;
	};
	
    return Spacecraft;
});