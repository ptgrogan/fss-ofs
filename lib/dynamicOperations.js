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
    var SimpleOperations = require("simpleOperations");
    var lpsolve = require("lp_solve");
    
    function DynamicOperations() {
        // initialize superclass (assigns above attributes with arguments)
        SimpleOperations.apply(this, arguments);
    };
    
    DynamicOperations.prototype = new SimpleOperations();
    
    /**
     * Executes this simple operations model.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    DynamicOperations.prototype.execute = function(federate, context) {
        this.decommissionSystems(federate, context);
        this.operate(federate, context);
    }
    
    DynamicOperations.prototype.operate = function(federate, context) {
        var planningHorizon = 6;
        var minTime = context.time;
        var maxTime = Math.min(context.maxTime, context.time + planningHorizon);
        
        var lp = new lpsolve.LinearProgram();
        lp.setOutputFile('lp-out.txt');
        
        var S = []; // S[i][j]: spacecraft i senses demand j
        var C = []; // constraints
        var E_d = []; // E_d[t][i][j]: at time t spacecraft i holds data for demand j
        var E_c0 = []; // E_c0[i][j]: spacecraft i initially holds data for contract j
        var E_c = []; // E_c[t][i][j]: at time t spacecraft i holds data for contract j
        var T_d = []; // T_d[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for demand l
        var T_c = []; // T_c[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for contract l
        var R_d = []; // R_d[t][i][j]: at time t resolve data in system i for demand j
        var R_c = []; // R_c[t][i][j]: at time t resolve data in system i for contract j
       
        var J = new lpsolve.Row(); // objective function
        
        var demands = _.filter(context.currentEvents, function(event) {
            return event.isDemand();
        });
        var systems = _.filter(federate.systems, function(system) {
            return system.isCommissioned();
        });
        var spacecrafts = _.filter(systems, function(system) {
            return system.isSpace();
        });
        var stations = _.filter(systems, function(system) {
            return system.isGround();
        });
       
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
            _.each(['VIS', 'SAR'], function(phenomena) {
                var c = new lpsolve.Row();
                _.each(demands, function(demand, j) {
                    if(demand.phenomena===phenomena) {
                        c.Add(S[i][j], demand.size);
                    }
                }, this);
                // constrain maximum data sensed per spacecraft
                C.push({
                    row: c, 
                    constraint: 'LE', 
                    constant: spacecraft.getMaxSensed(phenomena) - spacecraft.getSensed(phenomena), 
                    name: spacecraft.id  + ' max sense ' + phenomena
                });
            }, this);
            E_c0[i] = [];
            _.each(federate.contracts, function(contract, j) {
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
            _.each(spacecrafts, function(spacecraft, i) {
                E_d[t][i] = [];
                E_c[t][i] = [];
                _.each(demands, function(demand, j) {
                    // spacecraft i holds data for new contract j
                    E_d[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + demand.id+"@"+time, true);
                }, this);
                _.each(federate.contracts, function(contract, j) {
                    // spacecraft i holds data for contract j
                    E_c[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + contract.demand.id+"@"+time, true);
                }, this);
                _.each(['VIS', 'SAR'], function(phenomena) {
                    var c = new lpsolve.Row();
                    _.each(demands, function(demand, j) {
                        if(demand.phenomena===phenomena) {
                            c.Add(E_d[t][i][j], demand.size);
                        }
                    }, this);
                    _.each(federate.contracts, function(contract, j) {
                        if(contract.demand.phenomena===phenomena) {
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
                    destLoc = context.getSystemLocation(station);
                    _.each(['pSGL', 'oSGL'], function(protocol, k) {
                        T_d[t][i][j][k] = [];
                        T_c[t][i][j][k] = [];
                        var c_tx = new lpsolve.Row();
                        _.each(demands, function(demand, l) {
                            // transmit from spacecraft i to ground station j using protocol k data for new contract l
                            T_d[t][i][j][k][l] = lp.addColumn(spacecraft.id + "-" + station.id + '-T' + '(' + protocol + ')-' + demand.id+"@"+time, true);
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
                                name: spacecraft.id + '-' + station.id + ' visibility'
                            });
                        }, this);
                        _.each(federate.contracts, function(contract, l) {
                            // transmit from spacecraft i to ground station j using protocol k data for contract l
                            T_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + station.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
                            c_tx.Add(T_c[t][i][j][k][l], contract.demand.size);
                        
                            // constrain transmission by visibility
                            C.push({
                                row: new lpsolve.Row().Add(T_c[t][i][j][k][l], 1), 
                                constraint: 'LE', 
                                constant: (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, contract.demand.size, 
                                        station, context) 
                                    && station.couldReceive(protocol, 
                                        origLoc, destLoc, spacecraft, 
                                        contract.demand.size, context))?1:0,
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
            }, this);
            
            _.each(stations, function(station, j) {
                _.each(['pSGL', 'oSGL'], function(protocol, k) {
                    var c_rx = new lpsolve.Row();
                    _.each(spacecrafts, function(spacecraft, i) {
                        _.each(demands, function(demand, l) {
                            c_rx.Add(T_d[t][i][j][k][l], demand.size);
                        }, this);
                        _.each(federate.contracts, function(contract, l) {
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
                _.each(federate.contracts, function(contract, j) {
                    // system i resolves data for contract j
                    R_c[t][i][j] = lp.addColumn(system.id + "-R-" + contract.demand.id+"@"+time);
                    if(system.isGround()) {
                        J.Add(R_c[t][i][j],contract.demand.getValueAt(
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
                       _.each(['pSGL','oSGL'], function(protocol, l) {
                            c_nf.Add(T_d[t][i][k][l][j],-1);
                       }, this);
                    }, this);
                    // constrain net flow at each spacecraft
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: 0, 
                        name: spacecraft.id + ' net flow of ' + demand.id + ' at ' + time
                    });
                    if(time===maxTime) {
                        var c_bf = new lpsolve.Row();
                        c_bf.Add(E_d[t][i][j],1);
                        // constrain boundary flow at each spacecraft
                        C.push({
                            row: c_bf, 
                            constraint: 'EQ', 
                            constant: 0, 
                            name: spacecraft.id + ' boundary flow of ' + demand.id
                        });
                    }
                }, this);
                _.each(federate.contracts, function(contract, j) {
                    var c_nf = new lpsolve.Row();
                    if(time===minTime) {
                        // handle existing data as constant
                    } else {
                        c_nf.Add(E_c[t-1][i][j],1);
                    }
                    if(time===maxTime) {
                    }
                    c_nf.Add(E_c[t][i][j],-1);
                    c_nf.Add(R_c[t][R_i][j],-1);
                    _.each(stations, function(station, k) {
                       _.each(['pSGL','oSGL'], function(protocol, l) {
                            c_nf.Add(T_c[t][i][k][l][j],-1);
                       }, this);
                    }, this);
                    // constrain net flow at each spacecraft
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: -1*(time===minTime?E_c0[i][j]:0), 
                        name: spacecraft.id + ' net flow of ' + contract.demand.id + ' at ' + time
                    });
                    if(time===maxTime) {
                        var c_bf = new lpsolve.Row();
                        c_bf.Add(E_c[t][i][j],1);
                        // constrain boundary flow at each spacecraft
                        C.push({
                            row: c_bf, 
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
                        _.each(['pSGL','oSGL'], function(protocol, l) {
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
                _.each(federate.contracts, function(contract, j) {
                    var c_nf = new lpsolve.Row();
                    c_nf.Add(R_c[t][R_k][j],-1);
                    _.each(spacecrafts, function(spacecraft, i) {
                       _.each(['pSGL','oSGL'], function(protocol, l) {
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
        // console.log(lp.dumpProgram());
        // console.log(lp.solve());
        
        lp.solve();
        
        _.each(spacecrafts, function(spacecraft, i) {
            _.each(federate.contracts, function(contract, j) {
                _.each(stations, function(station, k) {
                    _.each(['pSGL','oSGL'], function(protocol, l) {
                        if(lp.get(T_c[0][i][k][l][j])) {
                            // TODO make protocol-specific
                            var data = federate.getData(contract);
                            spacecraft.transmit(data, station, context);
                            station.receive(spacecraft, data, context);
                            federate.resolveContract(contract, context);
                        }
                    }, this);
                }, this);
            }, this);
            _.each(demands, function(demand, j) {
                if(lp.get(S[i][j])) {
                    var contract = federate.contract(demand, context);
                    federate.sense(contract, spacecraft, context);
                    _.each(stations, function(station, k) {
                        _.each(['pSGL','oSGL'], function(protocol, l) {
                            if(lp.get(T_d[0][i][k][l][j])) {
                                // TODO make protocol-specific
                                var data = federate.getData(contract);
                                spacecraft.transmit(data, station, context);
                                station.receive(spacecraft, data, context);
                                federate.resolveContract(contract, context);
                            }
                        }, this);
                    }, this);
                }
            }, this);
        }, this);
    };
    
    return DynamicOperations;
});