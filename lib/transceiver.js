
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
    var _ = require("underscore");
    
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
        
        // initialize superclass (assigns above attributes with arguments)
        Subsystem.apply(this, arguments);
    };
    
    Transceiver.prototype = new Subsystem();
    
    /**
     * Checks if data can be transferred into this transceiver.
     * @param {object} data - The data.
     * @param {Boolean} True, if the data can be transferred in.
     */
    Transceiver.prototype.canTransferIn = function(data) {
        return Subsystem.prototype.canTransferIn.apply(this, arguments)
                && this.getContentsSize()===0;
    };
    
    /**
     * Checks if this transceiver can transmit data to a receiver.
     * @param {object} origLoc - The origin location.
     * @param {object} dataSize - The data size.
     * @param {object} destLoc - The destination location.
     * @param {object} receiver - The destination receiver.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this transceiver can transmit data.
     */
    Transceiver.prototype.canTransmit = function(origLoc, dataSize, destLoc, receiver, context) {
        return (this.transmitted + dataSize <= this.maxTransmitted)
                && (this.protocol === receiver.protocol)
				&& (this.protocol.match(/pSGL|pISL/) ? _.filter(context.federations, function(federation) {
					return _.filter(federation.federates, function(federate) {
								return _.filter(federate.systems, function(system) {
											return _.contains(system.subsystems, this);
										}, this).length > 0 && _.filter(federate.systems, function(system) {
											return _.contains(system.subsystems, receiver);
										}, this).length > 0;
							}, this).length > 0
				}, this).length > 0 : true);
    };
    
    /**
     * Transmits data to a receiver.
     * @param {object} origLoc - The origin location.
     * @param {object} data - The data.
     * @param {object} destLoc - The destination location.
     * @param {object} receiver - The destination receiver.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this transceiver transmitted data.
     */
    Transceiver.prototype.transmit = function(origLoc, data, destLoc, receiver, context) {
        if(this.canTransmit(origLoc, data.size, destLoc, receiver, context) 
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
     * @param {object} origLoc - The origin location.
     * @param {object} transmitter - The origin transmitter.
     * @param {object} dataSize - The data size.
     * @param {object} destLoc - The destination location.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this transceiver can receive data.
     */
    Transceiver.prototype.canReceive = function(origLoc, transmitter, dataSize, destLoc, context) {
        return (this.received + dataSize <= this.maxReceived)
                && (this.protocol === transmitter.protocol)
				&& (this.protocol.match(/pSGL|pISL/) ? _.filter(context.federations, function(federation) {
					return _.filter(federation.federates, function(federate) {
								return _.filter(federate.systems, function(system) {
											return _.contains(system.subsystems, this);
										}, this).length > 0 && _.filter(federate.systems, function(system) {
											return _.contains(system.subsystems, transmitter);
										}, this).length > 0;
							}, this).length > 0
				}, this).length > 0 : true);
    };
    
    /**
     * Receives data from a transmitter.
     * @param {object} origLoc - The origin location.
     * @param {object} transmitter - The origin transmitter.
     * @param {object} data - The data.
     * @param {object} destLoc - The destination location.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this transceiver received data.
     */
    Transceiver.prototype.receive = function(origLoc, transmitter, data, destLoc, context) {
        if(this.canReceive(origLoc, transmitter, data.size, destLoc, context)) {
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