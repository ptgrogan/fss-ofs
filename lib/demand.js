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
 * A module to represent a demand for data collection and down-link.
 * @module demand
 */
define('demand', function(require) {
    var Event = require("event");
    var Data = require("data");
    var _ = require('underscore');
    
    /** 
     * @constructor
     * @alias module:demand
     */
    function Demand() {
        this.phenomena = 'unknown';
        this.size = 0; // number of data bits
        this.valueSchedule = [[0, 0]]; // array of time-value tuples
        this.defaultValue = 0; // value of defaulted contract (<=0)
        
        // initialize superclass (assigns above attributes with arguments)
        Event.apply(this, arguments);
    };
    
    Demand.prototype = new Event();
    
    /**
     * Checks if this is a demand event.
     * @returns {Boolean} True, if this is a demand.
     */
    Demand.prototype.isDemand = function() {
        return true;
    };
    
    /**
     * Gets the value of this demand if resolved in a specified time.
     * @param {Number} time - The specified time.
     * @returns {Number} The current value.
     */
    Demand.prototype.getValueAt = function(time) {
        for(var i = 0; i < this.valueSchedule.length; i++) {
            // return schedule value if time is below deadline
            if(time <= this.valueSchedule[i][0]) {
                return this.valueSchedule[i][1];
            }
        }
        // return default value if past last value deadline
        return this.defaultValue;
    }
    
    /**
     * Gets the time when this demand is defaulted.
     * @returns {Number} The default time.
     */
    Demand.prototype.getDefaultTime = function() {
        return _.max(_.map(this.valueSchedule, function(v) { return v[0]; }));
    }
    
    /**
     * Gets data for this demand.
     * @returns {object} The data.
     */
    Demand.prototype.getData = function() {
        return new Data({phenomena: this.phenomena, size: this.size});
    };
    
    return Demand;
});