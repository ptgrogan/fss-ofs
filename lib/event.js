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

/** 
 * A module to represent an abstract event.
 * @module event
 */
define('event', function(require) {
    var mas = require("mas");
    
	/** 
	 * @constructor
	 * @alias module:event
	 */
    function Event() {
        this.sector = null;
		
		// initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    Event.prototype = new mas.sim.Entity();
    
	/**
	 * Checks if this is a demand event.
	 * @returns {Boolean} True, if this is a demand.
	 */
    Event.prototype.isDemand = function() {
        return false;
    };
	
	/**
	 * Checks if this is a disturbance event.
	 * @returns {Boolean} True, if this is a disturbance.
	 */
    Event.prototype.isDisturbance = function() {
        return false;
    };
    
    return Event;
});