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
 * A module to represent a disturbance event.
 * @module disturbance
 */
define('disturbance', function(require) {
    var Event = require("event");
    
	/** 
	 * @constructor
	 * @alias module:disturbance
	 */
    function Disturbance() {
        this.type = 'unknown';
        this.hitChance = 0; // probability of destroying each subsystem
        this.maxHits = 0; // maximum subsystems destroyed per spacecraft
		
		// initialize superclass (assigns above attributes with arguments)
        Event.apply(this, arguments);
    };
    
    Disturbance.prototype = new Event();
	
	/**
	 * Checks if this is a disturbance event.
	 * @returns {Boolean} True, if this is a disturbance.
	 */
    Disturbance.prototype.isDisturbance = function() {
        return true;
    };
    
    return Disturbance;
});