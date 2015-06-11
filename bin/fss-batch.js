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
 
var requirejs = require('requirejs');

requirejs(['underscore','winston','child_process','minimist','mongojs'], function(_,logger,child_process,minimist,mongo) {
    var argv = minimist(process.argv.slice(2));
	var db = mongo("fss", ["results"]);

	var runs = [
		"1.SmallSat@LEO1,VIS,pSGL 1.GroundSta@SUR1,pSGL", // 0
		"1.SmallSat@LEO1,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 1
		"1.SmallSat@MEO1,VIS,pSGL 1.GroundSta@SUR1,pSGL", // 2
		"1.SmallSat@MEO1,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 3
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.GroundSta@SUR1,pSGL", // 4
		"1.SmallSat@LEO1,SAR,pSGL 1.SmallSat@LEO3,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 5
		"1.SmallSat@LEO1,VIS,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL", // 6
		"1.SmallSat@LEO1,SAR,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL", // 7
		"1.MediumSat@LEO1,SAR,VIS,DEF,pSGL 1.MediumSat@LEO3,SAR,VIS,DEF,pSGL 1.MediumSat@LEO5,SAR,VIS,DEF,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL 1.GroundSta@SUR5,pSGL", // 8
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.SmallSat@LEO5,VIS,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL 1.GroundSta@SUR5,pSGL", // 9
		"1.SmallSat@LEO1,SAR,pSGL 1.SmallSat@LEO3,SAR,pSGL 1.SmallSat@LEO5,SAR,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL 1.GroundSta@SUR5,pSGL", // 10
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.SmallSat@LEO5,VIS,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL", // 11
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.SmallSat@LEO5,VIS,pSGL 1.GroundSta@SUR1,pSGL", // 12
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR3,pSGL", // 13
		"1.SmallSat@LEO1,SAR,pSGL 1.SmallSat@LEO3,SAR,pSGL 1.SmallSat@LEO5,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 14
		"1.MediumSat@LEO1,SAR,VIS,DEF,pSGL 1.MediumSat@LEO3,SAR,VIS,DEF,pSGL 1.MediumSat@LEO5,SAR,VIS,DEF,pSGL 1.GroundSta@SUR1,pSGL", // 15
		"1.MediumSat@LEO1,SAR,VIS,DEF,pSGL 1.GroundSta@SUR1,pSGL", // 16
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 17
		"1.MediumSat@LEO1,VIS,DAT,DEF,pSGL 1.GroundSta@SUR1,pSGL", // 18
		"1.MediumSat@LEO1,VIS,DAT,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 19
		"1.SmallSat@LEO6,VIS,pISL 1.SmallSat@GEO1,pISL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL", // 20
		"1.SmallSat@LEO6,VIS,pISL 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL", // 21
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL,DEF,DAT 1.GroundSta@SUR1,pSGL,pSGL", // 22
		"1.LargeSat@LEO6,SAR,VIS,pISL,pISL,DEF,DAT 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 23
		"1.MediumSat@LEO1,VIS,DAT,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 24
		"1.MediumSat@LEO1,VIS,DAT,pSGL,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 25
		"1.LargeSat@LEO1,VIS,DAT,SAR,pSGL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 26
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO1,SAR,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 27
		"1.SmallSat@LEO6,VIS,pISL 1.MediumSat@LEO1,pISL,pISL,pSGL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL", // 28
		"1.SmallSat@LEO6,VIS,pISL 1.SmallSat@LEO1,pISL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO3,pISL,pSGL 1.GroundSta@SUR1,pSGL", // 29
		"1.SmallSat@LEO6,VIS,pISL 1.MediumSat@LEO1,VIS,pISL,pSGL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.MediumSat@LEO3,VIS,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 30
		"1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@GEO3,pISL,pISL 1.SmallSat@LEO4,VIS,pISL 1.SmallSat@GEO5,pISL,pISL 1.SmallSat@LEO6,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL", // 31
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO3,VIS,pSGL 1.SmallSat@LEO4,VIS,pISL 1.SmallSat@LEO5,VIS,pSGL 1.SmallSat@LEO6,VIS,pISL 1.MediumSat@GEO1,pSGL,pSGL,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 32
		"1.SmallSat@MEO1,VIS,pSGL 1.SmallSat@MEO2,VIS,pSGL 1.SmallSat@MEO3,VIS,pSGL 1.SmallSat@MEO4,VIS,pSGL 1.SmallSat@MEO5,VIS,pSGL 1.SmallSat@MEO6,VIS,pSGL 1.GroundSta@SUR1,pSGL", // 33
		"1.SmallSat@MEO1,SAR,pSGL 1.SmallSat@MEO2,SAR,pSGL 1.SmallSat@MEO3,SAR,pSGL 1.SmallSat@MEO4,SAR,pSGL 1.SmallSat@MEO5,SAR,pSGL 1.SmallSat@MEO6,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 34
		"1.SmallSat@MEO1,VIS,pSGL 1.SmallSat@MEO2,VIS,pSGL 1.SmallSat@MEO3,VIS,pSGL 1.SmallSat@MEO4,VIS,pSGL 1.SmallSat@MEO5,VIS,pSGL 1.SmallSat@MEO6,VIS,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR4,pSGL", // 35
		"1.SmallSat@MEO1,SAR,pSGL 1.SmallSat@MEO2,SAR,pSGL 1.SmallSat@MEO3,SAR,pSGL 1.SmallSat@MEO4,SAR,pSGL 1.SmallSat@MEO5,SAR,pSGL 1.SmallSat@MEO6,SAR,pSGL 1.GroundSta@SUR1,pSGL 1.GroundSta@SUR4,pSGL", // 36
		"1.MediumSat@LEO1,VIS,pISL,pSGL,pSGL 1.MediumSat@LEO2,VIS,DAT,pISL,pISL 1.MediumSat@LEO3,VIS,pISL,pSGL,pSGL 1.MediumSat@LEO4,VIS,DAT,pISL,pISL 1.MediumSat@LEO5,VIS,pISL,pSGL,pSGL 1.MediumSat@LEO6,VIS,DAT,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL", // 37
		"1.MediumSat@LEO1,VIS,pISL,pSGL,pSGL 1.MediumSat@LEO2,VIS,DEF,pISL,pISL 1.MediumSat@LEO3,VIS,pISL,pSGL,pSGL 1.MediumSat@LEO4,VIS,DEF,pISL,pISL 1.MediumSat@LEO5,VIS,pISL,pSGL,pSGL 1.MediumSat@LEO6,VIS,DEF,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL", // 38
		"1.MediumSat@LEO1,VIS,pISL,pISL,pSGL 1.MediumSat@LEO2,VIS,pISL,pISL,pISL 1.MediumSat@LEO3,VIS,pISL,pISL,pSGL 1.MediumSat@LEO4,VIS,pISL,pISL,pISL 1.MediumSat@LEO5,VIS,pISL,pISL,pSGL 1.MediumSat@LEO6,VIS,pISL,pISL,pISL 1.LargeSat@GEO1,pSGL,pSGL,pSGL,pISL,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 39
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 40
		"1.MediumSat@LEO6,VIS,DAT,pISL,pISL 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 41
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@LEO2,VIS,SAR,pISL,pISL 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 42
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@LEO2,VIS,SAR,pISL,pISL 1.MediumSat@LEO4,VIS,SAR,pISL,pISL 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 43
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@LEO2,VIS,SAR,pISL,pISL 1.MediumSat@LEO4,VIS,SAR,pISL,pISL 1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 44
	];
	
	if(_.isNumber(argv.run) && (argv.run >= 0) && (argv.run < runs.length)) {
		var run = argv.run;
		var start = _.isNumber(argv.start)?argv.start:0
		var stop = _.isNumber(argv.stop)?argv.stop:10
		
		var counter = 0;
		var batchCounter = 0;
		var batchSize = _.isNumber(argv.bsize)?argv.bsize:100;
		
		console.info('Executing run ' + run + ' for seeds ' + start + ' to ' + stop);
		var executeBatch = function(batchStart, batchStop) {
			console.info('Executing batch for seeds ' + batchStart + ' to ' + batchStop);
			_.each(_.range(batchStart, batchStop, 1), function(seed) {
				var exec = child_process.exec, child;
				child = exec('node fss -d 12 -p 1 -i 1200 -o d ' 
						+ runs[run] + ' -r ' + run + ' -s ' + seed, 
						function(error, stdout, stderr) {
							logger.info('Result for seed ' + seed + ': ' + stdout);
							var values = stdout.replace('\n','').split(',');
							_.each(values, function(value, player) {
								var initialCash = value.split(':')[0];
								var finalCash = value.split(':')[1];
								db.collection('results').update(
									{run: run, seed: seed, player: player},
									{$set: 
										{
											initialCash: parseFloat(initialCash), 
											finalCash: parseFloat(finalCash),
											stations: (runs[run].match(/GroundSta/g) || []).length,
											isl: ((runs[run].match(/ISL/g) || []).length>0)
										}
									},
									{ upsert: true },
									function(err, result) {
										if(err!==null) {
											logger.error(err);
										}
										batchCounter++;
										if(batchCounter===batchSize || batchCounter===batchStop-batchStart) {
											batchCounter = 0;
											if(stop > batchStop) {
												executeBatch(batchStart+batchSize, Math.min(batchStart+2*batchSize, stop));
											}
										}
										counter++;
										if(counter===stop-start) {
											db.close();
										}
									}
								);
							});
							if (error !== null) {
								logger.error('exec error: ' + error);
							}
						});
			});
		}
		
		executeBatch(start, Math.min(start+batchSize, stop));
	} else {
		logger.error('Invalid run number ' + argv.r + '. Must be 0 <= run <= ' + (runs.length-1));
	}
})