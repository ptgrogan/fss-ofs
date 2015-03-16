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
    var _ = require("underscore");
    var mas = require("mas");
    var logger = require("logger");
    
    function System() {
        this.location = undefined;
        this.cost = 0;
        this.maxSize = 0;
        this.subsystems = [];
        
        mas.sim.Entity.apply(this, arguments);
    };
    
    System.prototype = new mas.sim.Entity();
    
    System.prototype.getContentsSize = function() {
        return _.reduce(this.subsystems, function(memo, subsystem) {
            return memo + subsystem.size;
        }, 0);
    };
    
    System.prototype.isCommissioned = function() {
        if(this.location) {
            return true;
        }
        return false;
    }
    
    System.prototype.canCommission = function(location, context) {
        return false;
    }
    
    System.prototype.commission = function(location, context) {
        if(this.canCommission(location, context)) {
            this.location = location.id;
            return true;
        } else {
            return false;
        }
    }
    
    System.prototype.getDesignCost = function() {
        return _.reduce(this.subsystems, function(memo, subsystem) {
            return memo + subsystem.cost;
        }, this.cost);
    };
    
    System.prototype.getCommissionCost = function(location) {
        return 0;
    };

    System.prototype.getDecommissionValue = function(context) {
        return 0;
    };
    
    System.prototype.transfer = function(data, origin, destination) {
        if(origin.canTransferOut(data) && destination.canTransferIn(data)) {
            origin.transferOut(data);
            destination.transferIn(data);
        }
    }
    
    System.prototype.init = function(sim) {
        _.each(this.subsystems, function(subsystem) {
            subsystem.init(sim);
        });
    };
    
    System.prototype.tick = function(sim) {
        _.each(this.subsystems, function(subsystem) {
            subsystem.tick(sim);
        });
    };
    
    System.prototype.tock = function() {
        _.each(this.subsystems, function(subsystem) {
            subsystem.tock();
        });
    };
    
    System.prototype.isGround = function() {
        return false;
    }
    
    System.prototype.isSpace = function() {
        return false;
    }
    
    System.prototype.canTransmit = function(data, destination, context) {
        var location = context.getSystemLocation(this);
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
            var dataContainer;
            _.each(this.subsystems, function(subsystem) {
                if(_.contains(subsystem.contents, data)) {
                    dataContainer = subsystem;
                }
            }, this);
            var canTransmit = false;
            _.each(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver();
            }), function(transmitter) {
                _.each(_.filter(destination.subsystems, function(subsystem) {
                    return subsystem.isTransceiver();
                }), function(receiver) {
                    if(this.canTransfer(dataContainer, data, transmitter)
                            && transmitter.canTransmit(this, data, destination, receiver, context)) {
                        canTransmit = true;
                    }
                }, this);
            }, this);
            return canTransmit;
        }
        return false;
    };

    System.prototype.transmit = function(data, destination, context) {
        if(this.canTransmit(data, destination, context)) {
            var dataContainer;
            _.each(this.subsystems, function(subsystem) {
                if(_.contains(subsystem.contents, data)) {
                    dataContainer = subsystem;
                }
            }, this);
            var transmitted = false;
            _.each(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver();
            }), function(transmitter) {
                _.each(_.filter(destination.subsystems, function(subsystem) {
                    return subsystem.isTransceiver();
                }), function(receiver) {
                    if(!transmitted
                            && transmitter.canTransmit(this, data, destination, receiver, context)
                            && this.transfer(dataContainer, data, transmitter)
                            && transmitter.transmit(this, data, destination, receiver, context)) {
                        transmitted = true;
                    }
                }, this);
            }, this);
            return transmitted;
        }
        return false;
    };
    
    System.prototype.canReceive = function(origin, data, context) {
        var location = context.getSystemLocation(this);
        if(!this.isCommissioned()) {
            logger.error("System is not commissioned.");
        } else {
            var canReceive = false;
            _.each(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver();
            }), function(receiver) {
                _.each(_.filter(origin.subsystems, function(subsystem) {
                    return subsystem.isTransceiver();
                }), function(transmitter) {
                    if(receiver.canReceive(origin, transmitter, data, this, context)) {
                        canReceive = true;
                    }
                }, this);
            }, this);
            return canReceive;
        }
        return false;
    };
    
    System.prototype.receive = function(origin, data, context) {
        if(this.canReceive(origin, data, context)) {
            var received = false;
            _.each(_.filter(this.subsystems, function(subsystem) {
                return subsystem.isTransceiver();
            }), function(receiver) {
                _.each(_.filter(origin.subsystems, function(subsystem) {
                    return subsystem.isTransceiver();
                }), function(transmitter) {
                    if(!received && receiver.receive(origin, transmitter, data, this, context)) {
                        received = true;
                    }
                }, this);
            }, this);
            return received;
        }
        return false;
    };
    
    System.prototype.canTransfer = function(origin, data, destination) {
        return _.contains(this.subsystems, origin)
                && _.contains(this.subsystems, destination)
                && _.contains(origin.contents, data)
                && (origin===destination || 
                    (origin.canTransferOut(data, destination) 
                    && destination.canTransferIn(origin, data)));
    }
    
    System.prototype.transfer = function(origin, data, destination) {
        if(this.canTransfer(origin, data, destination)) {
            return (origin===destination) || (origin.transferOut(data, destination) 
                    && destination.transferIn(origin, data));
        }
        return false;
    }
    
    return System;
});