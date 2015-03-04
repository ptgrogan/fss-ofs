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
	
    function Federation() {
		this.name = "unknown";
		this.federates = [];
		
		mas.sim.Entity.apply(this);
    };
	
	Federation.prototype = mas.sim.Entity();
	
	Federation.prototype.join = function(federate) {
		this.federates.push(federate);
		federate.cash = federate.initialCapital;
		return true;
	}
	
	Federation.prototype.quit = function(federate) {
		var index = this.federates.indexOf(federate);
		if(index > -1) {
			federate.liquidate();
			this.federates.splice(index, 1);
			return true;
		} else {
			return false;
		}
	}
	
	Federation.prototype.init = function(sim) {
		for(var i = 0; i < this.federates.length; i++) {
			this.federates[i].init(sim);
		}
	};
	
	Federation.prototype.tick = function(sim) {
		for(var i = 0; i < this.federates.length; i++) {
			this.federates[i].tick(sim);
		}
	};
	
	Federation.prototype.tock = function(sim) {
		for(var i = 0; i < this.federates.length; i++) {
			this.federates[i].tock(sim);
		}
	};
	
    return Federation;
});