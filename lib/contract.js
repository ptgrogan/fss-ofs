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
 * A module to represent a data contract.
 * @module contract
 */
define('contract', function(require) {
    var mas = require("mas");
    
    /** 
     * @constructor
     * @alias module:context
     */
    function Contract() {
        this.demand = null;
        this.elapsedTime = 0;
        this.nextElapsedTime = 0;
        
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    Contract.prototype = new mas.sim.Entity();
    
    /**
     * Gets the current value of this contract.
     * @returns {Number} The current value.
     */
    Contract.prototype.getValue = function() {
        for(var i = 0; i < this.demand.valueSchedule.length; i++) {
            // return schedule value if elapsed time is below deadline
            if(this.elapsedTime <= this.demand.valueSchedule[i][0]) {
                return this.demand.valueSchedule[i][1];
            }
        }
        // return default value if past last value deadline
        return this.defaultValue;
    }
    
    /**
     * Checks if this contract has expired.
     * @returns {Boolean} True, if this contract expired.
     */
    Contract.prototype.isExpired = function() {
        return this.elapsedTime > this.demand.valueSchedule[this.demand.valueSchedule.length - 1][0];
    }
    
    /**
     * Checks if this contract is defaulted (i.e. expired or data is lost).
     * @returns {Boolean} True, if this contract is defaulted.
     */
    Contract.prototype.isDefaulted = function(context) {
        // check if data has been lost (null location)
        // check if elapsed time exceeds longest value deadline
        return !context.getDataLocation(this) 
                || this.isExpired();
    }
    
    /**
     * Checks if this contract is completed (i.e. data is at a surface location).
     * @returns {Boolean} True, if this contract is complete.
     */
    Contract.prototype.isCompleted = function(context) {
        // check if data exists (non-null location)
        // check if data is at a surface location
        return context.getDataLocation(this)
                && context.getDataLocation(this).isSurface();
    }
    
    /**
     * Initializes this contract.
     */
    Contract.prototype.init = function(sim) {
        this.elapsedTime = 0;
    }
    
    /**
     * Ticks this contract to pre-compute state changes.
     * @param {object} sim - The simulator
     */
    Contract.prototype.tick = function(sim) {
        this.nextElapsedTime = this.elapsedTime + sim.timeStep;
    }
    
    /**
     * Tocks this contract to commit state changes.
     */
    Contract.prototype.tock = function() {
        this.elapsedTime = this.nextElapsedTime;
    }
    
    return Contract;
});