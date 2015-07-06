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
 * A module to represent a spacecraft system.
 * @module system
 */
define('spacecraft', function(require) {
    var System = require('system');
    var _ = require('underscore');
    var logger = require("logger");
    
    /** 
     * @constructor
     * @alias module:spacecraft
     */
    function Spacecraft() {
        // initialize superclass (assigns above attributes with arguments)
        System.apply(this, arguments);
    };
    
    Spacecraft.prototype = new System();
    
    /**
     * Checks if this system can be commissioned.
     * @param {object} location - The location at which to commission.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system can be commissioned.
     */
    Spacecraft.prototype.canCommission = function(location, context) {
        return !location.isSurface();
    }
    
    /**
     * Checks if this system is operational. Must have at least 1 ISL 
     * or at least 1 SGL and 1 sensor.
     * @returns {Boolean} True, if this system is operational.
     */
    Spacecraft.prototype.isOperational = function() {
        var numSGL = 0;
        var numISL = 0;
        var numSensor = 0;
        for(var i = 0; i < this.subsystems.length; i++) {
            if(this.subsystems[i].isSGL()) {
                numSGL++;
            }
            if(this.subsystems[i].isISL()) {
                numISL++;
            }
            if(this.subsystems[i].isSensor()) {
                numSensor++;
            }
        }
        return (numISL > 0) || (numSGL > 0 && numSensor > 0);
    }
    
    /**
     * Gets the commission cost for this system.
     * @returns {Number} The commission cost of this system.
     */
    Spacecraft.prototype.getCommissionCost = function(location, context) {
        if(!location || location.isSurface()) {
            return 0;
        } else if(location.altitude==="LEO") {
            return 0;
        } else if(location.altitude==="MEO") {
            return 0.5*this.cost;
        } else if(location.altitude==="GEO") {
            return 1.0*this.cost;
        } else {
            return 0;
        }
    };
    
    /**
     * Gets the decommission value for this system.
     * @returns {Number} The decommission value of this system.
     */
    Spacecraft.prototype.getDecommissionValue = function(context) {
        var location = context.getSystemLocation(this);
        if(!this.isCommissioned() || location.isSurface()) {
            return this.getDesignCost();
        } if(location.altitude==="LEO") {
            return 0.5*this.getDesignCost();
        } else if(location.altitude==="MEO") {
            return 0.5*this.getDesignCost();
        } else if(location.altitude==="GEO") {
            return 0.5*this.getDesignCost();
        } else {
            return 0;
        }
    };
    
    /**
     * Gets the amount of data sensed this turn by this spacecraft.
     * @param {String} phenomena - The phenomena of data (optional).
     * @returns {Number} The amount of data sensed this turn.
     */
    Spacecraft.prototype.getSensed = function(phenomena) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isSensor() && 
					(phenomena===undefined 
						|| subsystem.phenomena===phenomena);
        }), function(memo, sensor) {
            return memo + sensor.sensed;
        }, 0, this);
    }
    
    /**
     * Gets the maximum amount of data this spacecraft can sense.
     * @param {String} phenomena - The phenomena of data.
     * @returns {Number} The maximum amount of data sensed in one turn.
     */
    Spacecraft.prototype.getMaxSensed = function(phenomena) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isSensor() && 
					(phenomena===undefined 
						|| subsystem.phenomena===phenomena);
        }), function(memo, sensor) {
            return memo + sensor.maxSensed;
        }, 0, this);
    };
    
    /**
     * Checks if this spacecraft could sense data to meet a demand.
     * @param {String} phenomena - The data phenomena.
     * @param {Number} dataSize - The data size.
     * @returns {Boolean} True, if this system could sense data.
     */
    Spacecraft.prototype.couldSense = function(phenomena, dataSize) {
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
			return _.some(_.filter(this.subsystems, function(subsystem) {
					return subsystem.isSensor();
				}), function(sensor) {
					return sensor.couldSense(phenomena, dataSize);
				}, this);
        }
        return false;
    };
    
    /**
     * Checks if this spacecraft can sense data to meet a demand.
     * @returns {Boolean} True, if this system can sense data.
     */
    Spacecraft.prototype.canSense = function(demand, context) {
        var location = context.getSystemLocation(this);
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
			return _.some(_.filter(this.subsystems, function(subsystem) {
					return subsystem.isSensor();
				}), function(sensor) {
					return sensor.canSense(this, demand, context) 
							&& this.getMaxCapacity(demand.phenomena) 
								- this.getUsedCapacity(demand.phenomena) >= demand.size;
				}, this);
        }
        return false;
    };
    
    /**
     * Senses data to meet a demand.
     * @returns {Boolean} True, if this system sensed data.
     */
    Spacecraft.prototype.sense = function(contract, context) {
        if(this.canSense(contract.demand, context)) {
            if(_.some(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isSensor() 
					&& subsystem.canSense(this, contract.demand, context);
            }, this), function(sensor) {
                if(!sensor.canTransferIn(contract.demand.getData())) {
                    _.each(sensor.contents, function(data) {
                        _.each(_.filter(this.subsystems, function(subsystem) {
                            return subsystem.isStorage() && subsystem !== sensor;
                        }), function(storage) {
                            if(this.canTransfer(sensor, data, storage)) {
                                this.transfer(sensor, data, storage);
                            }
                        }, this);
                    }, this);
                }
                return sensor.sense(this, contract, context);
            }, this)) {
                logger.verbose(this.getTag() + " sensed data for " + contract.demand.id);
                return true;
            }
        }
        return false;
    };
    
    /**
     * Ticks this spacecraft to pre-compute state changes.
     * @param {object} sim - The simulator.
     */
    Spacecraft.prototype.tick = function(sim) {
        System.prototype.tick.apply(this, arguments);
        this.nextLocation = sim.entity('context').propagate(
                sim.entity('context').getSystemLocation(this), 
                sim.timeStep).id;
    };
    
    /**
     * Tocks this spacecraft to commit state changes.
     */
    Spacecraft.prototype.tock = function() {
        System.prototype.tock.apply(this, arguments);
        this.location = this.nextLocation;
    };
    
    /**
     * Checks if is a space system.
     * @returns {Boolean} True, if this is a space system.
     */
    Spacecraft.prototype.isSpace = function() {
        return true;
    }
    
    return Spacecraft;
});