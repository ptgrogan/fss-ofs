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
 * A module to represent an abstract system.
 * @module system
 */
define('system', function(require) {
    var _ = require("underscore");
    var mas = require("mas");
    var logger = require("logger");
    
    /** 
     * @constructor
     * @alias module:system
     */
    function System() {
        this.location = undefined;
        this.cost = 0;
        this.maxSize = 0;
        this.subsystems = [];
        
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    System.prototype = new mas.sim.Entity();
    
    /**
     * Gets the size of contained subsystems.
     * @returns {Number} The size of contained subsystems.
     */
    System.prototype.getContentsSize = function() {
        return _.reduce(this.subsystems, function(memo, subsystem) {
            return memo + subsystem.size;
        }, 0);
    };
    
    /**
     * Checks if this system is commissioned.
     * @returns {Boolean} True, if this system is commissioned.
     */
    System.prototype.isCommissioned = function() {
        if(this.location) {
            return true;
        }
        return false;
    };
    
    /**
     * Checks if this system can be commissioned.
     * @param {object} location - The location at which to commission.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system can be commissioned.
     */
    System.prototype.canCommission = function(location, context) {
        return false;
    };
    
    /**
     * Commissions this system.
     * @param {object} location - The location at which to commission.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system was commissioned.
     */
    System.prototype.commission = function(location, context) {
        if(this.canCommission(location, context)) {
            this.location = location.id;
            return true;
        } else {
            return false;
        }
    };
    
    /**
     * Gets the design cost for this system.
     * @returns {Number} The design cost of this system.
     */
    System.prototype.getDesignCost = function() {
        return _.reduce(this.subsystems, function(memo, subsystem) {
            return memo + subsystem.cost;
        }, this.cost);
    };
    
    /**
     * Gets the commission cost for this system.
     * @returns {Number} The commission cost of this system.
     */
    System.prototype.getCommissionCost = function(location) {
        return 0;
    };

    /**
     * Gets the decommission value for this system.
     * @returns {Number} The decommission value of this system.
     */
    System.prototype.getDecommissionValue = function(context) {
        return 0;
    };
    
    /**
     * Initializes this system.
     * @param {object} sim - The simulator.
     */
    System.prototype.init = function(sim) {
        _.each(this.subsystems, function(subsystem) {
            subsystem.init(sim);
        });
    };
    
    /**
     * Ticks this system to pre-compute state changes.
     * @param {object} sim - The simulator.
     */
    System.prototype.tick = function(sim) {
        _.each(this.subsystems, function(subsystem) {
            subsystem.tick(sim);
        });
    };
    
    /**
     * Tocks this system to commit state changes.
     */
    System.prototype.tock = function() {
        _.each(this.subsystems, function(subsystem) {
            subsystem.tock();
        });
    };
    
    /**
     * Checks if is a ground system.
     * @returns {Boolean} True, if this is a ground system.
     */
    System.prototype.isGround = function() {
        return false;
    };
    
    /**
     * Checks if is a space system.
     * @returns {Boolean} True, if this is a space system.
     */
    System.prototype.isSpace = function() {
        return false;
    };
    
    /**
     * Checks if this system could store data.
     * @param {String} phenomena - The data phenomena.
     * @param {Number} dataSize - The data size.
     * @returns {Boolean} True, if this system could store data.
     */
    System.prototype.couldStore = function(phenomena, dataSize) {
        return this.getAvailableCapacity(phenomena) >= dataSize;
    }
	
    /**
     * Checks if this system can store data.
     * @param {Object} data - The data.
     * @returns {Boolean} True, if this system can store data.
     */
	System.prototype.canStore = function(data) {
		if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
			var dataContainer;
			_.each(this.subsystems, function(subsystem) {
                if(_.contains(subsystem.contents, data)) {
                    dataContainer = subsystem;
                }
            }, this);
			return dataContainer.isStorage() 
				|| _.some(_.filter(this.subsystems, function(subsystem) {
						return subsystem.isStorage();
					}), function(storage) {
						return this.canTransfer(dataContainer, data, storage);
					}, this);
		}
		return false;
	}
	
    /**
     * Stores data in this system.
     * @param {Object} data - The data.
     * @returns {Boolean} True, if this system stored the data.
     */
	System.prototype.store = function(data) {
		if(this.canStore(data)) {
			var dataContainer;
			_.each(this.subsystems, function(subsystem) {
                if(_.contains(subsystem.contents, data)) {
                    dataContainer = subsystem;
                }
            }, this);
			if(dataContainer.isStorage()) {
                logger.verbose(this.getTag() + " already stored data");
                return true;
			} else if(_.some(_.filter(this.subsystems, function(subsystem) {
				return subsystem.isStorage();
			}), function(storage) {
				return this.canTransfer(dataContainer, data, storage)
						&& this.transfer(dataContainer, data, storage);
			}, this)) {
                logger.verbose(this.getTag() + " stored data");
                return true;
            }
		}
        return false;
	}
    
    /**
     * Gets the available data capacity of this system.
     * @param {String} phenomena - The data phenomena (optional).
     * @returns {Number} The available data capacity.
     */
    System.prototype.getAvailableCapacity = function(phenomena) {
        return this.getMaxCapacity(phenomena) 
                - this.getUsedCapacity(phenomena);
    };
    
    /**
     * Gets the used data capacity of this system.
     * @param {String} phenomena - The data phenomena (optional).
     * @returns {Number} The available data capacity.
     */
    System.prototype.getUsedCapacity = function(phenomena) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isStorage() 
					&& ((subsystem.isSensor() 
							&& subsystem.phenomena===phenomena)
						|| phenomena===undefined);
        }), function(memo, storage) {
            return memo + storage.getContentsSize();
        }, 0, this);
    };
    
    /**
     * Gets the maximum data capacity of this system.
     * @param {String} phenomena - The data phenomena (optional).
     * @returns {Number} The maximum data capacity.
     */
    System.prototype.getMaxCapacity = function(phenomena) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isStorage() 
					&& ((subsystem.isSensor() 
							&& subsystem.phenomena===phenomena)
						|| phenomena===undefined);
        }), function(memo, storage) {
            return memo + storage.capacity;
        }, 0, this);
    };
    
    /**
     * Gets the amount of data transmitted this turn by this system.
     * @param {String} protocol - The transmission protocol.
     * @returns {Number} The amount of data transmitted this turn.
     */
    System.prototype.getTransmitted = function(protocol) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isTransceiver() && subsystem.protocol===protocol;
        }), function(memo, transmitter) {
            return memo + transmitter.transmitted;
        }, 0, this);
    };
    
    /**
     * Gets the maximum amount of data this system can transmit.
     * @param {String} protocol - The transmission protocol.
     * @returns {Number} The maximum amount of data transmitted in one turn.
     */
    System.prototype.getMaxTransmitted = function(protocol) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isTransceiver() && subsystem.protocol===protocol;
        }), function(memo, transmitter) {
            return memo + transmitter.maxTransmitted;
        }, 0, this);
    };
    
    /**
     * Gets the amount of data received this turn by this system.
     * @param {String} protocol - The transmission protocol.
     * @returns {Number} The amount of data received this turn.
     */
    System.prototype.getReceived = function(protocol) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isTransceiver() && subsystem.protocol===protocol;
        }), function(memo, receiver) {
            return memo + receiver.received;
        }, 0, this);
    };
    
    /**
     * Gets the maximum amount of data this system can receive.
     * @param {String} protocol - The transmission protocol.
     * @returns {Number} The maximum amount of data received in one turn.
     */
    System.prototype.getMaxReceived = function(protocol) {
        return _.reduce(_.filter(this.subsystems, function(subsystem) {
            return subsystem.isTransceiver() && subsystem.protocol===protocol;
        }), function(memo, receiver) {
            return memo + receiver.maxReceived;
        }, 0, this);
    };
    
    /**
     * Checks if this system could transmit data to a destination system.
     * @param {object} protocol - The protocol (use `undefined` for any).
     * @param {object} origLoc - The origin location.
     * @param {object} destLoc - The destination location.
     * @param {object} dataSize - The data size.
     * @param {object} destination - The destination system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system could transmit data.
     */
    System.prototype.couldTransmit = function(protocol, origLoc, destLoc, dataSize, destination, context) {
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
            return _.some(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver() 
                        && (protocol===undefined || subsystem.protocol===protocol);
            }), function(transmitter) {
                return _.some(_.filter(destination.subsystems, function(subsystem) {
                    return subsystem.isTransceiver();
                }), function(receiver) {
                    return transmitter.canTransmit(origLoc, dataSize, destLoc, receiver, context);
                }, this);
            }, this);
        }
        return false;
    };
    
    /**
     * Checks if this system can transmit data to a destination system.
     * @param {object} protocol - The protocol (use `undefined` for any).
     * @param {object} data - The data.
     * @param {object} destination - The destination system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system can transmit data.
     */
    System.prototype.canTransmit = function(protocol, data, destination, context) {
        var origLoc = context.getSystemLocation(this);
        var destLoc = context.getSystemLocation(destination);
        
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
            var dataContainer;
            _.each(this.subsystems, function(subsystem) {
                if(_.contains(subsystem.contents, data)) {
                    dataContainer = subsystem;
                }
            }, this);
			if(dataContainer===undefined) {
				return false;
			}
            return _.some(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver()
                        && (protocol===undefined || subsystem.protocol===protocol);
            }), function(transmitter) {
                return _.some(_.filter(destination.subsystems, function(subsystem) {
                    return subsystem.isTransceiver();
                }), function(receiver) {
                    return (this.canTransfer(dataContainer, data, transmitter) 
                            && transmitter.canTransmit(origLoc, data.size, destLoc, receiver, context));
                }, this);
            }, this);
        }
        return false;
    };

    /**
     * Transmits data to a destination system.
     * @param {object} protocol - The protocol (use `undefined` for any).
     * @param {object} data - The data.
     * @param {object} destination - The destination system.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system transmitted data.
     */
    System.prototype.transmit = function(protocol, data, destination, context) {
        var origLoc = context.getSystemLocation(this);
        var destLoc = context.getSystemLocation(destination);
        if(this.canTransmit(protocol, data, destination, context)) {
            var dataContainer;
            _.each(this.subsystems, function(subsystem) {
                if(_.contains(subsystem.contents, data)) {
                    dataContainer = subsystem;
                }
            }, this);
            if(_.some(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver()
                        && (protocol===undefined || subsystem.protocol===protocol);
            }), function(transmitter) {
                return _.some(_.filter(destination.subsystems, function(subsystem) {
						return subsystem.isTransceiver();
					}), function(receiver) {
						return (this.canTransfer(dataContainer, data, transmitter) 
								&& transmitter.canTransmit(origLoc, data.size, destLoc, receiver, context)
								&& this.transfer(dataContainer, data, transmitter)
								&& transmitter.transmit(origLoc, data, destLoc, receiver, context));
					}, this);
            }, this)) {
                logger.verbose(this.getTag() + " transmitted data to " 
                        + destination.getTag() + " via " + protocol);
                return true;
            }
        }
        return false;
    };
    
    /**
     * Checks if this system could receive data from an origin system.
     * @param {object} protocol - The protocol (use `undefined` for any).
     * @param {object} origLoc - The origin location.
     * @param {object} destLoc - The destination location.
     * @param {object} origin - The origin system.
     * @param {object} dataSize - The data size.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system can receive data.
     */
    System.prototype.couldReceive = function(protocol, origLoc, destLoc, origin, dataSize, context) {
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
            return _.some(_.filter(this.subsystems, function(subsystem) {
					return subsystem.isTransceiver()
							&& (protocol===undefined || subsystem.protocol===protocol)
				}), function(receiver) {
					return _.some(_.filter(origin.subsystems, function(subsystem) {
						return subsystem.isTransceiver();
					}), function(transmitter) {
						return receiver.canReceive(origLoc, transmitter, dataSize, destLoc, context);
					}, this);
				}, this);
        }
        return false;
    };
    
    /**
     * Checks if this system can receive data from an origin system.
     * @param {object} protocol - The protocol (use `undefined` for any).
     * @param {object} origin - The origin system.
     * @param {object} data - The data.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system could receive data.
     */
    System.prototype.canReceive = function(protocol, origin, data, context) {
        return this.couldReceive(undefined, context.getSystemLocation(origin),
                context.getSystemLocation(this),
                origin, data.size, context);
    };
    
    /**
     * Receives data from an origin system.
     * @param {object} protocol - The protocol (use `undefined` for any).
     * @param {object} origin - The origin system.
     * @param {object} data - The data.
     * @param {object} context - The context.
     * @returns {Boolean} True, if this system received data.
     */
    System.prototype.receive = function(protocol, origin, data, context) {
        var origLoc = context.getSystemLocation(origin);
        var destLoc = context.getSystemLocation(this);
        if(this.canReceive(protocol, origin, data, context)) {
            if(_.some(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver()
                        && (protocol===undefined || subsystem.protocol===protocol);
            }), function(receiver) {
                return _.some(_.filter(origin.subsystems, function(subsystem) {
						return subsystem.isTransceiver();
					}), function(transmitter) {
						return receiver.receive(origLoc, transmitter, data, destLoc, context);
					}, this);
            }, this)) {
                logger.verbose(this.getTag() + " received data from " 
                        + origin.getTag() + " via " + protocol);
                return true;
            }
        }
        return false;
    };
    
    /**
     * Checks if this system can transfer data from an origin to a destination subsystem.
     * @param {object} origin - The origin subsystem.
     * @param {object} data - The data.
     * @param {object} destination - The destination subsystem.
     * @returns {Boolean} True, if this system can transfer data.
     */
    System.prototype.canTransfer = function(origin, data, destination) {
        return _.contains(this.subsystems, origin)
                && _.contains(this.subsystems, destination)
                && _.contains(origin.contents, data)
                && (origin===destination 
					|| (origin.canTransferOut(data) 
						&& destination.canTransferIn(data))
					|| origin.canExchange(data, destination));
    };
    
    /**
     * Transfers data from an origin to destination subsystem.
     * @param {object} origin - The origin subsystem.
     * @param {object} data - The data.
     * @param {object} destination - The destination subsystem.
     * @returns {Number} True, if this system can transfer data.
     */
    System.prototype.transfer = function(origin, data, destination) {
        if(this.canTransfer(origin, data, destination)) {
			if(origin===destination) {
                return true;
			} else if(origin.canTransferOut(data) 
					&& destination.canTransferIn(data)
					&& origin.transferOut(data) 
					&& destination.transferIn(data)) {
                logger.verbose(this.getTag() + " transferred data from " 
                        + origin.type + " to " + destination.type);
                return true;
            } else if(origin.canExchange(data, destination) 
						&& origin.exchange(data, destination)) {
                logger.verbose(this.getTag() + " exchanged data between " 
                        + origin.type + " and " + destination.type);
                return true;
            }
        }
        return false;
    };
    
    /**
     * Gets a tag for this system.
     * @returns {String} The system tag.
     */
    System.prototype.getTag = function() {
        return this.id + '@' + this.location;
    }
    
    return System;
});