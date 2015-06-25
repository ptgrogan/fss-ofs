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
	var db = mongo("fss", ["exp2"]);
	
	function enumerate(set, n, rule) {
		var out = [];
		pick(n, [], 0, set, out);
		return _.filter(out, rule)
	}
 
	function pick(n, got, pos, from, out) {
		var cnt = 0;
		if (got.length == n) {
			out.push(_.clone(got))
			return 1;
		}
		for (var i = pos; i < from.length; i++) {
			got.push(from[i]);
			cnt += pick(n, got, i, from, out);
			got.pop();
		}
		return cnt;
	}
	
	function count(array, value) {
		return _.size(_.filter(array, function(i){return i===value;}));
	}
	function countIn(array, values) {
		return _.size(_.filter(array, function(i){return _.contains(values, i);}));
	}
	function enumStations(player, sector, protocolSGL) {
		return _.map(enumerate([protocolSGL,null], 3,
			function(item) {
				return _.contains(item, protocolSGL);
			}
		), function(item) {
			return player+".GroundSta@SUR"+sector+","+_.without(item,null).join();
		});
	}
	function enumSatellites(player, capacity, orbit, sector, protocolSGL, protocolISL) {
		return _.map(enumerate(_.without(["VIS","SAR","DAT","DEF",protocolSGL,protocolISL,null],undefined), capacity,
			function(item) {
				return countIn(item, [protocolSGL,protocolISL])>=1
						&& (_.contains(item, protocolSGL)?(_.contains(item, "VIS") || _.contains(item, "SAR") || _.contains(item, protocolISL)):true)
						&& (!_.contains(item, protocolISL)?count(item, "SGL")<=countIn(item, ["VIS","SAR","DAT"]):true)
						&& countIn(item, ["VIS", "SAR", "DAT"])<=1+countIn(item, [protocolSGL, protocolISL])
						&& count(item, protocolSGL)<=countIn(item, [protocolISL, "VIS", "SAR", "DAT"])
						&& (orbit==="GEO"?countIn(item, ["VIS", "SAR"])===0:true)
						&& count(item, "VIS")<=1
						&& count(item, "SAR")<=1
						&& count(item, "DEF")<=1
						&& count(item, null)<2
			}
		), function(item) {
			var size = '';
			if(capacity===2) {
				size = 'Small';
			} else if(capacity===4) {
				size = 'Medium';
			} else if(capacity===6) {
				size = 'Large';
			}
			return player+"."+size+"Sat@"+orbit+sector+","+_.without(item,null).join();
		});
	}
	function enumSingleSats(player, sector, protocolSGL, protocolISL) {
		return _.union(
				enumSatellites(player, 2, "MEO", sector, protocolSGL, protocolISL), 
				enumSatellites(player, 4, "MEO", sector, protocolSGL, protocolISL), 
				enumSatellites(player, 6, "MEO", sector, protocolSGL, protocolISL)
		);
	}
	function enumBestSingleSats(player, sector, protocolSGL) {
		return [
		player + ".SmallSat@MEO" + sector + ",SAR," + protocolSGL,
		player + ".SmallSat@MEO" + sector + ",VIS," + protocolSGL,
		player + ".MediumSat@MEO" + sector + ",SAR,DEF," + protocolSGL,
		player + ".MediumSat@MEO" + sector + ",SAR,DAT," + protocolSGL + "," + protocolSGL,
		player + ".MediumSat@MEO" + sector + ",VIS,DAT," + protocolSGL + "," + protocolSGL,
		player + ".LargeSat@MEO" + sector + ",SAR,DAT,DEF," + protocolSGL + "," + protocolSGL,
		player + ".LargeSat@MEO" + sector + ",SAR,DAT,DAT," + protocolSGL + "," + protocolSGL + "," + protocolSGL,
		player + ".LargeSat@MEO" + sector + ",VIS,DAT,DAT," + protocolSGL + "," + protocolSGL + "," + protocolSGL,
		player + ".LargeSat@MEO" + sector + ",VIS,SAR,DAT," + protocolSGL + "," + protocolSGL + "," + protocolSGL,
		];
	}
	function enumBestDualSats(player, sector, protocolSGL) {
		return [
		];
	}
	function enumBestTripleSats(player, sector, protocolSGL) {
		return [	
		];
	}
	function enumSingleSatDesigns(player, sector, protocolSGL, protocolISL) {
		var stations = enumStations(player, 1, protocolSGL);
		return _.map(_.filter(enumSingleSats(player, sector, protocolSGL, protocolISL), 
		function(sat) {
			return sat.match(protocolSGL) 
					&& !sat.match(protocolISL) 
					&& (sat.match(/SAR/g) || []).length + (sat.match(/VIS/g) || []).length >= 1;
		}), function(sat) {
			return [sat, _.find(stations, function(station) {
						return (station.match(/SGL/g) || []).length === 
							(sat.match(/SGL/g) || []).length;
					}, this)].join(" ");
		});
	}
	
	function enumDualSats(player, sector, protocolSGL, protocolISL) {
		var out = [];
		
		out = _.union(out, enumerate(
			enumBestSingleSats(player, sector, protocolSGL), 2, 
			function(sats) {
				return (!sats[0].match(/VIS/g) || !sats[1].match(/VIS/g))
						&& (!sats[0].match(/SAR/g) || !sats[1].match(/SAR/g));
			}
		));
		_.each(enumBestSingleSats(player, sector, protocolSGL), function(sat1) {
			_.each(enumBestSingleSats(player, sector+5, protocolSGL), function(sat2) {
				out.push([sat1, sat2]);
			});
		});
		if(protocolISL !== undefined) {
			_.each(enumSingleSats(player, sector, protocolSGL, protocolISL), function(sat1) {
				_.each(enumSingleSats(player, sector+5, protocolSGL, protocolISL), function(sat2) {
					var sats = [sat1, sat2];
					if(sats[0].match(/ISL/g) && sats[1].match(/ISL/g)
							&& sats[0].match(/SGL/g) && sats[1].match(/SGL/g)
							&& sats[0].match(/VIS|SAR/g) && sats[1].match(/VIS|SAR/g)
							&& (sats[0].match(/ISL/g) || []).length 
								<= Math.max((sats[0].match(/(?:SAR|VIS|DAT)/g) || []).length, 
									(sats[0].match(/SGL/g) || []).length)
							&& (sats[1].match(/ISL/g) || []).length 
								<= Math.max((sats[1].match(/(?:SAR|VIS|DAT)/g) || []).length, 
									(sats[1].match(/SGL/g) || []).length)
							&& (sats[0].match(/ISL/g) || []).length + (sats[1].match(/ISL/g) || []).length 
								<= 2*((sats[0].match(/(?:SGL|DAT)/g) || []).length 
									+ (sats[1].match(/(?:SGL|DAT)/g) || []).length)
							&& (sats[0].match(/SGL/g) || []).length + (sats[1].match(/SGL/g) || []).length 
								<= (sats[0].match(/(?:SAR|VIS|DAT)/g) || []).length 
									+ (sats[1].match(/(?:SAR|VIS|DAT)/g) || []).length
							&& (sats[0].match(/DAT/g) || []).length <= 1
							&& (sats[1].match(/DAT/g) || []).length <= 1
							&& (sats[0].match(/ISL/g) || []).length <= 1
							&& (sats[0].match(/ISL/g) || []).length 
								 === (sats[1].match(/ISL/g) || []).length) {
						out.push(sats)
					}
				})
			})
		}
		return out;
	}
	
	function enumDualSatDesigns(player, sector, protocolSGL, protocolISL) {
		var stations = enumStations(player, 1, protocolSGL);
		return _.map(enumDualSats(player, sector, protocolSGL, protocolISL), function(sats) {
			return [sats[0], sats[1], _.find(stations, function(station) {
						var numSGL = 0;
						if(sats[0].match(/EO(\d)/)[1]===sats[1].match(/EO(\d)/)[1]) {
							numSGL = (sats[0].match(/SGL/g) || []).length 
									+ (sats[1].match(/SGL/g) || []).length;
						} else {
							numSGL = Math.max((sats[0].match(/SGL/g) || []).length, 
								(sats[1].match(/SGL/g) || []).length)
						}
						return (station.match(/SGL/g) || []).length === 
								Math.min(3, numSGL);
					}, this)].join(" ");
		});
	}
	function enumTripleSats(player, sector, protocolSGL, protocolISL) {
		var out = [];
		
		// sequential sectors (SGL)
		_.each(enumBestDualSats(player, sector, protocolSGL), function(sats12) {
			_.each(enumBestSingleSats(player, sector+2, protocolSGL), function(sat3) {
				out.push([sats12[0],sats12[1],sat3])
			});
		});

		return out;
	}
	function enumTripleSatDesigns(player, sector, protocolSGL, protocolISL) {
		var stations = enumStations(player, 1, protocolSGL);
		return _.map(enumTripleSats(player, sector, protocolSGL, protocolISL), function(sats) {
			return [sats[0], sats[1], sats[2], _.find(stations, function(station) {
						var numSGL = 0;
						if(sats[0].match(/EO(\d)/)[1]===sats[1].match(/EO(\d)/)[1]) {
							numSGL = Math.max((sats[0].match(/SGL/g) || []).length 
										+ (sats[1].match(/SGL/g) || []).length, 
									(sats[2].match(/SGL/g) || []).length);
						} else {
							numSGL = Math.max(Math.max((sats[0].match(/SGL/g) || []).length, 
								(sats[1].match(/SGL/g) || []).length),
								(sats[2].match(/SGL/g) || []).length);
						}
						return (station.match(/SGL/g) || []).length === 
								Math.min(3, numSGL);
					}, this)].join(" ");
		});
	}
	function enumQuadSats(player, sector, protocolSGL, protocolISL) {
		var out = [];
		
		// sequential sectors (SGL)
		_.each(enumBestTripleSats(player, sector, protocolSGL), function(sats13) {
			_.each(_.union(enumBestSingleSats(player, sector, protocolSGL),
					enumBestSingleSats(player, sector+4, protocolSGL),
					enumBestSingleSats(player, sector+2, protocolSGL)), function(sat4) {
				out.push([sats13[0],sats13[1],sats13[2],sat4])
			});
			/*
			_.each(_.filter(_.union(enumSatellites(player, 2, "MEO", sector+5, protocolSGL, protocolISL),
					enumSatellites(player, 4, "MEO", sector, protocolSGL, protocolISL),
					enumSatellites(player, 6, "MEO", sector, protocolSGL, protocolISL)
					), function(sat) {
						return sat.match(protocolSGL) && !sat.match(protocolISL) 
							&& (sat.match(/SAR/g) || []).length + (sat.match(/VIS/g) || []).length >= 1
							&& (sat.match(/DAT/g) || []).length <= 1
					}), function(sat4) {
				out.push([sats13[0],sats13[1],sats13[2],sat4])
			});
			*/
		});

		return out;
	}
	function enumQuadSatDesigns(player, sector, protocolSGL, protocolISL) {
		var stations = enumStations(player, 1, protocolSGL);
		return _.map(_.filter(enumQuadSats(player, sector, protocolSGL, protocolISL),function(sats) {
			return (sats[0].match(/EO1.*VIS/) || []).length 
					+ (sats[1].match(/EO1.*VIS/) || []).length 
					+ (sats[2].match(/EO1.*VIS/) || []).length 
					+ (sats[3].match(/EO1.*VIS/) || []).length <= 1
					&& (sats[0].match(/EO1.*SAR/) || []).length 
					+ (sats[1].match(/EO1.*SAR/) || []).length 
					+ (sats[2].match(/EO1.*SAR/) || []).length 
					+ (sats[3].match(/EO1.*SAR/) || []).length <= 1
					&& (sats[0].match(/EO3.*VIS/) || []).length 
					+ (sats[1].match(/EO3.*VIS/) || []).length 
					+ (sats[2].match(/EO3.*VIS/) || []).length 
					+ (sats[3].match(/EO3.*VIS/) || []).length <= 1
					&& (sats[0].match(/EO3.*SAR/) || []).length 
					+ (sats[1].match(/EO3.*SAR/) || []).length 
					+ (sats[2].match(/EO3.*SAR/) || []).length 
					+ (sats[3].match(/EO3.*SAR/) || []).length <= 1
					&& (sats[0].match(/EO5.*VIS/) || []).length 
					+ (sats[1].match(/EO5.*VIS/) || []).length 
					+ (sats[2].match(/EO5.*VIS/) || []).length 
					+ (sats[3].match(/EO5.*VIS/) || []).length <= 1
					&& (sats[0].match(/EO5.*SAR/) || []).length 
					+ (sats[1].match(/EO5.*SAR/) || []).length 
					+ (sats[2].match(/EO5.*SAR/) || []).length 
					+ (sats[3].match(/EO5.*SAR/) || []).length <= 1;
		}), function(sats) {
			return [sats[0], sats[1], sats[2], sats[3], _.find(stations, function(station) {
						var numSGL = 0;
						numSGL = Math.max(numSGL, 
								(sats[0].match(/EO1/)?(sats[0].match(/SGL/g) || []).length:0) +
								(sats[1].match(/EO1/)?(sats[1].match(/SGL/g) || []).length:0) +
								(sats[2].match(/EO1/)?(sats[2].match(/SGL/g) || []).length:0) +
								(sats[3].match(/EO1/)?(sats[3].match(/SGL/g) || []).length:0));
						numSGL = Math.max(numSGL, 
								(sats[0].match(/EO3/)?(sats[0].match(/SGL/g) || []).length:0) +
								(sats[1].match(/EO3/)?(sats[1].match(/SGL/g) || []).length:0) +
								(sats[2].match(/EO3/)?(sats[2].match(/SGL/g) || []).length:0) +
								(sats[3].match(/EO3/)?(sats[3].match(/SGL/g) || []).length:0));
						numSGL = Math.max(numSGL, 
								(sats[0].match(/EO5/)?(sats[0].match(/SGL/g) || []).length:0) +
								(sats[1].match(/EO5/)?(sats[1].match(/SGL/g) || []).length:0) +
								(sats[2].match(/EO5/)?(sats[2].match(/SGL/g) || []).length:0) +
								(sats[3].match(/EO5/)?(sats[3].match(/SGL/g) || []).length:0));
						return (station.match(/SGL/g) || []).length === 
								Math.min(numSGL, 3);
					}, this)].join(" ");
		});
	}
	
	var runs = enumSingleSatDesigns(1,1, "pSGL", "pISL");
	var runs = enumDualSatDesigns(1,1,"pSGL","pISL")
	//var runs = enumTripleSatDesigns(1,1,"pSGL","pISL")
	//var runs = enumQuadSatDesigns(1,1,"pSGL","pISL")
	//console.log(runs)
	console.log(runs.length)
	//var xRuns = enumDualSatDesigns(1,1,"pSGL",undefined)
	//runs = _.difference(runs, xRuns);
	//console.log(runs.length)
	//console.log(enumSingleSats(1,1,"pSGL","pISL").length)
	//console.log(enumDualSats(1,1,"pSGL",undefined).length)
	//console.log(enumDualSatDesigns(1,1,"pSGL",undefined))
	
	var start = _.isNumber(argv.start)?argv.start:0;
	var stop = _.isNumber(argv.stop)?argv.stop:100;
	var batchSize = _.isNumber(argv.bsize)?argv.bsize:3;
	
	function executeRun(run, start, stop, batchSize, runDone) {
		console.info('Executing run ' + run + ' for seeds ' + start + ' to ' + stop);
		var batchCounter = 0;
		var batchStarts = _.range(start, stop, batchSize);
		function batchCallback() {
			batchCounter++;
			if(batchCounter < batchStarts.length) {
				executeBatch(run, Math.min(batchStarts[batchCounter], stop), 
						Math.min(batchStarts[batchCounter]+batchSize, stop), 
						batchCallback);
			} else {
				runDone();
			}
		}
		executeBatch(run, batchStarts[batchCounter], 
				Math.min(batchStarts[batchCounter]+batchSize, stop), 
				batchCallback);
	};
	
	function executeBatch(run, batchStart, batchStop, batchDone) {
		console.info('Executing batch for seeds ' + batchStart + ' to ' + batchStop);
		var execCounter = 0;
		_.each(_.range(batchStart, batchStop, 1), function(seed) {
			var numPlayers = parseInt(_.max(run.match(/(\d)\./g)))
			var ops = ' ';
			if(numPlayers===1) {
				ops = ' -o d ';
			} else if(numPlayers>1) {
				ops = ' -o n -f d ';
			}
			var exec = child_process.exec, child;
			child = exec('node fss -d 24 -i 0 -p ' + numPlayers + ops
					+ run + ' -s ' + seed, 
					function(error, stdout, stderr) {
						if (error !== null) {
							logger.error('exec error: ' + error);
						}
						logger.info('Result for seed ' + seed + ': ' + stdout.replace('\n',''));
						var values = stdout.replace('\n','').split(',');
						var totalCost = 0;
						var totalValue = 0;
						_.each(values, function(value, player) {
							totalCost += parseFloat(value.split(':')[0]);
							totalValue += parseFloat(value.split(':')[1]);
						});
						var dbCounter = 0;
						_.each(values, function(value, player) {
							var initialCash = parseFloat(value.split(':')[0]);
							var finalCash = parseFloat(value.split(':')[1]);
							db.collection('exp3').update(
								{run: run, seed: seed, player: player},
								{$set: 
									{
										initialCash: initialCash, 
										finalCash: finalCash,
										stations: (run.match(new RegExp((player+1)+'\\.GroundSta', 'g')) || []).length,
										satellites: (run.match(new RegExp((player+1)+'\\.(?:Small|Medium|Large)Sat', 'g')) || []).length,
										isl: ((run.match(/ISL/g) || []).length>0),
										players: numPlayers,
										totalCost: totalCost,
										totalValue: totalValue,
									}
								},
								{ upsert: true },
								function(err, result) {
									if(err!==null) {
										logger.error(err);
									}
									dbCounter++;
									if(dbCounter===numPlayers) {
										execCounter++;
										if(execCounter===(batchStop-batchStart)) {
											batchDone();
										}
									}
								}
							);
						});
					});
		}, this);
	};
	
	var runCounter = 0;
	function runCallback() {
		runCounter++;
		console.log((runCounter/runs.length*100) + "% complete")
		if(runCounter < runs.length) {
			executeRun(runs[runCounter], start, stop, batchSize, runCallback);
		} else {
			db.close();
		}
	}
		
	executeRun(runs[runCounter], start, stop, batchSize, runCallback)
})