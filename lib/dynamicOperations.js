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
    var logger = require("logger");
    var fs = require("fs");
    var math = require("mathjs");
    
    function DynamicOperations() {
		this.planningHorizon = 6;
		this.storagePenalty = -10;
		this.islPenalty = -10;
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
     * Gets the list of federates for this operations model.
     * @param {object} controller - The controller.
     * @returns {Array} The list of federates.
     */
	DynamicOperations.prototype.getFederates = function(controller){};
	
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
     * Calculates the storage penalty for a demand within a spacecraft after certain elapsed time.
     * @param {object} demand - The demand.
     * @param {object} spacecraft - The spacecraft.
     * @param {object} context - The context.
     * @returns {Number} The storage penalty.
     */
	DynamicOperations.prototype.getStoragePenalty = function(demand, spacecraft, context) {
		// compute expected net value of all possible other demands (compared to existing demand)
		// memoizes results: 	assumes context events does not change during simulation
		// 						and spacecraft do not change sensing capabilities
		// 						and demand types have consistent revenue schedules
		
		return _.memoize(function(demand, spacecraft) {
				var events =  _.filter(context.events, function(event) {
					return event.isDemand() && spacecraft.couldSense(event.phenomena, event.size);
				});
				var numSC = 1;
				var values = _.union([0], _.map(events, function(event) {
					return event.getValueAt(0);
				})).sort();
				var counts = _.map(values, function(value) {
					return _.size(_.filter(events, function(event) {
						return event.getValueAt(0)===value;
					}));
				});
				counts[0] = _.size(_.difference(context.events, events));
				var expValMax =  _.reduce(values, function(memo, value, i) {
							return memo + values[i]*(math.pow(_.reduce(counts.slice(0,i+1), function(memo,count){return memo + count;},0), numSC)
									- math.pow(_.reduce(counts.slice(0,i), function(memo,count){return memo + count;},0), numSC));
						}, 0)/math.pow(_.reduce(counts, function(memo,count){return memo + count;},0),numSC);
				//console.log('exp val max for ' + spacecraft.id + " with " + numSC + " SC " + ': ' + expValMax);
				//return Math.min(0, demand.getValueAt(elapsedTime+1) - expValMax);
				return -1*expValMax;
		}, function(demand, spacecraft) {
			return demand.type + spacecraft.id;
		})(demand, spacecraft);
	};
				
    /**
     * Operates this model.
     * @param {object} controller - The controller.
     * @param {object} context - The context.
     */
    DynamicOperations.prototype.operate = function(controller, context) {
        var minTime = context.time;
        var maxTime = Math.min(context.maxTime, context.time + this.planningHorizon);
		
        var lp = new lpsolve.LinearProgram();
        lp.setOutputFile('');
        
        var C = []; // constraints
        var S = []; // S[i][j]: spacecraft i senses demand j
        var E_d = []; // E_d[t][i][j]: at time t spacecraft i holds data for demand j
        var E_c0 = []; // E_c0[i][j]: spacecraft i initially holds data for contract j
        var E_c = []; // E_c[t][i][j]: at time t spacecraft i holds data for contract j
        var T_d = []; // T_d[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for demand l
        var T_c = []; // T_c[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for contract l
        var L_d = []; // L_d[t][i][j][k][l]: at time t transmit data from isl spacecraft i to isl spacecraft j using protocol k for demand l
        var L_c = []; // L_c[t][i][j][k][l]: at time t transmit data from isl spacecraft i to isl spacecraft j using protocol k for contract l
        var R_d = []; // R_d[t][i][j]: at time t resolve data in system i for demand j
        var R_c = []; // R_c[t][i][j]: at time t resolve data in system i for contract j
       
        var J = new lpsolve.Row(); // objective function
        
        var demands = _.filter(context.currentEvents, function(event) {
            return event.isDemand();
        });
        var systems = this.getSystems(controller);
        var federates = this.getFederates(controller);
        var spacecrafts = _.filter(systems, function(system) {
            return system.isSpace();
        });
		var spacecraftsISL = _.filter(spacecrafts, function(spacecraft) {
			return _.some(spacecraft.subsystems, function(subsystem) {
				return subsystem.isTransceiver() && subsystem.isISL();
			})
		});
        var stations = _.filter(systems, function(system) {
            return system.isGround();
        });
        var contracts = this.getContracts(controller);
        
		var SGLprotocols = _.union(_.flatten(_.map(systems, function(system) {
					return _.map(_.filter(system.subsystems, function(subsystem) {
						return subsystem.isTransceiver() && subsystem.isSGL();
					}), function(sgl) {
						return sgl.protocol;
					});
				})));
		var ISLprotocols = _.union(_.flatten(_.map(systems, function(system) {
					return _.map(_.filter(system.subsystems, function(subsystem) {
						return subsystem.isTransceiver() && subsystem.isISL();
					}), function(sgl) {
						return sgl.protocol;
					});
				})));
        var phenomenas = ['VIS','SAR',undefined]
		
        _.each(spacecrafts, function(spacecraft, i) {
            S[i] = [];
            _.each(demands, function(demand, j) {
                // spacecraft i senses data for demand j
                S[i][j] = lp.addColumn(spacecraft.id + '-S-' + demand.id, true);
                
                // constrain sensing per spacecraft
                C.push({
                    row: new lpsolve.Row().Add(S[i][j], 1),
                    constraint: 'LE',
					constant: (spacecraft.canSense(demand, context)?1:0),
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
                    constant: Math.min(spacecraft.getMaxCapacity(phenomena)
							- spacecraft.getUsedCapacity(phenomena), 
                            spacecraft.getMaxSensed(phenomena) 
                            - spacecraft.getSensed(phenomena)), 
                    name: spacecraft.id  + ' max sense ' + phenomena
                });
            }, this);
            E_c0[i] = [];
            _.each(contracts, function(contract, j) {
				E_c0[i][j] = _.some(spacecraft.subsystems, function(subsystem) {
					return _.some(subsystem.contents, function(data) {
						return data.contract===contract.id;
					})
				})?1:0;
            }, this);
        }, this);
		
		_.each(demands, function(demand, j) {
			c = new lpsolve.Row();
			_.each(spacecrafts, function(spacecraft, i) {
				c.Add(S[i][j], 1);
			}, this);
			// constrain only 1 spacecraft to sense
			C.push({
				row: c, 
				constraint: 'LE', 
				constant: 1, 
				name: demand.id  + ' max sensed'
			});
		}, this);
        
        _.each(_.range(minTime, maxTime, 1), function(time, t) {
            E_d[t] = [];
            E_c[t] = [];
            _.each(spacecrafts, function(spacecraft, i) {
                E_d[t][i] = [];
                E_c[t][i] = [];
                _.each(demands, function(demand, j) {
                    // spacecraft i holds data for new contract j
                    E_d[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + demand.id+"@"+time, true);
					// small penalty to encourage rapid resolution
					if(this.storagePenalty !== null) {
						J.Add(E_d[t][i][j], this.storagePenalty);
					} else {
						J.Add(E_d[t][i][j], this.getStoragePenalty(demand, spacecraft, context));
					}
                }, this);
                _.each(contracts, function(contract, j) {
                    // spacecraft i holds data for contract j
                    E_c[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + contract.demand.id+"@"+time, true);
					// small penalty to encourage rapid resolution
					if(this.storagePenalty !== null) {
						J.Add(E_c[t][i][j], this.storagePenalty);
					} else {
						J.Add(E_c[t][i][j], this.getStoragePenalty(contract.demand, spacecraft, context));
					}
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
                        name: spacecraft.id  + ' max store ' + phenomena + ' at ' + time
                    });
                }, this);
            }, this);
            
            T_d[t] = [];
            T_c[t] = [];
            _.each(spacecrafts, function(spacecraft, i) {
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
                        var c_vis = new lpsolve.Row();
                        var maxSize = 0;
                        _.each(demands, function(demand, l) {
                            // transmit from spacecraft i to ground station j using protocol k data for demand l
                            T_d[t][i][j][k][l] = lp.addColumn(spacecraft.id + "-" + station.id + '-T' + '(' + protocol + ')-' + demand.id+"@"+time, true);
                            c_vis.Add(T_d[t][i][j][k][l], demand.size);
                            maxSize = Math.max(maxSize, (spacecraft.couldTransmit(protocol, 
                                    origLoc, destLoc, demand.size, station, context) 
                                && station.couldReceive(protocol, origLoc, destLoc, 
                                    spacecraft, demand.size, context))?demand.size:0);
                        }, this);
                        _.each(contracts, function(contract, l) {
                            // transmit from spacecraft i to ground station j using protocol k data for contract l
                            T_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + station.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
                            c_vis.Add(T_c[t][i][j][k][l], contract.demand.size);
                            maxSize = Math.max(maxSize, (spacecraft.couldTransmit(protocol, 
                                    origLoc, destLoc, contract.demand.size, station, context) 
                                && station.couldReceive(protocol, origLoc, destLoc, 
                                    spacecraft, contract.demand.size, context))?contract.demand.size:0);
                        }, this);
                            
                        // constrain transmission by visibility
                        C.push({
                            row: c_vis, 
                            constraint: 'LE', 
                            constant: maxSize,
                            name: spacecraft.id + '-' + station.id + ' ' + protocol + ' visibility at ' + time
                        });
                    }, this);
                }, this);
            }, this);
            
            _.each(spacecrafts, function(spacecraft, i) {
                _.each(SGLprotocols, function(protocol, k) {
                    c_tx = new lpsolve.Row();
                    _.each(stations, function(station, j) {
                        _.each(demands, function(demand, l) {
                            c_tx.Add(T_d[t][i][j][k][l], demand.size);
                        }, this);
                        _.each(contracts, function(contract, l) {
                            c_tx.Add(T_c[t][i][j][k][l], contract.demand.size);
                        }, this);
                    }, this);
                    // constrain maximum data transmitted from spacecraft i
                    C.push({
                        row: c_tx, 
                        constraint: 'LE', 
                        constant: spacecraft.getMaxTransmitted(protocol) - (time===minTime?spacecraft.getTransmitted(protocol):0), 
                        name: spacecraft.id + ' max transmit ' + protocol + ' at ' + time
                    });
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
            
            L_d[t] = [];
            L_c[t] = [];
            _.each(spacecraftsISL, function(spacecraft, i) {
                L_d[t][i] = [];
                L_c[t][i] = [];
                origLoc = context.propagate(context.getSystemLocation(spacecraft), time-context.time);
                _.each(spacecraftsISL, function(spacecraft2, j) {
                    L_d[t][i][j] = [];
                    L_c[t][i][j] = [];
                    destLoc = context.propagate(context.getSystemLocation(spacecraft2), time-context.time);
                    _.each(ISLprotocols, function(protocol, k) {
                        L_d[t][i][j][k] = [];
                        L_c[t][i][j][k] = [];
                        var c_vis = new lpsolve.Row();
                        var maxSize = 0;
                        _.each(demands, function(demand, l) {
                            // transmit from spacecraft i to spacecraft j using protocol k data for demand l
                            L_d[t][i][j][k][l] = lp.addColumn(spacecraft.id + "-" + spacecraft2.id + '-T' + '(' + protocol + ')-' + demand.id+"@"+time, true);
                            // small penalty to discourage cycles
                            J.Add(L_d[t][i][j][k][l], this.islPenalty);
                            c_vis.Add(L_d[t][i][j][k][l], demand.size)
                            maxSize = Math.max(maxSize, (spacecraft.couldTransmit(protocol, 
                                    origLoc, destLoc, demand.size, spacecraft2, context) 
                                && spacecraft2.couldReceive(protocol, 
                                    origLoc, destLoc, spacecraft, demand.size, context)
                                && spacecraft !== spacecraft2)?demand.size:0);
                        }, this);
                        _.each(contracts, function(contract, l) {
                            // transmit from spacecraft i to spacecraft j using protocol k data for contract l
                            L_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + spacecraft2.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
                            // small penalty to discourage cycles
                            J.Add(L_c[t][i][j][k][l], this.islPenalty);
                            c_vis.Add(L_c[t][i][j][k][l], contract.demand.size)
                            maxSize = Math.max(maxSize, (spacecraft.couldTransmit(protocol, 
                                    origLoc, destLoc, contract.demand.size, spacecraft2, context) 
                                && spacecraft2.couldReceive(protocol, 
                                    origLoc, destLoc, spacecraft, contract.demand.size, context)
                                && spacecraft !== spacecraft2)?contract.demand.size:0);
                        }, this);
                        
                        // constrain transmission by visibility
                        C.push({
                            row: c_vis, 
                            constraint: 'LE', 
                            constant: maxSize,
                            name: spacecraft.id + '-' + spacecraft2.id + ' ' + protocol + ' visibility at ' + time
                        });
                    }, this);
                }, this);
            }, this);
            
            _.each(spacecraftsISL, function(spacecraft, i) {
                _.each(ISLprotocols, function(protocol, k) {
                    c_tx = new lpsolve.Row();
                    _.each(spacecraftsISL, function(spacecraft2, j) {
                        _.each(demands, function(demand, l) {
                            c_tx.Add(L_d[t][i][j][k][l], demand.size);
                        }, this);
                        _.each(contracts, function(contract, l) {
                            c_tx.Add(L_c[t][i][j][k][l], contract.demand.size);
                        }, this);
                    }, this);
                    // constrain maximum data transmitted from spacecraft i
                    C.push({
                        row: c_tx, 
                        constraint: 'LE', 
                        constant: spacecraft.getMaxTransmitted(protocol) - (time===minTime?spacecraft.getTransmitted(protocol):0), 
                        name: spacecraft.id + ' max transmit ' + protocol + ' at ' + time
                    });
                }, this);
            }, this);
            
            _.each(spacecraftsISL, function(spacecraft2, j) {
                _.each(ISLprotocols, function(protocol, k) {
                    var c_rx = new lpsolve.Row();
                    _.each(spacecraftsISL, function(spacecraft, i) {
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
                    R_d[t][i][j] = lp.addColumn(system.id + "-R-" + demand.id+"@"+time, true);
                    if(system.isGround()) {
                        J.Add(R_d[t][i][j], demand.getValueAt(time-context.time));
                    } else {
						// high penalty to avoid default on a new contract
						J.Add(R_d[t][i][j], -1e9);
                    }
                }, this);
                _.each(contracts, function(contract, j) {
                    // system i resolves data for contract j
                    R_c[t][i][j] = lp.addColumn(system.id + "-R-" + contract.demand.id+"@"+time, true);
                    if(system.isGround()) {
                        J.Add(R_c[t][i][j], contract.demand.getValueAt(
                                contract.elapsedTime + time-context.time));
                    } else {
						var federate = this.getContractOwner(contract, controller);
						if(federate.cash + contract.demand.defaultValue > 0) {
							J.Add(R_c[t][i][j], contract.demand.defaultValue);
						} else {
							// high penalty to avoid bankruptcy
							J.Add(R_c[t][i][j], -1e9);
						}
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
                    c_nf.Add(E_d[t][i][j],-1);
					c_nf.Add(R_d[t][R_i][j],-1);
                    _.each(stations, function(station, k) {
                       _.each(SGLprotocols, function(protocol, l) {
                            c_nf.Add(T_d[t][i][k][l][j],-1);
                       }, this);
                    }, this);
					if((isl_i = _.indexOf(spacecraftsISL, spacecraft)) >= 0) {
						_.each(spacecraftsISL, function(spacecraft2, k) {
						   _.each(ISLprotocols, function(protocol, l) {
								c_nf.Add(L_d[t][isl_i][k][l][j],-1);
								c_nf.Add(L_d[t][k][isl_i][l][j],1);
						   }, this);
						}, this);
					}
                    // constrain net flow at each spacecraft
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: 0, 
                        name: spacecraft.id + ' net flow of ' + demand.id + ' at ' + time
                    });
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
					if((isl_i = _.indexOf(spacecraftsISL, spacecraft)) >= 0) {
						_.each(spacecraftsISL, function(spacecraft2, k) {
						   _.each(ISLprotocols, function(protocol, l) {
								c_nf.Add(L_c[t][isl_i][k][l][j],-1);
								c_nf.Add(L_c[t][k][isl_i][l][j],1);
						   }, this);
						}, this);
					}
                    // constrain net flow at each spacecraft
                    C.push({
                        row: c_nf, 
                        constraint: 'EQ', 
                        constant: -1*(time===minTime?E_c0[i][j]:0), 
                        name: spacecraft.id + ' net flow of ' + contract.demand.id + ' at ' + time
                    });
                }, this);
            }, this);
            
            if(time+1>=maxTime) {
                _.each(spacecrafts, function(spacecraft, i) {
                    var c_bf = new lpsolve.Row();
                    _.each(demands, function(demand, j) {
                        c_bf.Add(E_d[t][i][j],1)
                    }, this);
                    _.each(contracts, function(contract, j) {
                        c_bf.Add(E_c[t][i][j],1)
                    }, this);
                    // constrain boundary flow at each spacecraft
                    C.push({
                        row: c_bf, 
                        constraint: 'EQ', 
                        constant: 0, 
                        name: spacecraft.id + ' boundary flow'
                    });
                }, this);
            }
            
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

		_.each(federates, function(federate) {
			var c_cash = new lpsolve.Row();
			_.each(demands, function(demand, l) {
				_.each(systems, function(system, i) {
					if(system.isGround()) {
						c_cash.Add(R_d[0][i][l], -1*demand.getValueAt(0));
					} else {
						c_cash.Add(R_d[0][i][l], -1*demand.defaultValue);
					}
				}, this);
			}, this);
			_.each(contracts, function(contract, l) {
				_.each(systems, function(system, i) {
					if(system.isGround()) {
						c_cash.Add(R_c[0][i][l], -1*contract.demand.getValueAt(contract.elapsedTime));
					} else {
						c_cash.Add(R_c[0][i][l], -1*contract.demand.defaultValue);
					}
				}, this);
			}, this);
			// default penalty - contract value <= cash
			C.push({
				row: c_cash,
				constraint: 'LEQ',
				constant: federate.cash,
				name: federate.id + ' net cash must be positive'
			});
		});
        
        _.each(C, function(c) {
            lp.addConstraint(c.row, c.constraint, c.constant, c.name);
        }, this);
        
        // set objective function and solve linear program
        lp.setObjective(J, false);
        
		var result = lp.solve();
        
		if(result.code>1) {
			logger.error(result.description);
			fs.writeFileSync('lp_debug.txt', lp.dumpProgram());
			logger.info('lp_solve dump written to file lp_debug.txt');
			// process.exit(1);
		} else {
			// recursive function to transport data from contracts
			var transportContract = function(operations, spacecraft, contract, context) {
				var federate1 = operations.getSystemOwner(spacecraft, controller);
				var federate2 = operations.getContractOwner(contract, controller);
				var i = _.indexOf(spacecrafts, spacecraft);
				var R_i = _.indexOf(systems, spacecraft);
				var j = _.indexOf(contracts, contract);
				if((data = federate1.getData(contract)) !== undefined) {
                    var isl_i = _.indexOf(spacecraftsISL, spacecraft);
					if(lp.get(R_c[0][R_i][j]) > 0) {
						federate2.defaultContract(contract, context);
					} else if(lp.get(E_c[0][i][j]) > 0) {
                        spacecraft.store(data);
                    } else if(_.some(_.range(0,stations.length), function(k) {
                        return _.some(_.range(0,SGLprotocols.length), function(l) {
                            return lp.get(T_c[0][i][k][l][j]) > 0;
                        });
                    })) {
                        _.each(stations, function(station, k) {
                            _.each(SGLprotocols, function(protocol, l) {
                                if(lp.get(T_c[0][i][k][l][j]) > 0) {
                                    federate1.transport(data, protocol, 
                                            spacecraft, station, context);
                                    federate2.resolveContract(contract, context);
                                }
                            }, this);
                        }, this);
                    } else if(isl_i >= 0 && _.some(_.range(0,spacecraftsISL.length), function(k) {
                        return _.some(_.range(0,ISLprotocols.length), function(l) {
                            return lp.get(L_c[0][isl_i][k][l][j]) > 0;
                        });
                    })) {
                        _.each(spacecraftsISL, function(spacecraft2, k) {
                            _.each(ISLprotocols, function(protocol, l) {
                                if(lp.get(L_c[0][isl_i][k][l][j]) > 0) {
                                    federate1.transport(data, protocol, 
                                            spacecraft, spacecraft2, context);
                                    transportContract(operations, spacecraft2, 
                                            contract, context);
                                }
                            }, this);
                        }, this);
                    }
				} 
			}
			
			// recursive function to transport data from demands
			var transportDemand = function(operations, spacecraft, demand, context) {
				var federate1 = operations.getSystemOwner(spacecraft, controller);
				var federate2 = operations.getDemandOwner(demand, controller);
				var i = _.indexOf(spacecrafts, spacecraft);
				var R_i = _.indexOf(systems, spacecraft);
				var j = _.indexOf(demands, demand); 
				if((contract = federate2.getContract(demand)) !== undefined
						&& (data = federate1.getData(contract)) !== undefined) {
                    var isl_i = _.indexOf(spacecraftsISL, spacecraft);
					if(lp.get(R_d[0][R_i][j]) > 0) {
						federate2.defaultContract(contract, context);
					} else if(lp.get(E_d[0][i][j]) > 0) {
                        spacecraft.store(data);
                    } else if(_.some(_.range(0,stations.length), function(k) {
                        return _.some(_.range(0,SGLprotocols.length), function(l) {
                            return lp.get(T_d[0][i][k][l][j]) > 0;
                        });
                    })) {
						_.each(stations, function(station, k) {
							_.each(SGLprotocols, function(protocol, l) {
								if(lp.get(T_d[0][i][k][l][j]) > 0) {
									federate1.transport(data, protocol, 
											spacecraft, station, context);
									federate2.resolveContract(contract, context);
								}
							}, this);
						}, this);
                    } else if(isl_i >= 0 && _.some(_.range(0,spacecraftsISL.length), function(k) {
                        return _.some(_.range(0,ISLprotocols.length), function(l) {
                            return lp.get(L_d[0][isl_i][k][l][j]) > 0;
                        });
                    })) {
                        _.each(spacecraftsISL, function(spacecraft2, k) {
                            _.each(ISLprotocols, function(protocol, l) {
                                if(lp.get(L_d[0][isl_i][k][l][j]) > 0) {
                                    federate1.transport(data, protocol, 
                                            spacecraft, spacecraft2, context);
                                    transportDemand(operations, spacecraft2,
                                            demand, context);
                                }
                            }, this);
                        }, this);
					}
				}
			}
			
			// first, transport contracts to resolution
			_.each(contracts, function(contract, j) {
				if(_.some(_.range(0,systems.length,1), function(i) {
					return lp.get(R_c[0][i][j]) > 0;
				}, this)) {
                    logger.debug('Transporting contract ' + contract.demand.id + ' for resolution...')
                    var spacecraft = context.getSystemDataContainer(contract);
                    transportContract(this, spacecraft, contract, context);
				}
			}, this);
			
			// second, sense and transport demands to resolution
			_.each(demands, function(demand, j) {
				if(_.some(_.range(0,systems.length,1), function(i) {
					return lp.get(R_d[0][i][j]) > 0;
				}, this)) {
                    logger.debug('Sensing and transporting demand ' + demand.id + ' for resolution...')
                    var spacecraft = _.reduce(spacecrafts, function(memo, spacecraft, i) {
                        return (lp.get(S[i][j]) > 0)?spacecraft:memo;
                    }, undefined, this);
                    var federate = this.getSystemOwner(spacecraft, controller);
                    var contract = federate.contract(demand, context);
                    federate.sense(contract, spacecraft, context);
                    transportDemand(this, spacecraft, demand, context);
				}
			}, this);
			
			// third, sense all demands to be stored
			_.each(demands, function(demand, j) {
				if(_.every(_.range(0,systems.length,1), function(i) {
					return lp.get(R_d[0][i][j]) < 1;
				}, this) && _.some(_.range(0,spacecrafts.length,1), function(i) {
                    return lp.get(S[i][j]) > 0;
                }, this)) {
                    logger.debug('Sensing demand ' + demand.id + ' for storage...')
                    var spacecraft = _.reduce(spacecrafts, function(memo, spacecraft, i) {
                        return (lp.get(S[i][j]) > 0)?spacecraft:memo;
                    }, undefined, this);
                    var federate = this.getSystemOwner(spacecraft, controller);
                    var contract = federate.contract(demand, context);
                    federate.sense(contract, spacecraft, context);
				}
			}, this);
            
			// fourth, transport demands to storage
			_.each(demands, function(demand, j) {
				if(_.every(_.range(0,systems.length,1), function(i) {
					return lp.get(R_d[0][i][j]) < 1;
				}, this) && _.some(_.range(0,spacecrafts.length,1), function(i) {
                    return lp.get(S[i][j]) > 0;
                }, this)) {
                    logger.debug('Transporting demand ' + demand.id + ' for storage...')
                    var spacecraft = _.reduce(spacecrafts, function(memo, spacecraft, i) {
                        return (lp.get(S[i][j]) > 0)?spacecraft:memo;
                    }, undefined, this);
                    transportDemand(this, spacecraft, demand, context);
				}
			}, this);
			
			// finally, transport contracts to storage
			_.each(contracts, function(contract, j) {
				if(_.every(_.range(0,systems.length,1), function(i) {
					return lp.get(R_c[0][i][j]) < 1;
				}, this)) {
                    logger.debug('Transporting contract ' + contract.demand.id + ' for storage...')
                    var spacecraft = context.getSystemDataContainer(contract);
                    transportContract(this, spacecraft, contract, context);
				}
			}, this);
		}
    };
    
    return DynamicOperations;
});