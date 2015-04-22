
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
 * A module to represent an abstract subsystem.
 * @module subsystem
 */
define('subsystem', function(require) {
    var mas = require("mas");
    
    /** 
     * @constructor
     * @alias module:subsystem
     */
    function Subsystem() {
        this.phenomena = "unknown";
        this.protocol = "unknown";
        this.cost = 0; // design cost
        this.size = 1; // number of subsystem slots
        this.maxTransferred = 1; // max bits transferred per turn
        this.transferred = 0; // bits transferred this turn
        this.contents = []; // data contents
        
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    Subsystem.prototype = new mas.sim.Entity();
    
    /**
     * Gets the size of data contents (bits).
     * @returns {Number} The size of data contents.
     */
    Subsystem.prototype.getContentsSize = function() {
        var dataSize = 0;
        for(var i = 0; i < this.contents.length; i++) {
            dataSize += this.contents[i].size;
        }
        return dataSize;
    };
    
    /**
     * Checks if data can be transferred into this subsystem.
     * @param {object} data - The data.
     * @returns {Boolean} True, if data can be transferred in.
     */
    Subsystem.prototype.canTransferIn = function(data) {
        return this.transferred + data.size <= this.maxTransferred;
    };
    
    /**
     * Transfers data into this subsystem.
     * @param {object} data - The data.
     * @returns {Boolean} True, if data was transferred in.
     */
    Subsystem.prototype.transferIn = function(data) {
        if(this.canTransferIn(data)) {
            this.contents.push(data);
            this.transferred += data.size;
            return true;
        }
        return false;
    };
    
    /**
     * Checks if data can be transferred out of this subsystem.
     * @param {object} data - The data.
     * @returns {Boolean} True, if data can be transferred out.
     */
    Subsystem.prototype.canTransferOut = function(data) {
        return this.contents.indexOf(data) > -1;
    };
    
    /**
     * Transfers data out of this subsystem.
     * @param {object} data - The data.
     * @returns {Boolean} True, if data was transferred out.
     */
    Subsystem.prototype.transferOut = function(data) {
        if(this.canTransferOut(data)) {
            this.contents.splice(this.contents.indexOf(data), 1);
            return true;
        }
        return false;
    };
    
    /**
     * Checks if this is a storage subsystem.
     * @returns {Boolean} True, if this is storage.
     */
    Subsystem.prototype.isStorage = function() {
        return false;
    };
    
    /**
     * Checks if this is a sensor subsystem.
     * @returns {Boolean} True, if this is a sensor.
     */
    Subsystem.prototype.isSensor = function() {
        return false;
    };
    
    /**
     * Checks if this is a transceiver subsystem.
     * @returns {Boolean} True, if this is a transceiver.
     */
    Subsystem.prototype.isTransceiver = function() {
        return false;
    };
    
    /**
     * Checks if this is a defense subsystem.
     * @returns {Boolean} True, if this is defense.
     */
    Subsystem.prototype.isDefense = function() {
        return false;
    };
    
    /**
     * Checks if this is an inter-satellite link subsystem.
     * @returns {Boolean} True, if this is an inter-satellite link.
     */
    Subsystem.prototype.isISL = function() {
        return false;
    };
    
    /**
     * Checks if this is an space-to-ground link subsystem.
     * @returns {Boolean} True, if this is a space-to-ground link.
     */
    Subsystem.prototype.isSGL = function() {
        return false;
    };
    
    /**
     * Initializes this subsystem.
     * @param sim {object} - The simulator.
     */
    Subsystem.prototype.init = function(sim) {
        this.transferred = 0;
    };
    
    /**
     * Ticks this subsystem to pre-compute state changes.
     * @param sim {object} - The simulator.
     */
    Subsystem.prototype.tick = function(sim) { };
    
    /**
     * Tocks this subsystem to commit state changes.
     */
    Subsystem.prototype.tock = function() {
        this.transferred = 0;
    };

    return Subsystem;
});