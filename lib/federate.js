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
		this.cash = 0;
		this.initialCash = 0;
		this.systems = [];
		this.contracts = [];
		
        // override default attributes in constructor
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
		
		mas.sim.Entity.apply(this, arguments);
    };
	
	Federate.prototype = new mas.sim.Entity();
	
	Federate.prototype.design = function(system) {
		if(system.getContentsSize() > system.maxSize) {
			console.log('System contents exceeds capacity.');
		} else if(system.getDesignCost() > this.cash) {
			console.log('System design cost exceeds cash.');
		} else {
			this.systems.push(system);
			this.cash -= system.getDesignCost(system);
			return true;
		}
		return false;
	};
	
	Federate.prototype.commission = function(system, location, context) {
		if(system.getCommissionCost(location) > this.cash) {
			console.log('System commission cost exceeds cash.');
		} else if(system.commission(location, context)) {
			this.cash -= system.getCommissionCost(location);
			return true;
		}
		return false;
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
	};
	
	Federate.prototype.liquidate = function() {
		if(this.systems.length > 0) {
			while(this.decommission(this.systems[0]));
		}
	};
	
	Federate.prototype.contract = function(demand, context) {
		var index = context.currentEvents.indexOf(demand);
		if(index > -1) {
			context.currentEvents[index] = null;
			this.contacts.push(new Contract({demand: demand}));
		}
	};
	/*
	
	Federate.prototype.canSense = function(system, demand, context) {
		if(system.location === null) {
			console.log("System is not commissioned.");
		} else if(!system.location.isSurface()) {
			console.log("System is not in orbit.");
		} else {
			var demand = context.currentEvents[system.location.sector];
			var data = new Data({
				type: demand.type,
				size: demand.size
			});
			for(var i = 0; i < system.subsystems.length; i++) {
				if(system.subsystems[i].canSense(data)) {
					return true;
				}
			}
			console.log("System has no capable subsystems.");
		}
		return false;
	}
	
	Federate.prototype.sense = function(system, context) {
		if(!this.canSense(system, context)) {
			console.log("System cannot sense data.");
		} else {
			var demand = context.currentEvents[system.location.sector];
			var data = new Data({
				type: demand.type,
				size: demand.size
			});
			for(var i = 0; i < system.subsystems.length; i++) {
				if(system.subsystems[i].canSense(data)) {
					system.subsystems[i].sense(data)
					return true;
				}
			}
		}
		return false;
		// check if federate owns contract
		// check if contract has no elapsed time
		// check if system in same sector
		// check if sensor can sense data
		if(this.contracts.indexOf(contract) > -1
				&& contract.elapsedTime === 0
				// TODO check if sensor in same sector
				&& subsystem.canSense(data)) {
			subsystem.sense(data);
			return true;
		}
		return false;
	};
	*/
	
	Federate.prototype.defaultContract = function(contract, context) {
		var index = this.contracts.indexOf(contract);
		if(index > -1) {
			this.cash -= contract.demand.defaultValue;
			// TODO: delete data from defaulted contract
			contracts.splice(index, 1);
			if(this.cash < 0) {
				this.liquidate();
			}
			return true;
		}
		return false;
	};
	
	Federate.prototype.resolveContract = function(contract, context) {
		var index = this.contracts.indexOf(contract);
		if(index > -1 && contract.isCompleted(context)) {
			this.cash += contract.getValue();
			// TODO: delete data from completed contract
			contracts.splice(index, 1);
			return true;
		}
		return false;
	};
	
	Federate.prototype.init = function(sim) {
		this.cash = this.initialCash;
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].init(sim);
		}
	};
	
	Federate.prototype.tick = function(sim) {
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].tick(sim);
		}
		for(var i = 0; i < this.contracts.length; i++) {
			this.contracts[i].tick(sim);
			if(this.contracts[i].isDefaulted(sim.context)) {
				this.defaultContract(this.contracts[i], sim.context);
			}
			if(this.contracts[i].isCompleted(sim.context)) {
				this.resolveContract(this.contracts[i], sim.context);
			}
		}
	};
	
	Federate.prototype.tock = function(sim) {
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].tock(sim);
		}
		for(var i = 0; i < this.contracts.length; i++) {
			this.contracts[i].tock(sim);
		}
	};
	
    return Federate;
});