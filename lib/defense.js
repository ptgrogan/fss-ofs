
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
 * A module to represent a debris defense subsystem.
 * @module defense
 */
define(function(require) {
    var Subsystem = require("subsystem");
	
	/** 
	 * @constructor
	 * @alias module:defense
	 */
    function Defense() {
		// initialize superclass (assigns above attributes with arguments)
        Subsystem.apply(this, arguments);
    };
    
    Defense.prototype = new Subsystem();
    
	/**
	 * Checks if this is a defense subsystem.
	 * @returns {Boolean} True, if this is a defense subsystem.
	 */
    Defense.prototype.isDefense = function() {
        return true;
    };

    return Defense;
});