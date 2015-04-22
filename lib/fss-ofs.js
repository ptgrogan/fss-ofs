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
    var fss = {version: "0.0.1"};
    
    fss.Context = require('context');
    fss.Contract = require('contract');
    fss.Data = require('data');
    fss.Defense = require('defense');
    fss.Demand = require('demand');
    fss.Disturbance = require('disturbance');
    fss.Event = require('event');
    fss.Federate = require('federate');
    fss.Federation = require('federation');
    fss.GroundStation = require('groundStation');
    fss.Location = require('location');
    fss.Orbit = require('orbit');
    fss.Spacecraft = require('spacecraft');
    fss.Subsystem = require('subsystem');
    fss.Sensor = require('sensor');
    fss.Storage = require('storage');
    fss.Transceiver = require('transceiver');
    fss.SpaceGroundLink = require('spaceGroundLink');
    fss.InterSatelliteLink = require('interSatelliteLink');
    fss.Surface = require('surface');
    fss.System = require('system');
    fss.Operations = require('operations');
    fss.SimpleOperations = require('simpleOperations');
    fss.DynamicOperations = require('dynamicOperations');
    
    return fss;
});