
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
 * A module to represent a space-to-ground link subsystem.
 * @module spaceGroundLink
 */
define('spaceGroundLink', function(require) {
    var Transceiver = require("transceiver");
    
    /** 
     * @constructor
     * @alias module:spaceGroundLink
     */
    function SpaceGroundLink() {
        // initialize superclass (assigns above attributes with arguments)
        Transceiver.apply(this, arguments);
    };
    
    SpaceGroundLink.prototype = new Transceiver();
    
    /**
     * Checks if this SGL can receive data from a transmitter.
     * @param {object} origin - The data origin.
     * @param {object} transmitter - The origin transmitter.
     * @param {object} data - The data.
     * @param {object} destination - The data destination.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this transceiver can receive data.
     */
    SpaceGroundLink.prototype.canReceive = function(origin, transmitter, data, destination, context) {
        var origLoc = context.getSystemLocation(origin);
        var destLoc = context.getSystemLocation(destination);
        
        return Transceiver.prototype.canReceive.apply(this, arguments)
                && origLoc.isOrbit() && destLoc.isSurface()
                && (origLoc.sector === destLoc.sector)
                && (this.protocol === transmitter.protocol);
    };
    
    /**
     * Checks if this SGL can transmit data to a receiver.
     * @param {object} origin - The data origin.
     * @param {object} data - The data.
     * @param {object} destination - The data destination.
     * @param {object} receiver - The destination receiver.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this transceiver can transmit data.
     */
    SpaceGroundLink.prototype.canTransmit = function(origin, data, destination, receiver, context) {
        var origLoc = context.getSystemLocation(origin);
        var destLoc = context.getSystemLocation(destination);
        
        return Transceiver.prototype.canTransmit.apply(this, arguments)
                && origLoc.isOrbit() && destLoc.isSurface()
                && (origLoc.sector === destLoc.sector)
                && (this.protocol === receiver.protocol);
    };
    
    /**
     * Checks if this is an space-to-ground link subsystem.
     * @returns {Boolean} True, if this is a space-to-ground link.
     */
    SpaceGroundLink.prototype.isSGL = function() {
        return true;
    };
    
    return SpaceGroundLink;
});