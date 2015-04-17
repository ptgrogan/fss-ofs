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
 * A module to represent an abstract operations model.
 * @module simpleOperations
 */
define('operations', function(require) {
    var mas = require("mas");
    
    function Operations() {
        // initialize superclass (assigns above attributes with arguments)
        mas.sim.Entity.apply(this, arguments);
    };
    
    Operations.prototype = new mas.sim.Entity();
    
    /**
     * Executes this operations model.
     * @param {object} federate - The federate.
     * @param {object} context - The context.
     */
    Operations.prototype.execute = function(federate, context) { }
    
    return Operations;
});