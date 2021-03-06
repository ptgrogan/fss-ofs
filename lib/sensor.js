
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
 * A module to represent a sensor subsystem.
 * @module sensor
 */
define('sensor', function(require) {
    var Storage = require("storage");
    var Data = require("data");
        
    /** 
     * @constructor
     * @alias module:sensor
     */
    function Sensor() {
        this.phenomena = "unknown";
        this.capacity = 0; // data storage capacity
        this.maxSensed = 0; // max data sensed per turn
        this.sensed = 0; // data sensed this turn
        
        // initialize superclass (assigns above attributes with arguments)
        Storage.apply(this, arguments);
    };
    
    Sensor.prototype = new Storage();
    
    /**
     * Checks if this could sense to meet a demand.
     * @param {String} phenomena - The data phenomena.
     * @param {Number} dataSize - The data size.
     * @returns {Boolean} True, if data can be sensed for the demand.
     */
    Sensor.prototype.couldSense = function(phenomena, dataSize) {
        // check for compatible phenomena type
        // check sensing capacity will not exceed maximum
        return this.phenomena === phenomena
                && this.sensed + dataSize <= this.maxSensed;
    };
    
    /**
     * Checks if this sensor can sense to meet a demand.
     * @param {object} system - The sensor's system.
     * @param {object} demand - The demand.
     * @param {object} context - The context.
     * @returns {Boolean} True, if data can be sensed for the demand.
     */
    Sensor.prototype.canSense = function(system, demand, context) {
        var location = context.getSystemLocation(system);
		
        // check for compatible location
        return this.couldSense(demand.phenomena, demand.size)
				&& ((location.altitude === "LEO" && location.sector === demand.sector)
					|| (location.altitude === "MEO" && location.sector === demand.sector));
    };
    
    /**
     * Senses data for a contract.
     * @param {object} system - The sensor's system.
     * @param {object} contract - The contract.
     * @param {object} context - The context.
     * @returns {Boolean} True, if data was sensed.
     */
    Sensor.prototype.sense = function(system, contract, context) {
        var data = contract.demand.getData();
        data.contract = contract.id;
        if(this.canSense(system, contract.demand, context) 
                && this.canTransferIn(data)) {
            this.contents.push(data);
            this.sensed += data.size;
            return true;
        }
        return false;
    };
    
    /**
     * Checks if this is a sensor subsystem.
     * @returns {Boolean} True, if this is a sensor.
     */
    Sensor.prototype.isSensor = function() {
        return true;
    };
    
    /**
     * Initializes this sensor.
     * @param sim {object} - The simulator.
     */
    Sensor.prototype.init = function(sim) {
        Storage.prototype.init.apply(this, arguments);
        this.sensed = 0;
    };
    
    /**
     * Ticks this sensor to pre-compute state changes.
     * @param sim {object} - The simulator.
     */
    Sensor.prototype.tick = function(sim) { 
        Storage.prototype.tick.apply(this, arguments);
    };
    
    /**
     * Tocks this sensor to commit state changes.
     */
    Sensor.prototype.tock = function() {
        Storage.prototype.tock.apply(this, arguments);
        this.sensed = 0;
    };
    
    /**
     * Checks if data can be transferred into this sensor.
     * @param {object} data - The data.
     * @param {Boolean} True, if the data can be transferred in.
     */
    Sensor.prototype.canTransferIn = function(data) {
        return Storage.prototype.canTransferIn.apply(this, arguments)
                && data.phenomena === this.phenomena;
    };

    return Sensor;
});