
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
	var Data = require("data");
	
    function Subsystem() {
		this.phenomena = "unknown";
		this.protocol = "unknown";
        this.cost = 0;
		this.size = 1;
		this.capacity = 0;
		this.maxSensed = 0;
		this.maxTransmitted = 0;
		this.maxReceived = 0;
		this.sensed = 0;
		this.transmitted = 0;
		this.received = 0;
		this.contents = [];
		
		mas.sim.Entity.apply(this, arguments);
    };
	
	Subsystem.prototype = new mas.sim.Entity();
	
	Subsystem.prototype.getContentsSize = function() {
		var dataSize = 0;
		for(var i = 0; i < this.contents.length; i++) {
			dataSize += this.contents[i].size;
		}
		return dataSize;
	};
	
	Subsystem.prototype.canSense = function(data) {
		// check for compatible phenomena type
		// check contents capacity will not exceed maximum
		// check sensing capacity will not exceed maximum
		return this.phenomena === data.phenomena
				&& this.getContentsSize() + data.size <= this.capacity 
				&& this.sensed + data.size <= this.maxSensed;
	};
	
	Subsystem.prototype.sense = function(data) {
		if(this.canSense(data)) {
			this.contents.push(data);
			this.sensed += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	Subsystem.prototype.canTransferOut = function(data) {
		return this.contents.indexOf(data) > -1;
	};
	
	Subsystem.prototype.transferOut = function(data) {
		if(this.canTransfer(this.contents.indexOf(data))) {
			this.contents.splice(index, 1);
			return true;
		} else {
			return false;
		}
	};
	
	Subsystem.prototype.canTransferIn = function(data) {
		return this.getContentsSize() + data.size <= this.capacity;
	};
	
	Subsystem.prototype.transferIn = function(data) {
		if(this.canTransferIn(data)) {
			this.contents.push(data);
			return true;
		} else {
			return false;
		}
	};
	
	Subsystem.prototype.canTransmit = function(data) {
		return this.contents.indexOf(data) > -1 
				&& this.transmitted + data.size <= this.maxTransmitted;
	};
	
	Subsystem.prototype.transmit = function(data) {
		if(this.canTransmit(data)) {
			this.contents.splice(this.contents.indexOf(data), 1);
			this.transmitted += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	Subsystem.prototype.canReceive = function(data) {
		return this.getContentsSize() + data.size <= this.capacity 
				&& this.received + data.size <= this.maxReceived;
	};
	
	Subsystem.prototype.receive = function(data) {
		if(this.canReceive(data)) {
			this.contents.push(data);
			this.received += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	Subsystem.prototype.init = function(sim) {
		this.sensed = 0;
		this.transmitted = 0;
		this.received = 0;
	};
	
	Subsystem.prototype.tick = function(sim) { };
	
	Subsystem.prototype.tock = function(sim) {
		this.sensed = 0;
		this.transmitted = 0;
		this.received = 0;
	};

    return Subsystem;
});