
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
    var Storage = require("storage");
    var Data = require("data");
    
    function Sensor() {
        this.phenomena = "unknown";
        this.capacity = 0;
        this.maxSensed = 0;
        this.sensed = 0;
        
        Storage.apply(this, arguments);
    };
    
    Sensor.prototype = new Storage();
    
    Sensor.prototype.canTransferIn = function(origin, data) {
        return Subsystem.prototype.canTransferIn.apply(this, arguments)
                && this.getContentsSize() + data.size <= this.capacity;
    };
        
    Sensor.prototype.canSense = function(system, demand, context) {
        var location = context.getSystemLocation(system);
        
        // check for compatible location
        // check for compatible phenomena type
        // check contents capacity will not exceed maximum
        // check sensing capacity will not exceed maximum
        return ((location.altitude === "LEO" && location.sector === demand.sector)
                || (location.altitude === "MEO" && location.sector === demand.sector))
                && this.phenomena === demand.phenomena
                && this.getContentsSize() + demand.size <= this.capacity 
                && this.sensed + demand.size <= this.maxSensed;
    };
    
    Sensor.prototype.sense = function(system, contract, context) {
        if(this.canSense(system, contract.demand, context)) {
            var data = new Data({
                phenomena: contract.demand.phenomena, 
                size: contract.demand.size, 
                contract: contract.id
            });
            this.contents.push(data);
            this.sensed += data.size;
            return true;
        }
        return false;
    };
    
    Sensor.prototype.isSensor = function() {
        return true;
    };
        
    Sensor.prototype.init = function(sim) {
        Storage.prototype.init.apply(this, arguments);
        this.sensed = 0;
    };
    
    Sensor.prototype.tick = function(sim) { 
        Storage.prototype.tick.apply(this, arguments);
    };
    
    Sensor.prototype.tock = function() {
        Storage.prototype.tock.apply(this, arguments);
        this.sensed = 0;
    };

    return Sensor;
});