
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
	
    function SpaceGroundLink() {
		this.protocol = "unknown";
		this.maxTransmitted = 0;
		this.maxReceived = 0;
		this.transmitted = 0;
		this.received = 0;
		
		Subsystem.apply(this, arguments);
    };
	
	SpaceGroundLink.prototype = new Subsystem();
	
	SpaceGroundLink.prototype.canTransferOut = function(data) {
		return this.contents.indexOf(data) > -1;
	};
	
	SpaceGroundLink.prototype.transferOut = function(data) {
		if(this.canTransfer(this.contents.indexOf(data))) {
			this.contents.splice(index, 1);
			return true;
		} else {
			return false;
		}
	};
	
	SpaceGroundLink.prototype.canTransferIn = function(data) {
		return this.getContentsSize() + data.size <= this.capacity;
	};
	
	SpaceGroundLink.prototype.transferIn = function(data) {
		if(this.canTransferIn(data)) {
			this.contents.push(data);
			return true;
		} else {
			return false;
		}
	};
	
	SpaceGroundLink.prototype.canTransmit = function(data) {
		return this.contents.indexOf(data) > -1 
				&& this.transmitted + data.size <= this.maxTransmitted;
	};
	
	SpaceGroundLink.prototype.transmit = function(data) {
		if(this.canTransmit(data)) {
			this.contents.splice(this.contents.indexOf(data), 1);
			this.transmitted += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	SpaceGroundLink.prototype.canReceive = function(data) {
		return this.getContentsSize() + data.size <= this.capacity 
				&& this.received + data.size <= this.maxReceived;
	};
	
	SpaceGroundLink.prototype.receive = function(data) {
		if(this.canReceive(data)) {
			this.contents.push(data);
			this.received += data.size;
			return true;
		} else {
			return false;
		}
	};
	
	SpaceGroundLink.prototype.init = function(sim) {
		this.transmitted = 0;
		this.received = 0;
	};
	
	SpaceGroundLink.prototype.tick = function(sim) { };
	
	SpaceGroundLink.prototype.tock = function(sim) {
		this.transmitted = 0;
		this.received = 0;
		this.contents = [];
	};

    return SpaceGroundLink;
});