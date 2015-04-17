
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
 * A module to represent a storage subsystem.
 * @module interSatelliteLink
 */
define('storage', function(require) {
    var Subsystem = require("subsystem");

    /** 
     * @constructor
     * @alias module:storage
     */
    function Storage() {
        this.capacity = 0;
        Subsystem.apply(this, arguments);
    };
    
    Storage.prototype = new Subsystem();
    
    /**
     * Checks if this is a storage subsystem.
     * @returns {Boolean} True, if this is storage.
     */
    Storage.prototype.isStorage = function() {
        return true;
    };
    
    /**
     * Checks if data can be transferred into this storage.
     * @param {object} origin - The data origin.
     * @param {object} data - The data.
     * @param {Boolean} True, if the data can be transferred in.
     */
    Storage.prototype.canTransferIn = function(origin, data) {
        return Subsystem.prototype.canTransferIn.apply(this, arguments)
                && this.getContentsSize() + data.size <= this.capacity;
    };

    return Storage;
});