
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

define(function(require) {
    var Transceiver = require("transceiver");
    
    function SpaceGroundLink() {
        Transceiver.apply(this, arguments);
    };
    
    SpaceGroundLink.prototype = new Transceiver();
    
    SpaceGroundLink.prototype.canReceive = function(origin, transmitter, data, destination, context) {
        var origLoc = context.getSystemLocation(origin);
        var destLoc = context.getSystemLocation(destination);
        
        return Transceiver.prototype.canReceive.apply(this, arguments)
                && origLoc.isOrbit() && destLoc.isSurface()
                && (origLoc.sector === destLoc.sector)
                && (this.protocol === transmitter.protocol);
    };
    
    SpaceGroundLink.prototype.canTransmit = function(origin, data, destination, receiver, context) {
        var origLoc = context.getSystemLocation(origin);
        var destLoc = context.getSystemLocation(destination);
        
        return Transceiver.prototype.canTransmit.apply(this, arguments)
                && origLoc.isOrbit() && destLoc.isSurface()
                && (origLoc.sector === destLoc.sector)
                && (this.protocol === receiver.protocol);
    };
    
    SpaceGroundLink.prototype.isSGL = function() {
        return true;
    };
    
    return SpaceGroundLink;
});