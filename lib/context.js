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
 * A module to represent the context.
 * @module context
 */
define('context', function(require) {
    var _ = require('underscore');
    var logger = require('logger');
    var mas = require('mas');
    var Random = require('random-js');
    
    /** 
     * @constructor
     * @alias module:context
     */
    function Context() {
        this.locations = [];
        this.events = [];
        this.currentEvents = [];
        this.futureEvents = [];
        this.pastEvents = [];
        this.federations = [];
        this.seed = 0;
        
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
        
        // build list of sectors from known locations
        this.sectors = [];
        _.each(this.locations, function(location) {
            if(!_.contains(this.sectors, location.sector)) {
                this.sectors.push(location.sector);
            }
        }, this);
        this.id = 'context';
        this.time = 0;
        this.maxTime = 0;
    };
    
    Context.prototype = new mas.sim.Entity();
    
    /**
     * Gets the location of data for a contract.
     * @param {object} contract - The contract.
     * @returns {object} The location, or `undefined` if not found.
     */
    Context.prototype.getDataLocation = function(contract) {
        var returnValue;
        _.each(this.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                _.each(federate.systems, function(system) {
                    _.each(system.subsystems, function(subsystem) {
                        if(_.findWhere(subsystem.contents, {contract: contract.id})) {
                            returnValue = this.getSystemLocation(system);
                        }
                    }, this)
                }, this)
            }, this)
        }, this);
        return returnValue;
    }
    
    /**
     * Gets the system containing data for a contract.
     * @param {object} contract - The contract.
     * @returns {object} The system, or `undefined` if not found.
     */
    Context.prototype.getSystemDataContainer = function(contract) {
        var returnValue;
        contract.id
        _.each(this.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                _.each(federate.systems, function(system) {
                    _.each(system.subsystems, function(subsystem) {
                        if(_.findWhere(subsystem.contents, {contract: contract.id})) {
                            returnValue = system;
                        }
                    }, this)
                }, this)
            }, this)
        }, this);
        return returnValue;
    }
    
    /**
     * Gets the location of a system.
     * @param {object} system - The system.
     * @returns {object} The location, or `undefined` if not found.
     */
    Context.prototype.getSystemLocation = function(system) {
        return _.findWhere(this.locations, {id: system.location});
    }
    
    /**
     * Gets the systems at a location.
     * @param {object} location - The location.
     * @returns {array} The array of systems.
     */
    Context.prototype.getSystems = function(location) {
        var systems = [];
        _.each(this.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                _.each(federate.systems, function(system) {
                    if(system.location===location.id) {
                        systems.push(system);
                    }
                }, this)
            }, this);
        }, this);
        return systems;
    }
    
    /**
     * Propagates a location over a specified time duration.
     * @param {object} location - The location.
     * @param {Number} duration - The propagation duration.
     * @returns {object} The new location, or `undefined` if not found.
     */
    Context.prototype.propagate = function(location, duration) {
        if(!location || location.isSurface()) {
            return location;
        } else if(location.altitude==="LEO") {
            return this.propagateImpl(location, 2*duration);
        } else if(location.altitude==="MEO") {
            return this.propagateImpl(location, 1*duration);
        } else if(location.altitude==="GEO") {
            return this.propagateImpl(location, 0*duration);
        } else {
            return location;
        }
    }
    
    /**
     * Implements the propagation function.
     * @param {object} origin - The origin sector.
     * @param {object} sectors - The number of sectors to move per turn.
     * @returns {object} The new location, or `origin` if not found.
     */
    Context.prototype.propagateImpl = function(origin, sectors) {
        var path = [];
        // add all locations with the same altitude as `origin` to the path
        _.each(this.locations, function(location) {
            if(location.altitude !== null
                    && location.altitude===origin.altitude) {
                path.push(location);
            }
        }, this);
        // find the next location by adding (mod path length) the number of sectors
        for(var i = 0; i < path.length; i++) {
            if(path[i].sector===(origin.sector + sectors - 1)%path.length + 1) {
                return path[i];
            }
        }
        return origin;
    };
    
    /**
     * Gets a list of federations in shuffled order.
     * @returns {Array} The list of federates in shuffled order.
     */
    Context.prototype.getShuffledFederations = function() {
        return Random.shuffle(this.orderStream, _.clone(this.federations));
    }
    
    /**
     * Gets a list of federates in a federation in shuffled order.
     * @param {object} federation - The federation.
     * @returns {Array} The list of federates in shuffled order.
     */
    Context.prototype.getShuffledFederates = function(federation) {
        return Random.shuffle(this.orderStream, _.clone(federation.federates));
    }

    /**
     * Initializes this context.
     * @param {object} sim - The simulator.
     */
    Context.prototype.init = function(sim) {
        // reset random number streams for shuffles and rolls
        this.masterStream = new Random.engines.mt19937();
        this.masterStream.seed(this.seed);
        
        // random number stream for shuffling events
        var shuffleSeed = Random.integer(Math.pow(-2,53),Math.pow(2,53))(this.masterStream);
        this.shuffleStream = new Random.engines.mt19937();
        this.shuffleStream.seed(shuffleSeed);
        
        // random number stream for determining player priority
        var orderSeed = Random.integer(Math.pow(-2,53),Math.pow(2,53))(this.masterStream);
        this.orderStream = new Random.engines.mt19937();
        this.orderStream.seed(orderSeed);
        
        // random number streams for federate-specific rolls
        this.rollStreams = [];
        _.each(this.federations, function(federation) {
            _.each(federation.federates, function(federate) {
                var rollStream = new Random.engines.mt19937();
                var rollSeed = Random.integer(Math.pow(-2,53),Math.pow(2,53))(this.masterStream);
                rollStream.seed(rollSeed);
                this.rollStreams[federate.id] = rollStream;
            }, this);
        }, this);
        
        // reset events
        this.currentEvents = [];
        this.pastEvents = [];
        this.futureEvents = [];
        this.futureEvents = Random.shuffle(this.shuffleStream, _.clone(this.events));
        
        // reset time
        this.time = sim.time;
        this.maxTime = sim.maxTime;
        
        // initialize federations
        _.each(this.federations, function(federation) {
            federation.init(sim);
        });
    };

    /**
     * Ticks this context to pre-compute state changes.
     * @param {object} sim - The simulator.
     */
    Context.prototype.tick = function(sim) {
        _.each(this.federations, function(federation) {
            federation.tick(sim);
        }, this);
        // update time
        this.nextTime = sim.time;
    };

    /** 
     * Tocks this context to commit state changes.
     */
    Context.prototype.tock = function() {
        // default any failed contracts
        _.each(this.federations, function(federation) {
            federation.tock();
            _.each(federation.federates, function(federate) {
                _.each(_.filter(federate.contracts, function(contract) { 
                    return contract.isDefaulted(this); 
                }, this), function(contract) {
					logger.warn('Auto-defaulting contract ' + contract.demand.id + ' for ' + federate.id)
                    federate.defaultContract(contract, this);
                }, this);
                // liquidate any failed federates
                if(federate.cash < 0) {
                    federate.liquidate(this);
                }
            }, this);
        }, this);
        // log context state
        _.each(this.locations, function(location) {
            var systems = this.getSystems(location);
            if(systems.length > 0) {
                logger.debug(location.id);
                _.each(systems, function(system) {
                    logger.debug("-"+system.id);
					_.each(system.subsystems, function(subsystem) {
						if(subsystem.contents.length > 0) {
							logger.debug(' -'+subsystem.type);
							_.each(subsystem.contents, function(data) {
								logger.debug('  -'+data.phenomena + ' ' + data.contract);
							}, this);
						}
					}, this);
                }, this);
            }
        }, this);
        //move current events to past
        while(this.currentEvents.length > 0) {
            this.pastEvents.push(this.currentEvents.pop());
        }
        // reveal and resolve new events in each sector
        _.each(this.sectors, function(sector) {
            var event = this.futureEvents.pop();
            event.sector = sector;
            this.currentEvents.push(event);
            // log events in sectors where spacecraft exist
            if(_.reduce(_.where(_.filter(this.locations, function(location) {
                return location.isOrbit();
            }), {sector: sector}), function(memo, orbit) {
                return memo + this.getSystems(orbit).length;
            }, 0, this) > 0) {
                logger.debug("Sector " + sector + " event: " + event.id);
            }
            // if there are no more future events, shuffle past events
            if(this.futureEvents.length===0) {
                logger.info("Shuffling events...");
                this.pastEvents = Random.shuffle(this.shuffleStream, this.pastEvents);
                while(this.pastEvents.length > 0) {
                    this.futureEvents.push(this.pastEvents.pop());
                }
            }
            // resolve disturbances
            if(event.isDisturbance()) {
                _.each(this.federations, function(federation) {
                    _.each(federation.federates, function(federate) {
                        _.each(_.filter(federate.systems, function(system) {
                            return system.isSpace() 
                                    && this.getSystemLocation(system).sector===event.sector;
                        }, this), function(spacecraft) {
                            var numHits = 0;
                            if(_.find(spacecraft.subsystems, function(subsystem) { return subsystem.isDefense(); })) {
                                // all spacecraft with defense are protected
                                logger.info(spacecraft.getTag() + " is protected from " + event.type + ".");
                            } else {
                                // otherwise roll for subsystem hits up to maximum
                                _.each(Random.shuffle(this.rollStreams[federate.id], spacecraft.subsystems), function(subsystem) {
                                    if(numHits < event.maxHits
                                            && Random.real(0,1,true)(this.rollStreams[federate.id]) < event.hitChance) {
                                        logger.info(spacecraft.getTag() + " was hit! Subsystem " + subsystem.type + " was destroyed.");
                                        spacecraft.subsystems.splice(spacecraft.subsystems.indexOf(subsystem), 1);
                                        numHits++;
                                    }
                                }, this);
                            }
                        }, this);
                    }, this);
                }, this);
            }
        }, this);
        // update time
        this.time = this.nextTime;
		
        logger.info('Start Operations for Turn ' + this.time);
		_.each(this.getShuffledFederations(), function(federation) {
			_.each(this.getShuffledFederates(federation), function(federate) {
				federate.operations.execute(federate, this);
				logger.verbose(federate.id + ' cash: ' + federate.cash);
			}, this);
			federation.operations.execute(federation, this);
		}, this);
        logger.info('End Operations for Turn ' + this.time);
    };
    
    return Context;
});