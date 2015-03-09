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
	
    function System() {
		this.name = "unknown";
		this.location = null;
        this.cost = 0;
		this.maxSize = 0;
		this.subsystems = [];
		
		mas.sim.Entity.apply(this, arguments);
    };
	
	System.prototype = new mas.sim.Entity();
	
	System.prototype.getContentsSize = function() {
		var size = 0;
		for(var i = 0; i < this.subsystems.length; i++) {
			size += this.subsystems[i].size;
		}
		return size;
	};
	
	System.prototype.canCommission = function(location, context) {
		return false;
	}
	
	System.prototype.commission = function(location, context) {
		if(this.canCommission(location, context)) {
			this.location = location;
			return true;
		} else {
			return false;
		}
	}
	
	System.prototype.getDesignCost = function() {
		var cost = this.cost;
		for(var i = 0; i < this.subsystems.length; i++) {
			cost += this.subsystems.cost;
		}
		return cost;
	};
	
	System.prototype.getCommissionCost = function(location) {
		return 0;
	};

	System.prototype.getDecommissionValue = function() {
		return 0;
	};
	
	System.prototype.transfer = function(data, origin, destination) {
		if(origin.canTransferOut(data) && destination.canTransferIn(data)) {
			origin.transferOut(data);
			destination.transferIn(data);
		}
	}
	
	System.prototype.init = function(sim) {
		for(var i = 0; i < this.subsystems.length; i++) {
			this.subsystems[i].init(sim);
		}
	};
	
	System.prototype.tick = function(sim) {
		this.nextLocation = sim.entity('context').propagate(this.location);
		for(var i = 0; i < this.subsystems.length; i++) {
			this.subsystems[i].tick(sim);
		}
	};
	
	System.prototype.tock = function(sim) {
		this.location = this.nextLocation;
		for(var i = 0; i < this.subsystems.length; i++) {
			this.subsystems[i].tock(sim);
		}
	};
	
    return System;
});