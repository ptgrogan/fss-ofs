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
 * A module to represent a ground station system.
 * @module station
 */
define('station', function(require) {
    var System = require('system');
    
    /** 
     * @constructor
     * @alias module:station
     */
    function GroundStation() {
        // initialize superclass (assigns above attributes with arguments)
        System.apply(this, arguments);
    };
    
    GroundStation.prototype = new System();
    
    /**
     * Checks if this system can be commissioned.
     * @param {object} location - The location at which to commission.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system can be commissioned.
     */
    GroundStation.prototype.canCommission = function(location, context) {
        return location.isSurface() 
                && context.getSystems(location).length===0;
    }
    
    /**
     * Gets the commission cost for this system.
     * @returns {Number} The commission cost of this system.
     */
    GroundStation.prototype.getCommissionCost = function(location, context) {
        return 0;
    }
    
    /**
     * Gets the decommission value for this system.
     * @returns {Number} The decommission value of this system.
     */
    GroundStation.prototype.getDecommissionValue = function(context) {
        return 0.5*this.getDesignCost();
    }
    
    /**
     * Checks if is a ground system.
     * @returns {Boolean} True, if this is a ground system.
     */
    GroundStation.prototype.isGround = function() {
        return true;
    }
    
    return GroundStation;
});