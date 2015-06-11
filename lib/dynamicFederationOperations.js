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
 * A module to represent a dynamic federation operations model.
 * @module dynamicFederateOperations
 */
define('dynamicFederationOperations', function(require) {
    var _ = require("underscore");
    var DynamicOperations = require("dynamicOperations");
    var lpsolve = require("lp_solve");
    
    function DynamicFederationOperations() {
        // initialize superclass (assigns above attributes with arguments)
        DynamicOperations.apply(this, arguments);
    };
    
    DynamicFederationOperations.prototype = new DynamicOperations();
	    
    /**
     * Gets the list of systems for this operations model.
     * @param {object} federation - The federation.
     * @returns {Array} The list of systems.
     */
	DynamicFederationOperations.prototype.getSystems = function(federation) {
		return _.filter(_.flatten(_.map(federation.federates, function(federate) {
			return federate.systems;
		})), function(system) {
            return system.isCommissioned();
        });
	};
	
    /**
     * Gets the list of contracts for this operations model.
     * @param {object} federation - The federation.
     * @returns {Array} The list of contracts.
     */
	DynamicFederationOperations.prototype.getContracts = function(federation) {
		return _.flatten(_.map(federation.federates, function(federate) {
			return federate.contracts;
		}));
	};
	
    /**
     * Gets the federate which owns a system.
     * @param {object} system - The system.
     * @param {object} federation - The federation.
     * @returns {object} The federate.
     */
	DynamicFederationOperations.prototype.getSystemOwner = function(system, federation) {
		return _.reduce(federation.federates, function(memo, federate) {
			if(_.contains(federate.systems, system)) {
				return federate;
			} else {
				return memo;
			}
		});
	};
	
    /**
     * Gets the federate which owns a contract.
     * @param {object} contract - The contract.
     * @param {object} federation - The federation.
     * @returns {object} The federate.
     */
	DynamicFederationOperations.prototype.getContractOwner = function(contract, federation) {
		return _.reduce(federation.federates, function(memo, federate) {
			if(_.contains(federate.contracts, contract)) {
				return federate;
			} else {
				return memo;
			}
		});
	};
	
    /**
     * Gets the federate which owns a demand.
     * @param {object} demand - The demand.
     * @param {object} federation - The federation.
     * @returns {object} The federate.
     */
	DynamicFederationOperations.prototype.getDemandOwner = function(demand, federation) {
		return _.reduce(federation.federates, function(memo, federate) {
			if(_.reduce(federate.contracts, 
					function(memo, contract) {
						return memo || contract.demand === demand;
					}, false)) {
				return federate;
			} else {
				return memo;
			}
		});
	};
    
    return DynamicFederationOperations;
});