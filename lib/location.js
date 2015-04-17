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
 * A module to represent an abstract spatial location.
 * @module location
 */
define('location', function(require) {
    /** 
     * @constructor
     * @alias module:location
     */
    function Location() {
        this.sector = -1;
        
        // override default attributes in constructor
        for(var n in arguments[0]) {
            this[n] = arguments[0][n];
        }
    };
    
    /**
     * Checks if this is a surface location.
     * @returns {Boolean} True, if this is a surface location.
     */
    Location.prototype.isSurface = function() {
        return false;
    }
    
    /**
     * Checks if this is an orbital location.
     * @returns {Boolean} True, if this is an orbital location.
     */
    Location.prototype.isOrbit = function() {
        return false;
    }
    
    return Location;
});