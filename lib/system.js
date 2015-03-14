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
		this.location = undefined;
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
	
	System.prototype.isCommissioned = function() {
		if(this.location) {
			return true;
		}
		return false;
	}
	
	System.prototype.canCommission = function(location, context) {
		return false;
	}
	
	System.prototype.commission = function(location, context) {
		if(this.canCommission(location, context)) {
			this.location = location.id;
			return true;
		} else {
			return false;
		}
	}
	
	System.prototype.getDesignCost = function() {
		var cost = this.cost;
		for(var i = 0; i < this.subsystems.length; i++) {
			cost += this.subsystems[i].cost;
		}
		return cost;
	};
	
	System.prototype.getCommissionCost = function(location) {
		return 0;
	};

	System.prototype.getDecommissionValue = function(context) {
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
		for(var i = 0; i < this.subsystems.length; i++) {
			this.subsystems[i].tick(sim);
		}
	};
	
	System.prototype.tock = function() {
		for(var i = 0; i < this.subsystems.length; i++) {
			this.subsystems[i].tock();
		}
	};
	
	System.prototype.isGround = function() {
		return false;
	}
	
	System.prototype.isSpace = function() {
		return false;
	}
	
	System.prototype.canTransmit = function(data, destination, context) {
		var location = context.getSystemLocation(this);
		if(!this.isCommissioned()) {
			console.log("System is not commissioned.");
		} else {
			var haveData = false;
			var canTransmit = false;
			for(var i = 0; i < this.subsystems.length; i++) {
				if(this.subsystems[i].isTransceiver() 
						&& this.subsystems[i].canTransmit(this, data, destination, context)) {
					canTransmit = true;
				}
				if(this.subsystems[i].contents.indexOf(data) > -1) {
					haveData = true;
				}
			}
			return haveData && canTransmit;
		}
		return false;
	};

	System.prototype.transmit = function(data, destination, context) {
		if(this.canTransmit(data, destination, context)) {
			for(var i = 0; i < this.subsystems.length; i++) {
				if(this.subsystems[i].isTransceiver()
						&& this.subsystems[i].transmit(this, data, destination, context)) {
					return true;
				}
			}
		}
		return false;
	};
	
	System.prototype.canReceive = function(origin, data, context) {
		var location = context.getSystemLocation(this);
		if(!this.isCommissioned()) {
			console.log("System is not commissioned.");
		} else {
			for(var i = 0; i < this.subsystems.length; i++) {
				if(this.subsystems[i].isTransceiver() 
						&& this.subsystems[i].canReceive(origin, data, this, context)) {
					return true;
				}
			}
		}
		return false;
	};
	
	System.prototype.receive = function(origin, data, context) {
		if(this.canReceive(origin, data, context)) {
			for(var i = 0; i < this.subsystems.length; i++) {
				if(this.subsystems[i].receive(origin, data, this, context)) {
					return true;
				}
			}
		}
		return false;
	};
	
	System.prototype.canTransfer = function(origin, data, destination) {
		return this.subsystems.indexOf(origin) > -1 
				&& this.subsystems.indexOf(destination) > -1 
				&& origin.canTransferOut(data, destination) 
				&& destination.canTransferIn(origin, data);
	}
	
	System.prototype.transfer = function(origin, data, destination) {
		if(this.canTransfer(origin, data, destination)) {
			return origin.transferOut(data, destination) 
					&& destination.transferIn(origin, data);
		}
		return false;
	}
	
    return System;
});