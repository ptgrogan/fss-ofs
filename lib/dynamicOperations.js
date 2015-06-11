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
 * A module to represent a dynamic operations model.
 * @module dynamicOperations
 */
define('dynamicOperations', function(require) {
    var _ = require("underscore");
    var Operations = require("operations");
    var lpsolve = require("lp_solve");
    
    function DynamicOperations() {
        // initialize superclass (assigns above attributes with arguments)
        Operations.apply(this, arguments);
    };
    
    DynamicOperations.prototype = new Operations();
    
    /**
     * Executes this dynamic operations model.
     * @param {object} controller - The controller.
     * @param {object} context - The context.
     */
    DynamicOperations.prototype.execute = function(controller, context) {
        this.operate(controller, context);
    };
	    
    /**
     * Gets the list of systems for this operations model.
     * @param {object} controller - The controller.
     * @returns {Array} The list of systems.
     */
	DynamicOperations.prototype.getSystems = function(controller){};
	
    /**
     * Gets the list of contracts for this operations model.
     * @param {object} controller - The controller.
     * @returns {Array} The list of contracts.
     */
	DynamicOperations.prototype.getContracts = function(controller){};
	
    /**
     * Gets the federate which owns a system.
     * @param {object} system - The system.
     * @param {object} controller - The controller.
     * @returns {object} The federate.
     */
	DynamicOperations.prototype.getSystemOwner = function(system, controller){};
	
    /**
     * Gets the federate which owns a contract.
     * @param {object} contract - The contract.
     * @param {object} controller - The controller.
     * @returns {object} The federate.
     */
	DynamicOperations.prototype.getContractOwner = function(contract, controller){};
	
    /**
     * Gets the federate which owns a demand.
     * @param {object} demand - The demand.
     * @param {object} controller - The controller.
     * @returns {object} The federate.
     */
	DynamicOperations.prototype.getDemandOwner = function(demand, controller){};
    
    /**
     * Operates this model.
     * @param {object} controller - The controller.
     * @param {object} context - The context.
     */
    DynamicOperations.prototype.operate = function(controller, context) {
        var planningHorizon = 6;
        var minTime = context.time;
        var maxTime = Math.min(context.maxTime, context.time + planningHorizon);
        
        var lp = new lpsolve.LinearProgram();
        lp.setOutputFile('');
        
        var C = []; // constraints
        var S = []; // S[i][j]: spacecraft i senses demand j
        var E_d = []; // E_d[t][i][j]: at time t spacecraft i holds data for demand j
        var E_c0 = []; // E_c0[i][j]: spacecraft i initially holds data for contract j
        var E_c = []; // E_c[t][i][j]: at time t spacecraft i holds data for contract j
        var T_d = []; // T_d[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for demand l
        var T_c = []; // T_c[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for contract l
        var L_d = []; // T_d[t][i][j][k][l]: at time t transmit data from spacecraft i to spacecraft j using protocol k for demand l
        var L_c = []; // T_c[t][i][j][k][l]: at time t transmit data from spacecraft i to spacecraft j using protocol k for contract l
        var R_d = []; // R_d[t][i][j]: at time t resolve data in system i for demand j
        var R_c = []; // R_c[t][i][j]: at time t resolve data in system i for contract j
       
        var J = new lpsolve.Row(); // objective function
        
        var demands = _.filter(context.currentEvents, function(event) {
            return event.isDemand();
        });
        var systems = this.getSystems(controller);
        var spacecrafts = _.filter(systems, function(system) {
            return system.isSpace();
        });
        var stations = _.filter(systems, function(system) {
            return system.isGround();
        });
        var contracts = _.clone(this.getContracts(controller));
        
        var SGLprotocols = ['pSGL','oSGL'];
        var ISLprotocols = ['pISL','oISL'];
        var phenomenas = ['VIS','SAR',undefined]
       
        _.each(spacecrafts, function(spacecraft, i) {
            S[i] = [];
            _.each(demands, function(demand, j) {
                // spacecraft i senses data for contract j
                S[i][j] = lp.addColumn(spacecraft.id + '-S-' + demand.id, true);
                
                // constrain sensing per spacecraft
                C.push({
                    row: new lpsolve.Row().Add(S[i][j], 1),
                    constraint: 'LE',
                    constant: (spacecraft.canSense(demand, context)?1:0), // FIXME
                    name: spacecraft.id + ' can sense ' + demand.id
                });
            }, this);
            _.each(phenomenas, function(phenomena) {
                var c = new lpsolve.Row();
                _.each(demands, function(demand, j) {
                    if(phenomena===undefined || demand.phenomena===phenomena) {
                        c.Add(S[i][j], demand.size);
                    }
                }, this);
                // constrain maximum data sensed per spacecraft
                C.push({
                    row: c, 
                    constraint: 'LE', 
                    constant: Math.min(spacecraft.getAvailableCapacity(phenomena), 
                            spacecraft.getMaxSensed(phenomena) 
                            - spacecraft.getSensed(phenomena)), 
                    name: spacecraft.id  + ' max sense ' + phenomena
                });
            }, this);
            E_c0[i] = [];
            _.each(contracts, function(contract, j) {
                E_c0[i][j] = _.reduce(spacecraft.subsystems, function(memo, subsystem) {
                    return memo ||  _.reduce(subsystem.contents, function(memo2, data) {
                        return memo2 || data.contract===contract.id; 
                    }, false, this);
                }, false, this)?1:0;
            }, this);
        }, this);
        
        _.each(_.range(minTime, maxTime, 1), function(time, t) {
            E_d[t] = [];
            E_c[t] = [];
            T_d[t] = [];
            T_c[t] = [];
            L_d[t] = [];
            L_c[t] = [];
            _.each(spacecrafts, function(spacecraft, i) {
                E_d[t][i] = [];
                E_c[t][i] = [];
                _.each(demands, function(demand, j) {
                    // spacecraft i holds data for new contract j
                    E_d[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + demand.id+"@"+time, true);
                    J.Add(E_d[t][i][j], -0.1);
                }, this);
                _.each(contracts, function(contract, j) {
                    // spacecraft i holds data for contract j
                    E_c[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + contract.demand.id+"@"+time, true);
                    J.Add(E_c[t][i][j], -0.1);
                }, this);
                _.each(phenomenas, function(phenomena) {
                    var c = new lpsolve.Row();
                    _.each(demands, function(demand, j) {
                        if(phenomena===undefined || demand.phenomena===phenomena) {
                            c.Add(E_d[t][i][j], demand.size);
                        }
                    }, this);
                    _.each(contracts, function(contract, j) {
                        if(phenomena===undefined || contract.demand.phenomena===phenomena) {
                            c.Add(E_c[t][i][j], contract.demand.size);
                        }
                    }, this);
                    // constrain maximum data stored in spacecraft i
                    C.push({
                        row: c, 
                        constraint: 'LE', 
                        constant: spacecraft.getMaxCapacity(phenomena), 
                        name: spacecraft.id  + ' max store ' + phenomena
                    });
                }, this);
                
                T_d[t][i] = [];
                T_c[t][i] = [];
                origLoc = context.propagate(context.getSystemLocation(spacecraft), time-context.time);
                _.each(stations, function(station, j) {
                    T_d[t][i][j] = [];
                    T_c[t][i][j] = [];
                    destLoc = context.propagate(context.getSystemLocation(station), time-context.time);
                    _.each(SGLprotocols, function(protocol, k) {
                        T_d[t][i][j][k] = [];
                        T_c[t][i][j][k] = [];
                        var c_tx = new lpsolve.Row();
                        _.each(demands, function(demand, l) {
                            // transmit from spacecraft i to ground station j using protocol k data for new contract l
                            T_d[t][i][j][k][l] = lp.addColumn(spacecraft.id + "-" + station.id + '-T' + '(' + protocol + ')-' + demand.id+"@"+time, true);
                            J.Add(T_d[t][i][j][k][l], -0.1);
                            c_tx.Add(T_d[t][i][j][k][l], demand.size);
                        
                            // constrain transmission by visibility
                            C.push({
                                row: new lpsolve.Row().Add(T_d[t][i][j][k][l], 1), 
                                constraint: 'LE', 
                                constant: (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, demand.size, 
                                        station, context) 
                                    && station.couldReceive(protocol, 
                                        origLoc, destLoc, spacecraft, 
                                        demand.size, context))?1:0,
                                    //&& t <= demand.getDefaultTime())?1:0,
                                name: spacecraft.id + '-' + station.id + ' visibility'
                            });
                        }, this);
                        _.each(contracts, function(contract, l) {
                            // transmit from spacecraft i to ground station j using protocol k data for contract l
                            T_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + station.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
                            J.Add(T_c[t][i][j][k][l], -0.1);
                            c_tx.Add(T_c[t][i][j][k][l], contract.demand.size);
                        
                            // constrain transmission by visibility and contract age
                            C.push({
                                row: new lpsolve.Row().Add(T_c[t][i][j][k][l], 1), 
                                constraint: 'LE', 
                                constant: (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, contract.demand.size, 
                                        station, context) 
                                    && station.couldReceive(protocol, 
                                        origLoc, destLoc, spacecraft, 
                                        contract.demand.size, context))?1:0,
                                    //&& t <= contract.getTimeToDefault())?1:0,
                                name: spacecraft.id + '-' + station.id + ' visibility'
                            });
                        }, this);
                        
                        // constrain maximum data transmitted from spacecraft i
                        C.push({
                            row: c_tx, 
                            constraint: 'LE', 
                            constant: spacecraft.getMaxTransmitted(protocol) - (time===minTime?spacecraft.getTransmitted(protocol):0), name: spacecraft.id + ' max transmit ' + protocol + ' at ' + time
                        });
                    }, this);
                }, this);
                L_d[t][i] = [];
                L_c[t][i] = [];
                _.each(spacecrafts, function(spacecraft2, j) {
                    L_d[t][i][j] = [];
                    L_c[t][i][j] = [];
                    destLoc = context.propagate(context.getSystemLocation(spacecraft2), time-context.time);
                    _.each(ISLprotocols, function(protocol, k) {
                        L_d[t][i][j][k] = [];
                        L_c[t][i][j][k] = [];
                        var c_tx = new lpsolve.Row();
                        _.each(demands, function(demand, l) {
                            // transmit from spacecraft i to spacecraft j using protocol k data for new contract l
                            L_d[t][i][j][k][l] = lp.addColumn(spacecraft.id + "-" + spacecraft2.id + '-T' + '(' + protocol + ')-' + demand.id+"@"+time, true);
                            J.Add(L_d[t][i][j][k][l], -0.1);
                            c_tx.Add(L_d[t][i][j][k][l], demand.size);
                        
                            // constrain transmission by visibility
                            C.push({
                                row: new lpsolve.Row().Add(L_d[t][i][j][k][l], 1), 
                                constraint: 'LE', 
                                constant: (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, demand.size, 
                                        spacecraft2, context) 
                                    && spacecraft2.couldReceive(protocol, 
                                        origLoc, destLoc, spacecraft, 
                                        demand.size, context))?1:0,
                                    //&& t <= demand.getDefaultTime())?1:0,
                                name: spacecraft.id + '-' + spacecraft2.id + ' visibility'
                            });
                        }, this);
                        _.each(contracts, function(contract, l) {
                            // transmit from spacecraft i to spacecraft j using protocol k data for contract l
                            L_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + spacecraft2.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
                            J.Add(L_c[t][i][j][k][l], -0.1);
                            c_tx.Add(L_c[t][i][j][k][l], contract.demand.size);
                        
                            // constrain transmission by visibility
                            C.push({
                                row: new lpsolve.Row().Add(L_c[t][i][j][k][l], 1), 
                                constraint: 'LE', 
                                constant: (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, contract.demand.size, 
                                        spacecraft2, context) 
                                    && spacecraft2.couldReceive(protocol, 
                                        origLoc, destLoc, spacecraft, 
                                        contract.demand.size, context))?1:0,
                                    //&& t <= contract.getTimeToDefault())?1:0,
                                name: spacecraft.id + '-' + spacecraft2.id + ' visibility'
                            });
                        }, this);
                        
                        // constrain maximum data transmitted from spacecraft i
                        C.push({
                            row: c_tx, 
                            constraint: 'LE', 
                            constant: spacecraft.getMaxTransmitted(protocol) - (time===minTime?spacecraft.getTransmitted(protocol):0), name: spacecraft.id + ' max transmit ' + protocol + ' at ' + time
                        });
                    }, this);
                }, this);
            }, this);
            
            _.each(stations, function(station, j) {
                _.each(SGLprotocols, function(protocol, k) {
                    var c_rx = new lpsolve.Row();
                    _.each(spacecrafts, function(spacecraft, i) {
                        _.each(demands, function(demand, l) {
                            c_rx.Add(T_d[t][i][j][k][l], demand.size);
                        }, this);
                        _.each(contracts, function(contract, l) {
                            c_rx.Add(T_c[t][i][j][k][l], contract.demand.size);
                        }, this);
                    }, this);
                    // constrain maximum data received by ground station j
                    C.push({
                        row: c_rx, 
                        constraint: 'LE', 
                        constant: station.getMaxReceived(protocol) - (time===minTime?station.getReceived(protocol):0), 
                        name: station.id + ' max receive ' + protocol + ' at ' + time
                    });
                }, this);
            }, this);
            
            _.each(spacecrafts, function(spacecraft2, j) {
                _.each(ISLprotocols, function(protocol, k) {
                    var c_rx = new lpsolve.Row();
                    _.each(spacecrafts, function(spacecraft, i) {
                        _.each(demands, function(demand, l) {
                            c_rx.Add(L_d[t][i][j][k][l], demand.size);
                        }, this);
                        _.each(contracts, function(contract, l) {
                            c_rx.Add(L_c[t][i][j][k][l], contract.demand.size);
                        }, this);
                    }, this);
                    // constrain maximum data received by spacecraft j
                    C.push({
                        row: c_rx, 
                        constraint: 'LE', 
                        constant: spacecraft2.getMaxReceived(protocol) - (time===minTime?spacecraft2.getReceived(protocol):0), 
                        name: spacecraft2.id + ' max receive ' + protocol + ' at ' + time
                    });
                }, this);
            }, this);
            
            R_d[t] = [];
            R_c[t] = [];
            _.each(systems, function(system, i) {
                R_d[t][i] = [];
                R_c[t][i] = [];
                _.each(demands, function(demand, j) {
                    // system i resolves data for new contract j
                    R_d[t][i][j] = lp.addColumn(system.id + "-R-" + demand.id+"@"+time);
                    if(system.isGround()) {
                        J.Add(R_d[t][i][j], demand.getValueAt(time-context.time));
                    } else {
                        J.Add(R_d[t][i][j], demand.defaultValue);
                    }
                }, this);
                _.each(contracts, function(contract, j) {
                    // system i resolves data for contract j
                    R_c[t][i][j] = lp.addColumn(system.id + "-R-" + contract.demand.id+"@"+time);
                    if(system.isGround()) {
                        J.Add(R_c[t][i][j], contract.demand.getValueAt(
                                contract.elapsedTime + time-context.time));
                    } else {
                        J.Add(R_c[t][i][j], contract.demand.defaultValue);
                    }
                }, this);
            }, this);
            
            _.each(spacecrafts, function(spacecraft, i) {
                var R_i = _.indexOf(systems, spacecraft);
                _.each(demands, function(demand, j) {
                    var c_nf = new lpsolve.Row();
                    if(time===minTime) {
                        c_nf.Add(S[i][j],1);
                    } else {
                        c_nf.Add(E_d[t-1][i][j],1);
                    }
                    c_nf.Add(E_d[t][i][j],-1).Add(R_d[t][R_i][j],-1);
                    _.each(stations, function(station, k) {
                       _.each(SGLprotocols, function(protocol, l) {
                            c_nf.Add(T_d[t][i][k][l][j],-1);
                       }, this);
                    }, this);
                    _.each(spacecrafts, function(spacecraft2, k) {
                       _.each(ISLprotocols, function(protocol, l) {
                            c_nf.Add(L_d[t][i][k][l][j],-1);
                            c_nf.Add(L_d[t][k][i][l][j],1);
                       }, this);
                    }, this);
                    // constrain net flow at each spacecraft
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: 0, 
                        name: spacecraft.id + ' net flow of ' + demand.id + ' at ' + time
                    });
                    if(time+1>=maxTime) {
                        // constrain boundary flow at each spacecraft
                        C.push({
                            row: new lpsolve.Row().Add(E_d[t][i][j],1), 
                            constraint: 'EQ', 
                            constant: 0, 
                            name: spacecraft.id + ' boundary flow of ' + demand.id
                        });
                    }
                }, this);
                _.each(contracts, function(contract, j) {
                    var c_nf = new lpsolve.Row();
                    if(time===minTime) {
                        // handle existing data as constant
                    } else {
                        c_nf.Add(E_c[t-1][i][j],1);
                    }
                    c_nf.Add(E_c[t][i][j],-1);
                    c_nf.Add(R_c[t][R_i][j],-1);
                    _.each(stations, function(station, k) {
                       _.each(SGLprotocols, function(protocol, l) {
                            c_nf.Add(T_c[t][i][k][l][j],-1);
                       }, this);
                    }, this);
                    _.each(spacecrafts, function(spacecraft2, k) {
                       _.each(ISLprotocols, function(protocol, l) {
                            c_nf.Add(L_c[t][i][k][l][j],-1);
                            c_nf.Add(L_c[t][k][i][l][j],1);
                       }, this);
                    }, this);
                    // constrain net flow at each spacecraft
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: -1*(time===minTime?E_c0[i][j]:0), 
                        name: spacecraft.id + ' net flow of ' + contract.demand.id + ' at ' + time
                    });
                    if(time+1>=maxTime) {
                        // constrain boundary flow at each spacecraft
                        C.push({
                            row: new lpsolve.Row().Add(E_c[t][i][j],1), 
                            constraint: 'EQ', 
                            constant: 0, 
                            name: spacecraft.id + ' boundary flow of ' + contract.demand.id
                        });
                    }
                }, this);
            }, this);
            _.each(stations, function(station, k) {
                var R_k = _.indexOf(systems, station);
                _.each(demands, function(demand, j) {
                    var c_nf = new lpsolve.Row();
                    c_nf.Add(R_d[t][R_k][j],-1);
                    _.each(spacecrafts, function(spacecraft, i) {
                        _.each(SGLprotocols, function(protocol, l) {
                            c_nf.Add(T_d[t][i][k][l][j],1);
                        }, this);
                    }, this);
                    // constrain net flow at each station
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: 0, 
                        name: station.id + ' net flow of ' + demand.id + ' at ' + time
                    });
                }, this);
                _.each(contracts, function(contract, j) {
                    var c_nf = new lpsolve.Row();
                    c_nf.Add(R_c[t][R_k][j],-1);
                    _.each(spacecrafts, function(spacecraft, i) {
                       _.each(SGLprotocols, function(protocol, l) {
                            c_nf.Add(T_c[t][i][k][l][j],1);
                       }, this);
                    }, this);
                    // constrain net flow at each station
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: 0, 
                        name: station.id + ' net flow of ' + contract.demand.id + ' at ' + time
                    });
                }, this);
            }, this);
        }, this);
        
        _.each(C, function(c) {
            lp.addConstraint(c.row, c.constraint, c.constant, c.name);
        }, this);
        
        // set objective function and solve linear program
        lp.setObjective(J, false);
        //console.log(lp.dumpProgram());
        
        lp.solve();
        
        /*
        console.log(_.map(_.flatten(S), function(val) { return lp.get(val); }))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(E_d[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(E_c[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(T_d[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(T_c[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(L_d[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(L_c[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(R_d[t]), function(val) { return lp.get(val); })}))
        console.log(_.map([0,1,2,3,4,5,6], function(t) { return _.map(_.flatten(R_c[t]), function(val) { return lp.get(val); })}))
        */
        
        // recursive function to transport data from contracts
        var transportContract = function(operations, spacecraft, contract, context) {
			var federate1 = operations.getSystemOwner(spacecraft, controller);
			var federate2 = operations.getContractOwner(contract, controller);
            var i = _.indexOf(spacecrafts, spacecraft);
            var j = _.indexOf(contracts, contract);
            if((data = federate1.getData(contract)) !== undefined) {
                _.each(stations, function(station, k) {
                    _.each(SGLprotocols, function(protocol, l) {
                        if(lp.get(T_c[0][i][k][l][j]) && federate1.canTransport(
                                data, protocol, spacecraft, station, context)) {
                            federate1.transport(data, protocol, 
                                    spacecraft, station, context);
                            federate2.resolveContract(contract, context);
                        }
                    }, this);
                }, this);
                _.each(spacecrafts, function(spacecraft2, k) {
                    _.each(ISLprotocols, function(protocol, l) {
                        if(lp.get(L_c[0][i][k][l][j]) && federate1.canTransport(
                                data, protocol, spacecraft, spacecraft2, context)) {
                            federate1.transport(data, protocol, 
                                    spacecraft, spacecraft2, context);
                            transportContract(operations, spacecraft2, contract, context);
                        }
                    }, this);
                }, this);
            }
        }
        
        // recursive function to transport data from demands
        var transportDemand = function(operations, spacecraft, demand, context) {
			var federate1 = operations.getSystemOwner(spacecraft, controller);
			var federate2 = operations.getDemandOwner(demand, controller);
            var i = _.indexOf(spacecrafts, spacecraft);
            var j = _.indexOf(demands, demand);
            if((contract = federate2.getContract(demand)) !== undefined
                    && (data = federate1.getData(contract)) !== undefined) {
                _.each(stations, function(station, k) {
                    _.each(SGLprotocols, function(protocol, l) {
                        if(lp.get(T_d[0][i][k][l][j]) && federate1.canTransport(
                                data, protocol, spacecraft, station, context)) {
                            federate1.transport(data, protocol, 
                                    spacecraft, station, context);
                            federate2.resolveContract(contract, context);
                        }
                    }, this);
                }, this);
                _.each(spacecrafts, function(spacecraft2, k) {
                    _.each(ISLprotocols, function(protocol, l) {
                        if(lp.get(L_d[0][i][k][l][j]) && federate1.canTransport(
                                data, protocol, spacecraft, spacecraft2, context)) {
                            federate1.transport(data, protocol, 
                                    spacecraft, spacecraft2, context);
                            transportDemand(operations, spacecraft2, demand, context);
                        }
                    }, this);
                }, this);
            }
        }
        
        _.each(systems, function(system, i) {
            if(system.isSpace()) {
                _.each(contracts, function(contract, j) {
                    if(lp.get(R_c[0][i][j])) {
						this.getContractOwner(contract).defaultContract(contract, context);
                    }
                }, this);
            }
        }, this);
        
        _.each(spacecrafts, function(spacecraft, i) {
            _.each(contracts, function(contract, j) {
                transportContract(this, spacecraft, contract, context);
            }, this);
        }, this);
        
        _.each(spacecrafts, function(spacecraft, i) {
			var federate = this.getSystemOwner(spacecraft, controller);
            _.each(demands, function(demand, j) {
                if(lp.get(S[i][j])) {
                    federate.sense(federate.contract(demand, context), 
                            spacecraft, context);
                }
            }, this);
        }, this);
        
        _.each(spacecrafts, function(spacecraft, i) {
            _.each(demands, function(demand, j) {
                transportDemand(this, spacecraft, demand, context);
            }, this);
        }, this);
    };
    
    return DynamicOperations;
});