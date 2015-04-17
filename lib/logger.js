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
 * A module containing a customized logger.
 * @module logger
 */
define(function(require) {
    var logger = require("winston");
    var argv = require("minimist")(process.argv.slice(2));
    logger.remove(logger.transports.Console);
    if(argv.l) {
        logger.add(logger.transports.Console, { level: (argv.l===true?"debug":argv.l), colorize: true });
    } else {
        logger.add(logger.transports.Console, { level: "error", colorize: true });
    }
    return logger;
});