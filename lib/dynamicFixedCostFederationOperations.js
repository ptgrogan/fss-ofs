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
 * A module to represent a fixed cost federation operations model.
 * @module dynamicFixedCostFederationOperations
 */
define('dynamicFixedCostFederationOperations', function(require) {
    var _ = require("underscore");
    var Operations = require("operations");
    var lpsolve = require("lp_solve");
    var logger = require("logger");
    var math = require("mathjs");
	
    
    function DynamicFixedCostFederationOperations() {
		this.planningHorizon = 3;
		this.storagePenalty = -50;
		this.islPenalty = -1;
		this.downlinkCost = 50;
		this.crosslinkCost = 20;
        // initialize superclass (assigns above attributes with arguments)
        Operations.apply(this, arguments);
    };
    
    DynamicFixedCostFederationOperations.prototype = new Operations();
	
    /**
     * Executes this fixed downlink cost federation operations model.
     * @param {object} federation - The federation.
     * @param {object} context - The context.
     */
    DynamicFixedCostFederationOperations.prototype.execute = function(federation, context) {
        this.operate(federation, context);
    };
	
    /**
     * Gets the federate which owns a system.
     * @param {object} system - The system.
     * @param {object} federation - The federation.
     * @returns {object} The federate.
     */
	DynamicFixedCostFederationOperations.prototype.getSystemOwner = function(system, federation) {
		return _.reduce(federation.federates, function(memo, federate) {
			if(_.contains(federate.systems, system)) {
				return federate;
			} else {
				return memo;
			}
		});
	};
	
    /**
     * Calculates the storage penalty for a demand within a spacecraft after certain elapsed time.
     * @param {object} demand - The demand.
     * @param {object} spacecraft - The spacecraft.
     * @param {object} context - The context.
     * @returns {Number} The storage penalty.
     */
	DynamicFixedCostFederationOperations.prototype.getStoragePenalty = function(demand, spacecraft, context) {
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
     * Operates this fixed cost federation operations model.
     * @param {object} federation - The federation.
     * @param {object} context - The context.
     */
    DynamicFixedCostFederationOperations.prototype.operate = function(federation, context) {		
        var minTime = context.time;
        var maxTime = Math.min(context.maxTime, context.time + this.planningHorizon);
		
		var allSystems = _.flatten(_.map(federation.federates, function(federate) {
					return _.filter(federate.systems, 
							function(system) {
								return system.isCommissioned();
							});
				}));
		var allSpacecrafts = _.filter(allSystems, function(system) {
					return system.isSpace();
				});
		var allSpacecraftsISL = _.filter(allSpacecrafts, function(spacecraft) {
			return _.some(spacecraft.subsystems, function(subsystem) {
				return subsystem.isTransceiver() && subsystem.isISL();
			})
		});
		var allStations = _.filter(allSystems, function(system) {
					return system.isGround();
				});
		var allContracts = _.flatten(_.map(federation.federates, function(federate) {
					return federate.contracts;
				}));
		var SGLprotocols = _.union(_.flatten(_.map(allSystems, function(system) {
					return _.map(_.filter(system.subsystems, function(subsystem) {
						return subsystem.isTransceiver() && subsystem.isSGL();
					}), function(sgl) {
						return sgl.protocol;
					});
				})));
		var ISLprotocols = _.union(_.flatten(_.map(allSystems, function(system) {
					return _.map(_.filter(system.subsystems, function(subsystem) {
						return subsystem.isTransceiver() && subsystem.isISL();
					}), function(sgl) {
						return sgl.protocol;
					});
				})));
		var phenomenas = ['VIS','SAR',undefined];
				
		// FIXME: need to shuffle order of federates
		// TODO: add planning horizon but restrict storage in non-owned system
		_.each(federation.federates, function(federate) {
		
			var lp = new lpsolve.LinearProgram();
			lp.setOutputFile('');
			// objective function
			var J = new lpsolve.Row();
			
			var C = []; // constraints
			var S = []; // S[i][j]: own spacecraft i senses demand j
			var E_d = []; // E_d[t][i][j]: at time t own spacecraft i holds data for demand j
			var E_c0 = []; // E_c0[i][j]: own spacecraft i initially holds data for own contract j
			var E_c = []; // E_c[t][i][j]: at time t own spacecraft i holds data for own contract j
			var T_d = []; // T_d[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for demand l
			var T_c = []; // T_c[t][i][j][k][l]: at time t transmit data from spacecraft i to ground station j using protocol k for own contract l
			var L_d = []; // L_d[t][i][j][k][l]: at time t transmit data from isl spacecraft i to isl spacecraft j using protocol k for demand l
			var L_c = []; // L_c[t][i][j][k][l]: at time t transmit data from isl spacecraft i to isl spacecraft j using protocol k for own contract l
			var R_d = []; // R_d[t][i][j]: at time t resolve data in system i for demand j
			var R_c = []; // R_c[t][i][j]: at time t resolve data in system i for own contract j
			
			var demands = _.filter(context.currentEvents, function(event) {
						return event.isDemand();
					});
					
			var ownSystems = _.filter(federate.systems, 
					function(system) {
						return system.isCommissioned();
					});
			var ownSpacecrafts = _.filter(ownSystems, function(system) {
						return system.isSpace();
					});
			var ownStations = _.filter(ownSystems, function(system) {
						return system.isGround();
					});
			var ownContracts = _.clone(federate.contracts);
			       
			_.each(ownSpacecrafts, function(spacecraft, i) {
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
				_.each(ownContracts, function(contract, j) {
					E_c0[i][j] = _.some(spacecraft.subsystems, function(subsystem) {
						return _.some(subsystem.contents, function(data) {
							return data.contract===contract.id;
						})
					})?1:0;
				}, this);
			}, this);
		
			_.each(demands, function(demand, j) {
				c = new lpsolve.Row();
				_.each(ownSpacecrafts, function(spacecraft, i) {
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
				_.each(ownSpacecrafts, function(spacecraft, i) {
					E_d[t][i] = [];
					E_c[t][i] = [];
					_.each(demands, function(demand, j) {
						// own spacecraft i holds data for new contract j
						E_d[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + demand.id+"@"+time, true);
						// small penalty to encourage rapid resolution
						if(this.storagePenalty !== null) {
							J.Add(E_d[t][i][j], this.storagePenalty);
						} else if(time===context.time) {
							J.Add(E_d[t][i][j], this.getStoragePenalty(demand, spacecraft, context));
						}
					}, this);
					_.each(ownContracts, function(contract, j) {
						// own spacecraft i holds data for own contract j
						E_c[t][i][j] = lp.addColumn(spacecraft.id + "-E-" + contract.demand.id+"@"+time, true);
						// small penalty to encourage rapid resolution
						if(this.storagePenalty !== null) {
							J.Add(E_c[t][i][j], this.storagePenalty);
						} else if(time===context.time) {
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
						_.each(ownContracts, function(contract, j) {
							if(phenomena===undefined || contract.demand.phenomena===phenomena) {
								c.Add(E_c[t][i][j], contract.demand.size);
							}
						}, this);
						// constrain maximum data stored in own spacecraft i
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
				_.each(allSpacecrafts, function(spacecraft, i) {
					T_d[t][i] = [];
					T_c[t][i] = [];
					origLoc = context.propagate(context.getSystemLocation(spacecraft), time-context.time);
					_.each(allStations, function(station, j) {
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
								if(!_.contains(ownStations, station)) {
									J.Add(T_d[t][i][j][k][l], -1*this.downlinkCost);
								}
                                c_vis.Add(T_d[t][i][j][k][l], demand.size);
                                maxSize = Math.max(maxSize, (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, demand.size, station, context) 
                                    && station.couldReceive(protocol, origLoc, destLoc, 
                                        spacecraft, demand.size, context))?demand.size:0);
							}, this);
							_.each(ownContracts, function(contract, l) {
								// transmit from spacecraft i to ground station j using protocol k data for own contract l
								T_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + station.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
								if(!_.contains(ownStations, station)) {
									J.Add(T_c[t][i][j][k][l], -1*this.downlinkCost);
								}
                                c_vis.Add(T_d[t][i][j][k][l], contract.demand.size);
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
                
                _.each(allSpacecrafts, function(spacecraft, i) {
                    _.each(allStations, function(station, j) {
                        _.each(SGLprotocols, function(protocol, k) {
                            var c_tx = new lpsolve.Row();
                            _.each(demands, function(demand, l) {
                                c_tx.Add(T_d[t][i][j][k][l], demand.size);
                            }, this);
                            _.each(ownContracts, function(contract, l) {
                                c_tx.Add(T_c[t][i][j][k][l], contract.demand.size);
                            }, this);
                            // constrain maximum data transmitted from spacecraft i
                            C.push({
                                row: c_tx, 
                                constraint: 'LE', 
                                constant: spacecraft.getMaxTransmitted(protocol) - (time===minTime?spacecraft.getTransmitted(protocol):0), 
                                name: spacecraft.id + ' max transmit ' + protocol  + ' at ' + time
                            });
                        }, this);
                    }, this);
                }, this);

				_.each(allStations, function(station, j) {
					_.each(SGLprotocols, function(protocol, k) {
						var c_rx = new lpsolve.Row();
						_.each(allSpacecrafts, function(spacecraft, i) {
							_.each(demands, function(demand, l) {
								c_rx.Add(T_d[t][i][j][k][l], demand.size);
							}, this);
							_.each(ownContracts, function(contract, l) {
								c_rx.Add(T_c[t][i][j][k][l], contract.demand.size);
							}, this);
						}, this);
						// constrain maximum data received by ground station j
						if(time===minTime) {
							C.push({
								row: c_rx, 
								constraint: 'LE', 
								constant: station.getMaxReceived(protocol) - station.getReceived(protocol),
								name: station.id + ' max receive ' + protocol + ' at ' + time
							});
						} else if(_.contains(ownStations, station)) {
							C.push({
								row: c_rx, 
								constraint: 'LE', 
								constant: station.getMaxReceived(protocol),
								name: station.id + ' max receive ' + protocol + ' at ' + time
							});
						} else {
							// do not assume future availability
							C.push({
								row: c_rx, 
								constraint: 'LE', 
								constant: 0,
								name: station.id + ' max receive ' + protocol + ' at ' + time
							});
						}
					}, this);
				}, this);

				L_d[t] = [];
				L_c[t] = [];
				_.each(allSpacecraftsISL, function(spacecraft, i) {
					L_d[t][i] = [];
					L_c[t][i] = [];
					_.each(allSpacecraftsISL, function(spacecraft2, j) {
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
								if(!_.contains(ownSpacecrafts, spacecraft) || !_.contains(ownSpacecrafts, spacecraft2)) {
									J.Add(L_d[t][i][j][k][l], -1*this.crosslinkCost);
								} else {
									// small penalty to discourage cycles
									J.Add(L_d[t][i][j][k][l], this.islPenalty);
								}
                                c_vis.Add(L_d[t][i][j][k][l], demand.size);
                                maxSize = Math.max(maxSize, (spacecraft.couldTransmit(protocol, 
                                        origLoc, destLoc, demand.size, spacecraft2, context) 
                                    && spacecraft2.couldReceive(protocol, 
                                        origLoc, destLoc, spacecraft, demand.size, context)
                                    && spacecraft !== spacecraft2)?demand.size:0);
							}, this);
							_.each(ownContracts, function(contract, l) {
								// transmit from spacecraft i to spacecraft j using protocol k data for own contract l
								L_c[t][i][j][k][l] = lp.addColumn(spacecraft.id + '-' + spacecraft2.id + '-T' + '(' + protocol + ')-' + contract.demand.id+"@"+time, true);
								// small penalty to discourage cycles
								if(!_.contains(ownSpacecrafts, spacecraft) || !_.contains(ownSpacecrafts, spacecraft2)) {
									J.Add(L_c[t][i][j][k][l], -1*this.crosslinkCost);
								} else {
									// small penalty to discourage cycles
									J.Add(L_c[t][i][j][k][l], this.islPenalty);
								}
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
                
                _.each(allSpacecraftsISL, function(spacecraft, i) {
                    _.each(allSpacecraftsISL, function(spacecraft2, j) {
                        _.each(SGLprotocols, function(protocol, k) {
                            var c_tx = new lpsolve.Row();
                            _.each(demands, function(demand, l) {
                                c_tx.Add(L_d[t][i][j][k][l], demand.size);
                            }, this);
                            _.each(ownContracts, function(contract, l) {
                                c_tx.Add(L_c[t][i][j][k][l], contract.demand.size);
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
                }, this);
                
				_.each(allSpacecraftsISL, function(spacecraft2, j) {
					_.each(ISLprotocols, function(protocol, k) {
						var c_rx = new lpsolve.Row();
						_.each(allSpacecraftsISL, function(spacecraft, i) {
							_.each(demands, function(demand, l) {
								c_rx.Add(L_d[t][i][j][k][l], demand.size);
							}, this);
							_.each(ownContracts, function(contract, l) {
								c_rx.Add(L_c[t][i][j][k][l], contract.demand.size);
							}, this);
						}, this);
						// constrain maximum data received by spacecraft j
						if(time===minTime) {
							C.push({
								row: c_rx, 
								constraint: 'LE', 
								constant: spacecraft2.getMaxReceived(protocol) - spacecraft2.getReceived(protocol),
								name: spacecraft2.id + ' max receive ' + protocol + ' at ' + time
							});
						} else if(_.contains(ownSpacecrafts, spacecraft2)) {
							C.push({
								row: c_rx, 
								constraint: 'LE', 
								constant: spacecraft2.getMaxReceived(protocol),
								name: spacecraft2.id + ' max receive ' + protocol + ' at ' + time
							});
						} else {
							// do not assume future availability
							C.push({
								row: c_rx, 
								constraint: 'LE', 
								constant: 0,
								name: spacecraft2.id + ' max receive ' + protocol + ' at ' + time
							});
						}
					}, this);
				}, this);
						
				R_d[t] = [];
				R_c[t] = [];
				_.each(allSystems, function(system, i) {
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
					_.each(ownContracts, function(contract, j) {
						// system i resolves data for contract j
						R_c[t][i][j] = lp.addColumn(system.id + "-R-" + contract.demand.id+"@"+time, true);
						if(system.isGround()) {
							J.Add(R_c[t][i][j], contract.demand.getValueAt(
									contract.elapsedTime + time-context.time));
						} else {
							if(federate.cash + contract.demand.defaultValue > 0) {
								J.Add(R_c[t][i][j], contract.demand.defaultValue);
							} else {
								// high penalty to avoid bankruptcy
								J.Add(R_c[t][i][j], -1e9);
							}
						}
					}, this);
				}, this);
							
				_.each(allSpacecrafts, function(spacecraft, i) {
					var SE_i = _.indexOf(ownSpacecrafts, spacecraft);
					var R_i = _.indexOf(allSystems, spacecraft);
					_.each(demands, function(demand, j) {
						var c_nf = new lpsolve.Row();
						if(SE_i > -1) {
							if(time===minTime) {
								c_nf.Add(S[SE_i][j],1);
							} else {
								c_nf.Add(E_d[t-1][SE_i][j],1);
							}
							c_nf.Add(E_d[t][SE_i][j],-1);
						}
						c_nf.Add(R_d[t][R_i][j],-1);
						_.each(allStations, function(station, k) {
						   _.each(SGLprotocols, function(protocol, l) {
								c_nf.Add(T_d[t][i][k][l][j],-1);
						   }, this);
						}, this);
						if((isl_i = _.indexOf(allSpacecraftsISL, spacecraft)) >= 0) {
							_.each(allSpacecraftsISL, function(spacecraft2, k) {
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
					_.each(ownContracts, function(contract, j) {
						var c_nf = new lpsolve.Row();
						if(SE_i > -1) {
							if(time===minTime) {
								// handle existing data as constant
							} else {
								c_nf.Add(E_c[t-1][SE_i][j],1);
							}
							c_nf.Add(E_c[t][SE_i][j],-1);
						}
						c_nf.Add(R_c[t][R_i][j],-1);
						_.each(allStations, function(station, k) {
						   _.each(SGLprotocols, function(protocol, l) {
								c_nf.Add(T_c[t][i][k][l][j],-1);
						   }, this);
						}, this);
						if((isl_i = _.indexOf(allSpacecraftsISL, spacecraft)) >= 0) {
							_.each(allSpacecraftsISL, function(spacecraft2, k) {
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
							constant: -1*((SE_i>-1&&time===minTime)?E_c0[SE_i][j]:0), 
							name: spacecraft.id + ' net flow of ' + contract.demand.id + ' at ' + time
						});
					}, this);
				}, this);
            
                if(time+1>=context.maxTime) {
                    _.each(ownSpacecrafts, function(spacecraft, i) {
                        var c_bf = new lpsolve.Row();
                        _.each(demands, function(demand, j) {
                            // constrain boundary flow at each spacecraft
                            // TODO: adjust in case horizon < federate horizon
                            // (must also assign higher storage cost)
                            c_bf.Add(E_d[t][i][j],1);
                        }, this);
                        _.each(ownContracts, function(contract, j) {
                            // constrain boundary flow at each spacecraft
                            // TODO: adjust in case horizon < federate horizon
                            // (must also assign higher storage cost)
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
							
				_.each(allStations, function(station, k) {
					var R_k = _.indexOf(allSystems, station);
					_.each(demands, function(demand, j) {
						var c_nf = new lpsolve.Row();
						c_nf.Add(R_d[t][R_k][j],-1);
						_.each(allSpacecrafts, function(spacecraft, i) {
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
					_.each(ownContracts, function(contract, j) {
						var c_nf = new lpsolve.Row();
						c_nf.Add(R_c[t][R_k][j],-1);
						_.each(allSpacecrafts, function(spacecraft, i) {
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
			
			var c_cash = new lpsolve.Row();
			_.each(demands, function(demand, l) {
				_.each(allSystems, function(system, i) {
					if(system.isGround()) {
						c_cash.Add(R_d[0][i][l], -1*demand.getValueAt(0));
					} else {
						c_cash.Add(R_d[0][i][l], -1*demand.defaultValue);
					}
				}, this);
				_.each(allSpacecrafts, function(spacecraft, i) {
					_.each(allStations, function(station, j) {
						_.each(SGLprotocols, function(protocol, k) {
							if(!_.contains(ownStations, station)) {
								c_cash.Add(T_d[0][i][j][k][l], this.downlinkCost);
							}
						}, this);
					}, this);
				}, this);
				_.each(allSpacecraftsISL, function(spacecraft, i) {
					_.each(allSpacecraftsISL, function(spacecraft2, j) {
						_.each(ISLprotocols, function(protocol, k) {
							if(!_.contains(ownSpacecrafts, spacecraft2)) {
								c_cash.Add(L_d[0][i][j][k][l], this.crosslinkCost);
							}
						}, this);
					}, this);
				}, this);
			}, this);
			_.each(ownContracts, function(contract, l) {
				_.each(allSystems, function(system, i) {
					if(system.isGround()) {
						c_cash.Add(R_c[0][i][l], -1*contract.demand.getValueAt(contract.elapsedTime));
					} else {
						c_cash.Add(R_c[0][i][l], -1*contract.demand.defaultValue);
					}
				}, this);
				_.each(allSpacecrafts, function(spacecraft, i) {
					_.each(allStations, function(station, j) {
						_.each(SGLprotocols, function(protocol, k) {
							if(!_.contains(ownStations, station)) {
								c_cash.Add(T_c[0][i][j][k][l], this.downlinkCost);
							}
						}, this);
					}, this);
				}, this);
				_.each(allSpacecraftsISL, function(spacecraft, i) {
					_.each(allSpacecraftsISL, function(spacecraft2, j) {
						_.each(ISLprotocols, function(protocol, k) {
							if(!_.contains(ownSpacecrafts, spacecraft2)) {
								c_cash.Add(L_c[0][i][j][k][l], this.crosslinkCost);
							}
						}, this);
					}, this);
				}, this);
			}, this);
			// default penalty + ISL services + SGL services - contract value <= cash
			C.push({
				row: c_cash,
				constraint: 'LEQ',
				constant: federate.cash,
				name: federate.id + ' net cash must be positive'
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
				process.exit(1);
			} else {
				// recursive function to transport data from contracts
				var transportContract = function(operations, spacecraft, contract, context) {
					var federate1 = operations.getSystemOwner(spacecraft, federation);
					var federate2 = federate;
					var i = _.indexOf(allSpacecrafts, spacecraft);
					var isl_i = _.indexOf(allSpacecraftsISL, spacecraft);
					var R_i = _.indexOf(allSystems, spacecraft);
					var j = _.indexOf(ownContracts, contract);
					if((data = federate1.getData(contract)) !== undefined) {
						if(lp.get(R_c[0][R_i][j]) > 0) {
							// don't default in federation operations
							// federate2.defaultContract(contract, context);
						} else {
							_.each(allStations, function(station, k) {
								var federate3 = operations.getSystemOwner(station, federation);
								_.each(SGLprotocols, function(protocol, l) {
									if(lp.get(T_c[0][i][k][l][j]) > 0 && federate1.canTransport(
											data, protocol, spacecraft, station, context)) {
										federate1.transport(data, protocol, 
												spacecraft, station, context);
										federate2.resolveContract(contract, context);
										if(federate2 !== federate3) {
											federate2.cash -= operations.downlinkCost;
											federate3.cash += operations.downlinkCost;
											logger.info(federate2.id + ' paid ' + federate3.id + ' ' + operations.downlinkCost + ' for SGL services')
										}
									}
								}, this);
							}, this);
							if(isl_i >= 0) {
								_.each(allSpacecraftsISL, function(spacecraft2, k) {
									var E_k = _.indexOf(ownSpacecrafts, spacecraft2);
									var federate3 = operations.getSystemOwner(spacecraft2, federation);
									_.each(ISLprotocols, function(protocol, l) {
										if(lp.get(L_c[0][isl_i][k][l][j]) > 0 && federate1.canTransport(
												data, protocol, spacecraft, spacecraft2, context)) {
											federate1.transport(data, protocol, 
													spacecraft, spacecraft2, context);
											if(federate2 !== federate3) {
												federate2.cash -= operations.crosslinkCost;
												federate3.cash += operations.crosslinkCost;
												logger.info(federate2.id + ' paid ' + federate3.id + ' ' + operations.crosslinkCost + ' for ISL services')
											}
											if(E_k > 0 && lp.get(E_c[0][E_k][j]) > 0) {
												spacecraft2.store(data);
											} else {
												transportContract(operations, spacecraft2, contract, context);
											}
										}
									}, this);
								}, this);
							}
						}
					} 
				}
				
				// recursive function to transport data from demands
				var transportDemand = function(operations, spacecraft, demand, context) {
					var federate1 = operations.getSystemOwner(spacecraft, federation);
					var federate2 = federate;
					var i = _.indexOf(allSpacecrafts, spacecraft);
					var isl_i = _.indexOf(allSpacecraftsISL, spacecraft);
					var R_i = _.indexOf(allSystems, spacecraft);
					var j = _.indexOf(demands, demand); 
					if((contract = federate2.getContract(demand)) !== undefined
							&& (data = federate1.getData(contract)) !== undefined) {
						if(lp.get(R_d[0][R_i][j]) > 0) {
							// don't default 
							// federate2.defaultContract(contract, context);
						} else {
							_.each(allStations, function(station, k) {
								var federate3 = operations.getSystemOwner(station, federation);
								_.each(SGLprotocols, function(protocol, l) {
									if(lp.get(T_d[0][i][k][l][j]) > 0 && federate1.canTransport(
											data, protocol, spacecraft, station, context)) {
										federate1.transport(data, protocol, 
												spacecraft, station, context);
										federate2.resolveContract(contract, context);
										if(federate2 !== federate3) {
											federate2.cash -= operations.downlinkCost;
											federate3.cash += operations.downlinkCost;
											logger.info(federate2.id + ' paid ' + federate3.id + ' ' + operations.downlinkCost + ' for SGL services')
										}
									}
								}, this);
							}, this);
							if(isl_i >= 0) {
								_.each(allSpacecraftsISL, function(spacecraft2, k) {
									var E_k = _.indexOf(ownSpacecrafts, spacecraft2);
									var federate3 = operations.getSystemOwner(spacecraft2, federation);
									_.each(ISLprotocols, function(protocol, l) {
										if(lp.get(L_d[0][isl_i][k][l][j]) > 0 && federate1.canTransport(
												data, protocol, spacecraft, spacecraft2, context)) {
											federate1.transport(data, protocol, 
													spacecraft, spacecraft2, context);
											if(federate2 !== federate3) {
												federate2.cash -= operations.crosslinkCost;
												federate3.cash += operations.crosslinkCost;
												logger.info(federate2.id + ' paid ' + federate3.id + ' ' + operations.crosslinkCost + ' for ISL services')
											}
											if(E_k > 0 && lp.get(E_d[0][E_k][j]) > 0) {
												spacecraft2.store(data);
											} else {
												transportDemand(operations, spacecraft2, demand, context);
											}
										}
									}, this);
								}, this);
							}
						}
					}
				}
				
				// zeroth, resolve any contracts on orbit
				_.each(allSystems, function(system, i) {
					if(system.isSpace()) {
						_.each(ownContracts, function(contract, j) {
							if(lp.get(R_c[0][i][j]) > 0) {
								// don't default 
								// federate.defaultContract(contract, context);
							}
						}, this);
					}
				}, this);
				
				// first, transport contracts to resolution
				_.each(ownContracts, function(contract, j) {
					if(_.some(_.range(0,allSystems.length,1), function(i) {
						return lp.get(R_c[0][i][j]) > 0;
					}, this)) {
						_.each(allSpacecrafts, function(spacecraft, i) {
							transportContract(this, spacecraft, contract, context);
						}, this);
					}
				}, this);
				
				// second, sense and transport demands to resolution
				_.each(demands, function(demand, j) {
					if(_.some(_.range(0,allSystems.length,1), function(i) {
						return lp.get(R_d[0][i][j]) > 0;
					}, this)) {
						_.each(ownSpacecrafts, function(spacecraft, i) {
							if(lp.get(S[i][j]) > 0) {
								federate.sense(federate.contract(demand, context), 
										spacecraft, context);
							}
						}, this);
						_.each(allSpacecrafts, function(spacecraft, i) {
							transportDemand(this, spacecraft, demand, context);
						}, this);
					}
				}, this);
				
				// third, sense all demands to be stored
				_.each(demands, function(demand, j) {
					if(_.every(_.range(0,allSystems.length,1), function(i) {
						return lp.get(R_d[0][i][j]) < 1;
					}, this)) {
						_.each(ownSpacecrafts, function(spacecraft, i) {
							if(lp.get(S[i][j]) > 0) {
								federate.sense(federate.contract(demand, context), 
										spacecraft, context);
							}
						}, this);
					}
				}, this);
				
				// fourth, transport demands to storage
				_.each(demands, function(demand, j) {
					if(_.every(_.range(0,allSystems.length,1), function(i) {
						return lp.get(R_d[0][i][j]) < 1;
					}, this)) {
						_.each(allSpacecrafts, function(spacecraft, i) {
							transportDemand(this, spacecraft, demand, context);
						}, this);
					}
				}, this);
				
				// finally, transport contracts to storage
				_.each(ownContracts, function(contract, j) {
					if(_.every(_.range(0,allSystems.length,1), function(i) {
						return lp.get(R_c[0][i][j]) < 1;
					}, this)) {
						_.each(allSpacecrafts, function(spacecraft, i) {
							transportContract(this, spacecraft, contract, context);
						}, this);
					}
				}, this);
			}
		}, this);
    };
    
    return DynamicFixedCostFederationOperations;
});