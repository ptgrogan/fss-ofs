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
    function Context() {
		this.locations = [];
		this.federations = [];
		
        // override default attributes in constructor
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
    };
	
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
	
    return Context;
});