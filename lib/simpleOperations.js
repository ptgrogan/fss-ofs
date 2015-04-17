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
 * A module to represent a simple operations model.
 * @module simpleOperations
 */
define('simpleOperations', function(require) {
    var _ = require("underscore");
    var Operations = require("operations");
    
    function SimpleOperations() {
        // initialize superclass (assigns above attributes with arguments)
        Operations.apply(this, arguments);
    };
    
    SimpleOperations.prototype = new Operations();
    
    /**
     * Executes this simple operations model.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    SimpleOperations.prototype.execute = function(federate, context) {
        this.decommissionSystems(federate, context);
        this.contractAndSense(federate, context);
        this.downlinkData(federate, context);
        this.contractAndSense(federate, context);
    }
    
    /**
     * Decommissions any non-operational spacecraft for the federate.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    SimpleOperations.prototype.decommissionSystems = function(federate, context) {
        _.each(_.filter(federate.systems, function(system) { 
            return system.isSpace() && !system.isOperational(); 
        }), function(spacecraft) {
            federate.decommission(spacecraft, context);
            this.defaultContracts(federate, context);
        }, this);
    }
    
    /**
     * Defaults on any expired or non-completable contracts for the federate.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    SimpleOperations.prototype.defaultContracts = function(federate, context) {
        _.each(_.filter(federate.contracts, function(contract) { 
            return contract.isDefaulted(context); 
        }), function(contract) {
            federate.defaultContract(contract, context);
        }, this);
    }
    
    /**
     * Contracts and senses any available demands for the federate.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    SimpleOperations.prototype.contractAndSense = function(federate, context) {
        _.each(_.filter(federate.systems, function(system) { 
            return system.isSpace(); 
        }), function(spacecraft) {
            _.each(_.filter(context.currentEvents, function(event) {
                return event.sector === context.getSystemLocation(spacecraft).sector
                        && spacecraft.canSense(event, context);
            }), function(event) {
                if(contract = federate.contract(event, context)) {
                    federate.sense(contract, spacecraft, context);
                }
            }, this);
        }, this);
    };
    
    /**
     * Downlinks any available data for the federate.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    SimpleOperations.prototype.downlinkData = function(federate, context) {
        _.each(_.filter(federate.systems, function(origin) { 
            return origin.isSpace(); 
        }), function(origin) {
            _.each(_.filter(origin.subsystems, function(subsystem) { 
                    return subsystem.isSensor(); 
            }), function(sensor) {
                _.each(sensor.contents, function(data) {
                    _.each(_.filter(federate.systems, function(destination) {
                        return destination.isGround() 
                                && origin.canTransmit(data, destination, context) 
                                && destination.canReceive(origin, data, context);
                    }), function(destination) {
                        origin.transmit(data, destination, context);
                        destination.receive(origin, data, context);
                        federate.resolveContract(_.findWhere(federate.contracts, 
                                {id: data.contract}), context);
                    }, this);
                }, this);
            }, this);
        }, this);
    };
    
    return SimpleOperations;
});