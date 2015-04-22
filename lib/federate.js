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
 * A module to represent a federate.
 * @module federate
 */
define('federate', function(require) {
    var _ = require("underscore");
    var mas = require("mas");
    var logger = require("logger");
    var Operations = require("operations");
    var Contract = require("contract");
    
    /** 
     * @constructor
     * @alias module:federate
     */
    function Federate() {
        this.cash = 0;
        this.initialCash = 0;
        this.systems = [];
        this.contracts = [];
        this.operations = new Operations();
        
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    Federate.prototype = new mas.sim.Entity();
    
    /**
     * Design a system for this federate.
     * @param {object} system - The system.
     * @returns {Boolean} True, if this federate designed the system.
     */
    Federate.prototype.design = function(system) {
        if(system.getContentsSize() > system.maxSize) {
            logger.error('System contents exceeds capacity.');
        } else if(system.getDesignCost() > this.cash) {
            logger.error('System design cost exceeds cash.');
        } else {
            this.systems.push(system);
            this.cash -= system.getDesignCost();
            logger.info(this.id + " designed " + system.type + " for " + system.getDesignCost());
            return true;
        }
        return false;
    };
    
    /**
     * Commission a system for this federate.
     * @param {object} system - The system.
     * @param {object} location - The location to commission the system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate commissioned the system.
     */
    Federate.prototype.commission = function(system, location, context) {
        if(system.getCommissionCost(location) > this.cash) {
            logger.error('System commission cost exceeds cash.');
        } else if(system.commission(location, context)) {
            this.cash -= system.getCommissionCost(location);
            logger.info(this.id + " commissioned " + system.getTag() + " for " + system.getCommissionCost(location));
            return true;
        } else {
            logger.error("Could not commission " + system.getTag() + " at " + location.id);
        }
        return false;
    };
    
    /**
     * Decommission a system for this federate.
     * @param {object} system - The system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate decommissioned the system.
     */
    Federate.prototype.decommission = function(system, context) {
        var index = this.systems.indexOf(system);
        if(index > -1) {
            this.cash += system.getDecommissionValue(context);
            this.systems.splice(index, 1);
            logger.info(this.id + " decommissioned " + system.getTag() + " for " + system.getDecommissionValue(context));
            return true;
        } else {
            return false;
        }
    };
    
    /**
     * Liquidate all assets for this federate.
     * @param {object} context - The context.
     */
    Federate.prototype.liquidate = function(context) {
        if(this.systems.length > 0) {
            while(this.decommission(this.systems[0], context));
        }
    };
    
    /**
     * Contracts a demand for this federate.
     * @param {object} demand - The demand.
     * @param {object} context - The context.
     * @returns {object} The contract if this federate contracted the demand, 
     *                   `undefined` otherwise.
     */
    Federate.prototype.contract = function(demand, context) {
        var index = context.currentEvents.indexOf(demand);
        if(index > -1) {
            context.currentEvents.splice(index, 1);
            var contract = new Contract({demand: demand});
            this.contracts.push(contract);
            logger.info(this.id + " contracted for " + contract.demand.type);
            return contract;
        }
    };
    
    /**
     * Checks if this federate can sense data for a demand using a system.
     * @param {object} demand - The demand.
     * @param {object} system - The system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate can sense for the contract.
     */
    Federate.prototype.canSense = function(demand, system, context) {
        if(this.systems.indexOf(system) < 0) {
            logger.error("Federate does not control system.");
        } else if(context.events.indexOf(demand) < 0 
            && _.findWhere(this.contracts, {demand: demand}) === undefined) {
            logger.error("Demand cannot be sensed by federate.");
        } else {
            return system.canSense(demand, context);
        }
        return false;
    }
    
    /**
     * Senses data for a contract using a system.
     * @param {object} contract - The contract.
     * @param {object} system - The system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate sensed data for the contract.
     */
    Federate.prototype.sense = function(contract, system, context) {
        if(this.contracts.indexOf(contract) < 0) {
            logger.error("Federate does not own contract.");
        } else if(this.canSense(contract.demand, system, context)
                && system.sense(contract, context)) {
            logger.info(this.id + " sensed data for " + contract.demand.type + " contract using " + system.getTag());
            return true;
        } else {
            logger.error("Could not sense data for " + contract.demand.type + " using " + system.getTag());
        }
        return false;
    };
    
    /**
     * Checks if this federate can transport data from an origin to destination system.
     * @param {object} data - The data.
     * @param {object} protocol - The protocol (optional with `undefined`).
     * @param {object} origin - The origin system.
     * @param {object} destination - The destination system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate can sense for the contract.
     */
    Federate.prototype.canTransport = function(data, protocol, origin, destination, context) {
        return origin.canTransmit(protocol, data, destination, context)
                && destination.canReceive(protocol, origin, data, context);
    }
    
    /**
     * Transports data from an origin to destination system.
     * @param {object} data - The data.
     * @param {object} protocol - The protocol (optional with `undefined`).
     * @param {object} origin - The origin system.
     * @param {object} destination - The destination system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate transported data.
     */
    Federate.prototype.transport = function(data, protocol, origin, destination, context) {
        if(!origin.transmit(protocol, data, destination, context)) {
            logger.error(origin.getTag() + " could not transmit data to " 
                    + destination.getTag() + " with " + protocol);
        } else if(!destination.receive(protocol, origin, data, context)) {
            logger.error(destination.getTag() + " could not receive data from " + origin.getTag() + " with " + protocol);
        } else {
            logger.info(this.id + " transported data from " + origin.getTag() + " to " + destination.getTag() + " with " + protocol);
            return true;
        }
        return false;
    }
    
    /**
     * Defaults on a contract.
     * @param {object} contract - The contract.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate defaulted on the contract.
     */
    Federate.prototype.defaultContract = function(contract, context) {
        var index = this.contracts.indexOf(contract);
        if(index > -1) {
            this.cash += contract.demand.defaultValue;
            this.deleteData(contract, context);
            this.contracts.splice(index, 1);
            logger.info(this.id + " defaulted on " + contract.demand.type + " contract for " + contract.demand.defaultValue);
            if(this.cash < 0) {
                this.liquidate(context);
            }
            return true;
        }
        return false;
    };
    
    /**
     * Deletes data for a contract.
     * @param {object} contract - The contract.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate deleted the data.
     */
    Federate.prototype.deleteData = function(contract, context) {
        _.each(this.subsystems, function(subsystem) {
            _.each(_filter(subsystem.contents, function(data) {
                return data.contract===contract.id;
            }), function(data) {
                subsystem.contents.splice(subsystem.contents.indexOf(data), 1);
            }, this);
        }, this);
    }
    
    /**
     * Resolves a contract.
     * @param {object} contract - The contract.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this federate resolved the contract.
     */
    Federate.prototype.resolveContract = function(contract, context) {
        var index = this.contracts.indexOf(contract);
        if(index > -1 && contract.isCompleted(context)) {
            this.cash += contract.getValue();
            this.deleteData(contract, context);
            this.contracts.splice(index, 1);
            logger.info(this.id + " completed " + contract.demand.type + " contract for " + contract.getValue());
            return true;
        }
        return false;
    };
    
    /**
     * Initializes this federate.
     * @param {object} sim - The simulator.
     */
    Federate.prototype.init = function(sim) {
        this.cash = this.initialCash;
        for(var i = 0; i < this.systems.length; i++) {
            this.systems[i].init(sim);
        }
    };
    
    /**
     * Ticks this federate to pre-compute state changes.
     * @param {object} sim - The simulator.
     */
    Federate.prototype.tick = function(sim) {
        for(var i = 0; i < this.systems.length; i++) {
            this.systems[i].tick(sim);
        }
        for(var i = 0; i < this.contracts.length; i++) {
            this.contracts[i].tick(sim);
        }
    };
    
    /**
     * Tocks this federate to commit state changes.
     * @param {object} sim - The simulator.
     */
    Federate.prototype.tock = function() {
        for(var i = 0; i < this.systems.length; i++) {
            this.systems[i].tock();
        }
        for(var i = 0; i < this.contracts.length; i++) {
            this.contracts[i].tock();
        }
    };
    
    /**
     * Gets the data for a contract.
     * @param {object} contract - The contract.
     * @returns {object} The subsystem, or `undefined` if not found.
     */
    Federate.prototype.getData = function(contract) {
        return _.reduce(this.systems, function(memo, system) {
            return (memo===undefined)?_.reduce(system.subsystems, function(memo2, subsystem) {
                return (memo2===undefined)?_.findWhere(subsystem.contents, 
                        {contract: contract.id}):memo2;
            }, undefined, this):memo;
        }, undefined, this);
    }
    
    /**
     * Gets the contract for a demand.
     * @param {object} demand - The demand.
     * @returns {object} The contract, or `undefined` if not found.
     */
    Federate.prototype.getContract = function(demand) {
        return _.findWhere(this.contracts, {demand: demand});
    }
    
    return Federate;
});