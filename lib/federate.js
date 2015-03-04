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
	
    function Federate() {
		this.name = "unknown";
		this.cash = 0;
		this.initialCapital = 0;
		this.systems = [];
		
        // override default attributes in constructor
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
		
		mas.sim.Entity.apply(this);
    };
	
	Federate.prototype = mas.sim.Entity();
	
	Federate.prototype.design = function(system) {
		if(system.getContentsSize() <= system.maxSize
				&& system.getDesignCost() <= this.cash) {
			this.systems.push(system);
			this.cash -= system.getDesignCost(system);
			return true;
		} else {
			return false;
		}
	};
	
	Federate.prototype.commission = function(context, system, location) {
		if(location.canCommission(system, context)
				&& system.getComissionCost(location) <= this.cash 
				&& system.commission(context, location)) {
			this.cash -= system.getCommissionCost(location);
			return true;
		} else {
			return false;
		}
	};
	
	Federate.prototype.decommission = function(system) {
		var index = this.systems.indexOf(system);
		if(index > -1) {
			this.cash += system.getDecommissionValue();
			this.systems.splice(index, 1);
			return true;
		} else {
			return false;
		}
	}
	
	Federate.prototype.liquidate = function() {
		while(this.systems.length > 0) {
			this.decommission(this.systems.pop());
		}
	}
	
	Federate.prototype.init = function(sim) {
		this.cash = initialCapital;
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].init(sim);
		}
	};
	
	Federate.prototype.tick = function(sim) {
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].tick(sim);
		}
	};
	
	Federate.prototype.tock = function(sim) {
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].tock(sim);
		}
	};
	
    return Federate;
});