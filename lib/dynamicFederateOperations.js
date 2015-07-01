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
 * A module to represent a dynamic federate operations model.
 * @module dynamicFederateOperations
 */
define('dynamicFederateOperations', function(require) {
    var _ = require("underscore");
    var DynamicOperations = require("dynamicOperations");
    var lpsolve = require("lp_solve");
    
    function DynamicFederateOperations() {
        // initialize superclass (assigns above attributes with arguments)
        DynamicOperations.apply(this, arguments);
    };
    
    DynamicFederateOperations.prototype = new DynamicOperations();
    
    /**
     * Executes this dynamic federate operations model.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    DynamicFederateOperations.prototype.execute = function(federate, context) {
        this.decommissionSystems(federate, context);
		DynamicOperations.prototype.execute.apply(this, arguments);
    };
    
    /**
     * Decommissions any non-operational spacecraft for the federate.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    DynamicFederateOperations.prototype.decommissionSystems = function(federate, context) {
        _.each(_.filter(federate.systems, function(system) { 
            return system.isSpace() && !system.isOperational(); 
        }), function(spacecraft) {
            federate.decommission(spacecraft, context);
            this.defaultContracts(federate, context);
        }, this);
    };
    
    /**
     * Defaults on any expired or non-completable contracts for the federate.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    DynamicFederateOperations.prototype.defaultContracts = function(federate, context) {
        _.each(_.filter(federate.contracts, function(contract) { 
            return contract.isDefaulted(context); 
        }), function(contract) {
            federate.defaultContract(contract, context);
        }, this);
    }
	    
    /**
     * Gets the list of systems for this operations model.
     * @param {object} federate - The federate.
     * @returns {Array} The list of systems.
     */
	DynamicFederateOperations.prototype.getSystems = function(federate) {
		return _.filter(federate.systems, function(system) {
			return system.isCommissioned();
		});
	};
	
    /**
     * Gets the list of federates for this operations model.
     * @param {object} federate - The federate.
     * @returns {Array} The list of federates.
     */
	DynamicFederateOperations.prototype.getFederates = function(federate) {
		return [federate];
	};
	
    /**
     * Gets the list of contracts for this operations model.
     * @param {object} federate - The federate.
     * @returns {Array} The list of contracts.
     */
	DynamicFederateOperations.prototype.getContracts = function(federate) {
		return _.clone(federate.contracts);
	};
	
    /**
     * Gets the federate which owns a system.
     * @param {object} system - The system.
     * @param {object} federate - The federate.
     * @returns {object} The federate.
     */
	DynamicFederateOperations.prototype.getSystemOwner = function(system, federate) {
		return federate;
	};
	
    /**
     * Gets the federate which owns a contract.
     * @param {object} contract - The contract.
     * @param {object} federate - The federate.
     * @returns {object} The federate.
     */
	DynamicFederateOperations.prototype.getContractOwner = function(contract, federate) {
		return federate;
	};
	
    /**
     * Gets the federate which owns a demand.
     * @param {object} demand - The demand.
     * @param {object} controller - The controller.
     * @returns {object} The federate.
     */
	DynamicFederateOperations.prototype.getDemandOwner = function(demand, federate) {
		return federate;
	};
    
    return DynamicFederateOperations;
});