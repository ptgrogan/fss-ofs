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

define(function(require) {
	var _ = require('underscore');
	var logger = require('logger');
	var mas = require('mas');
	var Random = require('random-js');
	
    function Context() {
		this.locations = [];
		this.events = [];
		this.currentEvents = [];
		this.futureEvents = [];
		this.pastEvents = [];
		this.federations = [];
		this.seed = 0;
		
		mas.sim.Entity.apply(this, arguments);
		
		this.sectors = [];
		_.each(this.locations, function(location) {
			if(!_.contains(this.sectors, location.sector)) {
				this.sectors.push(location.sector);
			}
		}, this);
		this.id = 'context';
    };
	
	Context.prototype = new mas.sim.Entity();
	
	Context.prototype.getSubsystem = function(contract) {
		var returnValue;
		_.each(this.federations, function(federation) {
			_.each(federation.federates, function(federate) {
				_.each(federate.systems, function(system) {
					_.each(system.subsystems, function(subsystem) {
						if(_.findWhere(subsystem.contents, {contract: contract.id})) {
							returnValue = subsystem;
						}
					}, this)
				}, this)
			}, this)
		}, this);
		return returnValue;
	}
	
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
	
	Context.prototype.getSystemLocation = function(system) {
		return _.findWhere(this.locations, {id: system.location});
	}
	
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
	
	Context.prototype.propagate = function(system) {
		var location = this.getSystemLocation(system);
		if(!location || location.isSurface()) {
			return location;
		} else if(location.altitude==="LEO") {
			return this.propagateImpl(location, 2);
		} else if(location.altitude==="MEO") {
			return this.propagateImpl(location, 1);
		} else if(location.altitude==="GEO") {
			return this.propagateImpl(location, 0);
		} else {
			return location;
		}
	}
	
	Context.prototype.propagateImpl = function(origin, sectors) {
		var path = [];
		_.each(this.locations, function(location) {
			if(location.altitude !== null
					&& location.altitude===origin.altitude) {
				path.push(location);
			}
		}, this);
		for(var i = 0; i < path.length; i++) {
			if(path[i].sector===(origin.sector + sectors - 1)%path.length + 1) {
				return path[i];
			}
		}
		return origin;
	};

    Context.prototype.init = function(sim) {
		// reset random number generator
		this.random = new Random.engines.mt19937();
		this.random.seed(this.seed);
		
		// reset events
		this.currentEvents = [];
		this.pastEvents = [];
		this.futureEvents = [];
		this.futureEvents = Random.shuffle(this.random, this.events);
		
		// initialize federations
		_.each(this.federations, function(federation) {
			federation.init(sim);
		});
	};

    Context.prototype.tick = function(sim) {
		_.each(this.federations, function(federation) {
			federation.tick(sim);
		}, this);
	};

    Context.prototype.tock = function() {
		_.each(this.federations, function(federation) {
			federation.tock();
			_.each(federation.federates, function(federate) {
				federate.autoDefault(this);
			}, this);
		}, this);
        _.each(this.locations, function(location) {
            var systems = this.getSystems(location);
            if(systems.length > 0) {
                logger.debug(location.id);
                _.each(systems, function(system) {
                    logger.debug("-"+system.type);
                }, this);
            }
        }, this);
        
		while(this.currentEvents.length > 0) {
			this.pastEvents.push(this.currentEvents.pop());
		}
		_.each(this.sectors, function(sector) {
			var event = this.futureEvents.pop();
			event.sector = sector;
			this.currentEvents.push(event);
            if(_.reduce(_.where(_.filter(this.locations, function(location) {
                return location.isOrbit();
            }), {sector: sector}), function(memo, orbit) {
                return memo + this.getSystems(orbit).length;
            }, 0, this) > 0) {
                logger.debug("Sector " + sector + " event: " + event.type);
            }
			if(this.futureEvents.length===0) {
				this.pastEvents = Random.shuffle(this.random, this.pastEvents);
				while(this.pastEvents.length > 0) {
					this.futureEvents.push(this.pastEvents.pop());
				}
			}
			if(event.isDisturbance()) {
				_.each(this.federations, function(federation) {
					_.each(federation.federates, function(federate) {
						_.each(_.filter(federate.systems, function(system) {
							return system.isSpace() 
									&& this.getSystemLocation(system).sector===event.sector;
						}, this), function(spacecraft) {
							var numHits = 0;
							if(_.find(spacecraft.subsystems, function(subsystem) { return subsystem.isDefense(); })) {
                                logger.info(spacecraft.type + " is protected from " + event.type + ".");
                            } else {
                                _.each(spacecraft.subsystems, function(subsystem) {
                                    if(numHits < event.maxHits
                                            && Random.real(0,1,true)(this.random) < event.hitChance) {
                                        logger.info("Spacecraft " + spacecraft.type + " was hit! Subsystem " + subsystem.type + " was destroyed.");
                                        spacecraft.subsystems.splice(spacecraft.subsystems.indexOf(subsystem), 1);
                                        federate.autoDefault(this);
                                        numHits++;
                                    }
                                }, this);
                            }
						}, this);
					}, this);
				}, this);
			}
		}, this);
	};
	
    return Context;
});