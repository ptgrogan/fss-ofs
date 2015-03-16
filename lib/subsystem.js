
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
	
    function Subsystem() {
		this.phenomena = "unknown";
		this.protocol = "unknown";
        this.cost = 0;
		this.size = 1;
		this.maxTransferred = 1;
		this.transferred = 0;
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
	
	Subsystem.prototype.canTransferIn = function(origin, data) {
		return this.transferred + data.size <= this.maxTransferred;
	};
	
	Subsystem.prototype.transferIn = function(origin, data) {
		if(this.canTransferIn(origin, data)) {
			this.contents.push(data);
			this.transferred += data.size;
			return true;
		}
		return false;
	};
	
	Subsystem.prototype.canTransferOut = function(data, destination) {
		return this.contents.indexOf(data) > -1;
	};
	
	Subsystem.prototype.transferOut = function(data, destination) {
		if(this.canTransferOut(data, destination)) {
			this.contents.splice(this.contents.indexOf(data), 1);
			return true;
		}
		return false;
	};
	
	Subsystem.prototype.isStorage = function() {
		return false;
	};
	
	Subsystem.prototype.isSensor = function() {
		return false;
	};
	
	Subsystem.prototype.isTransceiver = function() {
		return false;
	};
	
	Subsystem.prototype.isDefense = function() {
		return false;
	};
	
	Subsystem.prototype.isISL = function() {
		return false;
	};
	
	Subsystem.prototype.isSGL = function() {
		return false;
	};
	
	Subsystem.prototype.init = function(sim) {
		this.transferred = 0;
	};
	
	Subsystem.prototype.tick = function(sim) { };
	
	Subsystem.prototype.tock = function() {
		this.transferred = 0;
	};

    return Subsystem;
});