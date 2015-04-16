
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
 * A module to represent an abstract transceiver subsystem.
 * @module transceiver
 */
define('transceiver', function(require) {
    var Subsystem = require("subsystem");
	
	/** 
	 * @constructor
	 * @alias module:transceiver
	 */
    function Transceiver() {
        this.protocol = "unknown";
        this.maxTransmitted = 0; // max data transmitted per turn
        this.maxReceived = 0; // max data received per turn
        this.transmitted = 0; // data transmitted this turn
        this.received = 0; // data received this turn
        
        Subsystem.apply(this, arguments);
    };
    
    Transceiver.prototype = new Subsystem();
    
	/**
	 * Checks if this transceiver can transmit data to a receiver.
	 * @param {object} origin - The data origin.
	 * @param {object} data - The data.
	 * @param {object} destination - The data destination.
	 * @param {object} receiver - The destination receiver.
	 * @param {object} context - The context.
	 * @returns {Boolean} True, if this transceiver can transmit data.
	 */
    Transceiver.prototype.canTransmit = function(origin, data, destination, receiver, context) {
        return this.transmitted + data.size <= this.maxTransmitted;
    };
	
	/**
	 * Transmits data to a receiver.
	 * @param {object} origin - The data origin.
	 * @param {object} data - The data.
	 * @param {object} destination - The data destination.
	 * @param {object} receiver - The destination receiver.
	 * @param {object} context - The context.
	 * @returns {Boolean} True, if this transceiver transmitted data.
	 */
    Transceiver.prototype.transmit = function(origin, data, destination, receiver, context) {
        if(this.canTransmit(origin, data, destination, receiver, context) 
                && this.contents.indexOf(data) > -1) {
            this.contents.splice(this.contents.indexOf(data), 1);
            this.transmitted += data.size;
            return true;
        } else {
            return false;
        }
    };
    
	/**
	 * Checks if this transceiver can receive data from a transmitter.
	 * @param {object} origin - The data origin.
	 * @param {object} transmitter - The origin transmitter.
	 * @param {object} data - The data.
	 * @param {object} destination - The data destination.
	 * @param {object} context - The context.
	 * @returns {Boolean} True, if this transceiver can receive data.
	 */
    Transceiver.prototype.canReceive = function(origin, transmitter, data, destination, context) {
        return this.received + data.size <= this.maxReceived;
    };
    
	/**
	 * Receives data from a transmitter.
	 * @param {object} origin - The data origin.
	 * @param {object} transmitter - The origin transmitter.
	 * @param {object} data - The data.
	 * @param {object} destination - The data destination.
	 * @param {object} context - The context.
	 * @returns {Boolean} True, if this transceiver received data.
	 */
    Transceiver.prototype.receive = function(origin, transmitter, data, destination, context) {
        if(this.canReceive(origin, transmitter, data, destination, context)) {
            this.contents.push(data);
            this.received += data.size;
            return true;
        } else {
            return false;
        }
    };
	
	/**
	 * Initializes this transceiver.
	 * @param sim {object} - The simulator.
	 */
    Transceiver.prototype.init = function(sim) {
        Subsystem.prototype.init.apply(this, arguments);
        this.transmitted = 0;
        this.received = 0;
    };
	
	/**
	 * Ticks this transceiver to pre-compute state changes.
	 * @param sim {object} - The simulator.
	 */
    Transceiver.prototype.tick = function(sim) {
        Subsystem.prototype.tick.apply(this, arguments);
    };
	
	/**
	 * Tocks this transceiver to commit state changes.
	 */
    Transceiver.prototype.tock = function() {
        Subsystem.prototype.tock.apply(this, arguments);
        this.transmitted = 0;
        this.received = 0;
        this.contents = [];
    };
    
	/**
	 * Checks if this is a transceiver subsystem.
	 * @returns {Boolean} True, if this is a transceiver.
	 */
    Transceiver.prototype.isTransceiver = function() {
        return true;
    };

    return Transceiver;
});