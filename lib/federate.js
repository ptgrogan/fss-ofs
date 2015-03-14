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
	var _ = require("underscore");
	var mas = require("mas");
	var Contract = require("contract");
	
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
	
	Federate.prototype.decommission = function(system, context) {
		var index = this.systems.indexOf(system);
		if(index > -1) {
			this.cash += system.getDecommissionValue(context);
			this.systems.splice(index, 1);
			return true;
		} else {
			return false;
		}
	};
	
	Federate.prototype.liquidate = function(context) {
		if(this.systems.length > 0) {
			while(this.decommission(this.systems[0], context));
		}
	};
	
	Federate.prototype.contract = function(demand, context) {
		var index = context.currentEvents.indexOf(demand);
		if(index > -1) {
			context.currentEvents.splice(index, 1);
			var contract = new Contract({demand: demand});
			this.contracts.push(contract);
			console.log(this.id + " added contract " + contract.id);
			return contract;
		}
	};
	
	Federate.prototype.canSense = function(contract, system, context) {
		if(this.systems.indexOf(system) < 0) {
			console.log("Federate does not control system.");
		} else {
			return system.canSense(contract, context);
		}
		return false;
	}
	
	Federate.prototype.sense = function(contract, system, context) {
		if(this.contracts.indexOf(contract) < 0) {
			console.log("Federate does not own contract.");
		} else if(this.canSense(contract.demand, system, context)) {
			return system.sense(contract, context);
		}
		return false;
	};
	
	Federate.prototype.defaultContract = function(contract, context) {
		var index = this.contracts.indexOf(contract);
		if(index > -1) {
			this.cash += contract.demand.defaultValue;
			this.deleteData(contract, context);
			this.contracts.splice(index, 1);
			if(this.cash < 0) {
				this.liquidate(context);
			}
			return true;
		}
		return false;
	};
	
	Federate.prototype.deleteData = function(contract, context) {
		var subsystem = context.getSubsystem(contract);
		var dataIndex = -1;
		for(var i = 0; i < subsystem.contents.length; i++) {
			if(subsystem.contents[i].contract===contract.id) {
				dataIndex = i;
			}
		}
		subsystem.contents.splice(dataIndex, 1);
	}
	
	Federate.prototype.resolveContract = function(contract, context) {
		var index = this.contracts.indexOf(contract);
		if(index > -1 && contract.isCompleted(context)) {
			this.cash += contract.getValue();
			this.deleteData(contract, context);
			this.contracts.splice(index, 1);
			console.log(this.id + " completed contract " + contract.id + " for " + contract.getValue());
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
		}
	};
	
	Federate.prototype.tock = function() {
		for(var i = 0; i < this.systems.length; i++) {
			this.systems[i].tock();
		}
		for(var i = 0; i < this.contracts.length; i++) {
			this.contracts[i].tock();
		}
	};
	
	Federate.prototype.autoContractAndSense = function(context) {
		_.each(_.filter(this.systems, function(system) { 
			return system.isSpace(); 
		}), function(spacecraft) {
			_.each(_.filter(context.currentEvents, function(event) {
				return event.sector === context.getSystemLocation(spacecraft).sector
						&& spacecraft.canSense(event, context);
			}), function(event) {
				if(contract = this.contract(event, context)) {
					this.sense(contract, spacecraft, context);
				}
			}, this);
		}, this);
	};
	
	Federate.prototype.autoDownlink = function(context) {
		_.each(_.filter(this.systems, function(origin) { 
			return origin.isSpace(); 
		}), function(origin) {
			_.each(_.filter(origin.subsystems, function(subsystem) { 
					return subsystem.isSensor(); 
			}), function(sensor) {
				_.each(sensor.contents, function(data) {
					_.each(_.filter(this.systems, function(destination) { 
						return destination.isGround() 
								&& origin.canTransmit(data, destination, context) 
								&& destination.canReceive(origin, data, context) 
					}), function(destination) {
						_.each(_.filter(origin.subsystems, function(subsystem) { 
							return subsystem.isTransceiver(); 
						}), function(transceiver) {
							origin.transfer(sensor, data, transceiver);
							origin.transmit(data, destination, context);
							destination.receive(origin, data, context);
							this.resolveContract(_.findWhere(this.contracts, 
								{id: data.contract}), context);
						}, this);
					}, this);
				}, this);
			}, this);
		}, this);
	};
	
    return Federate;
});