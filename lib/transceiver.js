
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
	
    function Transceiver() {
		this.protocol = "unknown";
		this.maxTransmitted = 0;
		this.maxReceived = 0;
		this.transmitted = 0;
		this.received = 0;
		
		Subsystem.apply(this, arguments);
    };
	
	Transceiver.prototype = new Subsystem();
	
	Transceiver.prototype.canTransmit = function(origin, data, destination, context) {
		return this.transmitted + data.size <= this.maxTransmitted;
	};
	
	Transceiver.prototype.transmit = function(origin, data, destination, context) {
		if(this.canTransmit(origin, data, destination, context) 
				&& this.contents.indexOf(data) > -1) {
			this.contents.splice(this.contents.indexOf(data), 1);
			this.transmitted += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	Transceiver.prototype.canReceive = function(origin, data, destination, context) {
		return this.received + data.size <= this.maxReceived;
	};
	
	Transceiver.prototype.receive = function(origin, data, destination, context) {
		if(this.canReceive(origin, data, destination, context)) {
			this.contents.push(data);
			this.received += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	Transceiver.prototype.init = function(sim) {
		Subsystem.prototype.init.apply(this, arguments);
		this.transmitted = 0;
		this.received = 0;
	};
	
	Transceiver.prototype.tick = function(sim) {
		Subsystem.prototype.tick.apply(this, arguments);
	};
	
	Transceiver.prototype.tock = function(sim) {
		Subsystem.prototype.tock.apply(this, arguments);
		this.transmitted = 0;
		this.received = 0;
		this.contents = [];
	};
	
	Transceiver.prototype.isTransceiver = function() {
		return true;
	};

    return Transceiver;
});