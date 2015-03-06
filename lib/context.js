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
	var mas = require('mas');
	
    function Context() {
		this.locations = [];
		this.currentEvents = [];
		this.futureEvents = [];
		this.pastEvents = [];
		this.federations = [];
		
        // override default attributes in constructor
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
		
		this.sectors = [];
		for(var i = 0; i < this.locations.length; i++) {
			if(this.sectors.indexOf(this.locations[i].sector)) {
				this.sectors.push(this.locations[i].sector);
			}
		}
		
		this.id = 'context';
		
		mas.sim.Entity.apply(this, arguments);
    };
	
	Context.prototype = new mas.sim.Entity();
	
	Context.prototype.getLocation = function(data) {
		for(var i = 0; i < this.federations.length; i++) {
			for(var j = 0; j < this.federations[i].length; j++) {
				for(var k = 0; k < this.federations[i].federates[j].systems.length; k++) {
					for(var l = 0; l < this.federations[i].federates[j].systems[k].subsystems.length; l++) {
						for(var m = 0; m < this.federations[i].federates[j].systems[k].subsystems[m].contents.length; m++) {
							if(data===this.federations[i].federates[j].systems[k].subsystems[l].contents[m]) {
								return this.federations[i].federates[j].systems[k].location;
							}
						}
					}
				}
			}
		}
	}
	
	Context.prototype.getSystems = function(location) {
		var systems = [];
		for(var i = 0; i < this.federations.length; i++) {
			for(var j = 0; j < this.federations[i].federates.length; j++) {
				for(var k = 0; k < this.federations[i].federates[j].systems.length; k++) {
					var system = this.federations[i].federates[j].systems[k];
					if(system.location===location) {
						systems.push(system);
					}
				}
			}
		}
		return systems;
	}
	
	Context.prototype.contract = function(federate, demand) {
		var index = this.currentEvents.indexOf(demand);
		if(index > -1 && federate.contract(demand)) {
			this.currentEvents.splice(index, 1);
			return true;
		}
		return false;
	}
	
	Context.prototype.propagate = function(location) {
		if(location.altitude==="LEO") {
			return propagateImpl(location, 2);
		} else if(location.altitude==="MEO") {
			return propagateImpl(location, 1);
		} else if(location.altitude==="GEO") {
			return propagateImpl(location, 0);
		} else {
			return location;
		}
	}
	
	Context.prototype.propagateImpl = function(origin, sectors) {
		var path = [];
		for(var i = 0; i < this.locations.length; i++) {
			if(this.locations[i].altitude===location.altitude) {
				path.push(this.locations[i]);
			}
		}
		for(var i = 0; i < this.path.length; i++) {
			if(path[i].sector===(origin.sector + sectors - 1)%path.length + 1) {
				return path[i];
			}
		}
		return origin;
	};

    Context.prototype.init = function(sim) {
		for(var i = 0; i < this.federations.length; i++) {
			this.federations[i].init(sim);
		}
	};

    Context.prototype.tick = function(sim) {
		for(var i = 0; i < this.federations.length; i++) {
			this.federations[i].tick(sim);
		}
		for(var i = 0; i < this.sectors.length; i++) {
			this.pastEvents.push(this.currentEvents[i]);
			// TODO check if spacecraft in sector
			this.currentEvents[i] = this.futureEvents.pop();
			if(this.futureEvents.length===0) {
				// TODO shuffle event order
				while(this.pastEvents.length > 0) {
					this.futureEvents.push(this.pastEvents.pop());
				}
			}
		}
	};

    Context.prototype.tock = function() {
		for(var i = 0; i < this.federations.length; i++) {
			this.federations[i].tock(sim);
		}
	};
	
    return Context;
});