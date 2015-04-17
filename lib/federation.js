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
 * A module to represent a federation.
 * @module federation
 */
define('federation', function(require) {
    var mas = require("mas");
    
    /** 
     * @constructor
     * @alias module:federation
     */
    function Federation() {
        this.federates = [];
        
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    Federation.prototype = new mas.sim.Entity();
    
    /**
     * Joins a federate to this federation.
     * @param {object} federate - The federate.
     * @returns {Boolean} True, if the federate joined this federation.
     */
    Federation.prototype.join = function(federate) {
        this.federates.push(federate);
        federate.cash = federate.initialCapital;
        return true;
    }
    
    /**
     * Quits a federate to this federation.
     * @param {object} federate - The federate.
     * @returns {Boolean} True, if the federate quit this federation.
     */
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
    
    /**
     * Initializes this federation.
     * @param {object} sim - The simulator.
     */
    Federation.prototype.init = function(sim) {
        for(var i = 0; i < this.federates.length; i++) {
            this.federates[i].init(sim);
        }
    };
    
    /**
     * Ticks this federation to pre-compute state changes.
     * @param {object} sim - The simulator.
     */
    Federation.prototype.tick = function(sim) {
        for(var i = 0; i < this.federates.length; i++) {
            this.federates[i].tick(sim);
        }
    };
    
    /**
     * Tocks this federation to commit state changes.
     */
    Federation.prototype.tock = function() {
        for(var i = 0; i < this.federates.length; i++) {
            this.federates[i].tock();
        }
    };
    
    return Federation;
});