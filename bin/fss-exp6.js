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
    var argv = minimist(process.argv.slice(2)); // parse command-line arguments
	var db = mongo("fss"); // create database object
	
    /**
     * Enumerates combinations of a specified size (with or without replacement) 
	 * from a set, subject to a filtering rule.
     * @param {Boolean} repeat - True, if selections made with replacement.
     * @param {Array} set - The set of possible items.
     * @param {Number} n - The number of selections.
     * @param {Function} rule - The filtering rule.
     * @returns {Array} The enumeration of combinations.
     */
	function enumerate(repeat, set, n, rule) {
		var out = [];
		if(repeat) {
			pick(n, [], 0, set, out);
		} else {
			choose(n, [], 0, set, out);
		}
		return _.filter(out, rule)
	}
 
    /**
     * Recursive helper function to pick n items from a set with replacement.
     * @param {Number} n - The number of selections.
     * @param {Array} got - The set of current selections.
     * @param {Number} pos - The initial position to consider.
     * @param {Array} out - The set of selections.
     * @returns {Number} The number of selections.
     */
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
	
    /**
     * Recursive helper function to choose n items from a set without replacement.
     * @param {Number} n - The number of selections.
     * @param {Array} got - The set of current selections.
     * @param {Number} pos - The initial position to consider.
     * @param {Array} out - The set of selections.
     * @returns {Number} The number of selections.
     */
	function choose(n, got, pos, from, out) {
		var cnt = 0;
		if (got.length == n) {
			out.push(_.clone(got));
			return 1;
		}
		for (var i = pos; i < from.length; i++) {
			got.push(from[i]);
			cnt += choose(n, got, i+1, from, out);
			got.pop();
		}
		
		return cnt;
	}
	
    /**
     * Helper function to count the number of instances in an array.
     * @param {Array} array - The set of current selections.
     * @param {String} value - The value instance.
     * @returns {Number} The number of instances.
     */
	function count(array, value) {
		return _.size(_.filter(array, function(i){return i===value;}));
	}
	
    /**
     * Helper function to count the number of instances in an array.
     * @param {Array} array - The set of current selections.
     * @param {Array} values - The set of value instances.
     * @returns {Number} The number of instances.
     */
	function countIn(array, values) {
		return _.size(_.filter(array, function(i){return _.contains(values, i);}));
	}
	
    /**
     * Enumerates all possible ground stations for a player.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @returns {Array} The set of ground stations.
     */
	function enumStations(player, sector, sgl) {
		return _.map(enumerate(true, [sgl,null], 3,
			function(item) {
				return _.contains(item, sgl);
			}
		), function(item) {
			return player+".GroundSta@SUR"+sector+","+_.without(item,null).join();
		});
	}
	
    /**
     * Sizes a ground station to meet maximum demands of satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {Array} sats - The set of satellites.
     * @returns {String} The ground station design.
     */
	function sizeStation(player, sector, sgl, sats) {
		var numSGL = _.reduce(sats, function(memo, sat) {
					return Math.max(memo, (sat.match(/SGL/g) || []).length);
				}, 0);
		_.each([1,2,3,4,5,6], function(s) {
			numSGL = Math.max(numSGL, _.reduce(sats, function(memo, sat) {
				return parseInt(sat.match(/EO(\d)/)[1])===s ? 
						memo + (sat.match(/SGL/g) || []).length : memo;
			}, 0))
		});
		return _.find(enumStations(player, sector, sgl), 
				function(station) {
					return (station.match(/SGL/g) || []).length === Math.min(3, numSGL);
				})
	}
	
    /**
     * Enumerates all possible satellites of a certain capacity in an orbit.
     * @param {Number} player - The player.
     * @param {Number} capacity - The satellite capacity for subsystems.
     * @param {String} orbit - The orbit.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @returns {Array} The set of ground stations.
     */
	function enumSatellites(player, capacity, orbit, sector, sgl, isl) {
		// enumerate combinations of modules up to capacity 
		// with no replacement and removing undefined
		return _.map(enumerate(false, _.without(["VIS","SAR","DAT",sgl,isl,null],undefined), capacity,
			function(item) {
				// filter to require SGL or ISL and:
				// 	if SGL, at least one of VIS, SAR, ISL
				// 	if ISL, at least one of VIS, SAR, DAT, SGL
				return countIn(item, [sgl,isl])>=1
						&& (_.contains(item, sgl) 
							? (_.intersection(item, ["VIS","SAR",isl]).length > 0)
							: true)
						&& (_.contains(item, isl) 
							? (_.intersection(item, ["VIS","SAR","DAT",sgl]).length > 0)
							: true)
						&& !(orbit.match(/GEO/g) && _.intersection(item, ["VIS","SAR"]).length > 0)
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
	
    /**
     * Sorts an enumeration to put largest satellites first.
     * @param {Array} is - The enumerations to sort.
     * @param {Array} sats - The satellites.
     */
	function sortEnumerations(is, sats) {
		if(Array.isArray(sats[0])) {
			is.sort(function(a,b) {
				if((sats[a].join(" ").match(/,/g) || []).length 
						=== (sats[b].join(" ").match(/,/g) || []).length) {
					if((sats[a].join(" ").match(/VIS|SAR/g) || []).length
							=== (sats[b].join(" ").match(/VIS|SAR/g) || []).length) {
						return (sats[b].join(" ").match(/VIS/g) || []).length 
							- (sats[a].join(" ").match(/VIS/g) || []).length;
					} else {
						return (sats[b].join(" ").match(/VIS|SAR/g) || []).length 
							- (sats[a].join(" ").match(/VIS|SAR/g) || []).length;
					}
				} else {
					return (sats[b].join(" ").match(/,/g) || []).length 
						- (sats[a].join(" ").match(/,/g) || []).length;
				}
			});
		} else {
			is.sort(function(a,b) {
				if((sats[a].match(/,/g) || []).length 
						=== (sats[b].match(/,/g) || []).length) {
					if((sats[a].match(/VIS|SAR/g) || []).length
							=== (sats[b].match(/VIS|SAR/g) || []).length) {
						return (sats[b].match(/VIS/g) || []).length 
							- (sats[a].match(/VIS/g) || []).length;
					} else {
						return (sats[b].match(/VIS|SAR/g) || []).length 
							- (sats[a].match(/VIS|SAR/g) || []).length;
					}
				} else {
					return (sats[b].match(/,/g) || []).length 
						- (sats[a].match(/,/g) || []).length;
				}
			});
		}
	}
	
    /**
     * Enumerates all single satellites for a player.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x1 satellites.
     */
	function enum1x1Sats(player, sector, sgl, isl) {
		// return all possible small, medium, and large sats
		return _.union(
			enumSatellites(player, 2, "MEO", sector, sgl, isl), 
			enumSatellites(player, 4, "MEO", sector, sgl, isl), 
			enumSatellites(player, 6, "MEO", sector, sgl, isl)
		);
	}
	
    /**
     * Enumerates all Pareto-optimal single satellites for a player.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @returns {Array} The set of 1x1 satellites.
     */
	function enumBest1x1Sats(player, sector, sgl) {
		// hard-coded based on previous tradespace
		return [
			player + ".SmallSat@MEO" + sector + ",SAR," + sgl,
			player + ".SmallSat@MEO" + sector + ",VIS," + sgl
		];
	}
	
    /**
     * Enumerates all N satellites for a player.
     * @param {Number} number - The number of satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of satellite designs.
     */
	function enum1xNSats(number, player, sector, sgl, isl) {
		var satsSGL = [];
		var satsISL = [];
		_.each(_.range(0,number,1), function(i) {
			satsSGL.push(enumBest1x1Sats(player, (sector-1+(6-i))%6+1, sgl, isl));
			satsISL.push(enum1x1Sats(player, (sector-1+(6-i))%6+1, sgl, isl));
		});
		
		return _.union(
				// enumerate all combinations of SGL/SGL
				_.map(enumerate(true, _.range(0,satsSGL[0].length,1), number, 
					function(is) {
						// require SGL, at least one sensor, and no ISL
						// on each satellite
						return _.every(is, function(i) {
									return satsSGL[0][i].match(/SGL/g) 
										&& satsSGL[0][i].match(/VIS|SAR/g)
										&& !satsSGL[0][i].match(/ISL/g)
								});
					}), function(is) {
						sortEnumerations(is, satsSGL[0]);
						return _.map(_.range(0,number,1), function(i) {
								return satsSGL[i][is[i]];
							});
					}
				), 
				// enumerate all combinations of ISL/ISL
				_.map(enumerate(true, _.range(0,satsISL[0].length,1), number, 
					function(is) {
						// require ISL and SGL in each satellite
						// and at least one sensor or ISL on one satellite
						return _.every(is, function(i) {
									return satsISL[0][i].match(/ISL/g)
											&& satsISL[0][i].match(/SGL/g) 
								}) && _.some(is, function(i) {
									return satsISL[0][i].match(/VIS|SAR|ISL/g);
								}) && _.reduce(is, function(memo, i) {
									return memo + (satsISL[0][i].match(/MediumSat/g) || []).length
								}, 0) <= 2
								&& _.reduce(is, function(memo, i) {
									return memo + (satsISL[0][i].match(/LargeSat/g) || []).length
								}, 0) <= 1;
					}), function(is) {
						sortEnumerations(is, satsISL[0]);
						return _.map(_.range(0,number,1), function(i) {
								return satsISL[i][is[i]];
							});
					}
				));
	}
	
    /**
     * Enumerates all designs for N satellites owned by 1 player.
     * @param {Number} number - The number of satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of satellite designs.
     */
	function enum1xNSatDesigns(number, player, sector, sgl, isl) {
		// enumerate all satellites
		return _.map(enum1xNSats(number, player, (sector-1+(6-1))%6+1, sgl, isl), 
				function(sats) {
					// return design as sats plus sized station
					return [sats.join(" "), sizeStation(player,sector,sgl,sats)].join(" ");
				});
	}
	
    /**
     * Enumerates all sets of N satellites owned by P players.
     * @param {Number} number - The number of satellites.
     * @param {Array} players - The players.
     * @param {Array} sectors - The sectors.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of satellite designs.
     */
	function enumPxNSats(number, players, sectors, sgl, isl) {
		var sats = [];
		_.each(_.range(0,players.length,1), function(i) {
			sats.push(enum1xNSats(number, players[i], sectors[i], sgl, isl))
		});
		return _.union(
				// enumerate all combinations of satellites for SGL
				_.map(enumerate(true, _.range(0,sats[0].length,1), players.length, 
					function(is) {
						// require SGL, at least one sensor, and no ISL
						// on each satellite
						return _.every(is, function(i) {
								return _.every(sats[0][i], function(j) {
										return j.match(/SGL/g) 
												&& j.match(/SAR|VIS/g) 
												&& !j.match(/ISL/g);
									});
							}) && _.reduce(is, function(memo, i) {
										return memo + (sats[0][i].join(" ").match(/MediumSat/g) || []).length
									}, 0) <= 2
							&& _.reduce(is, function(memo, i) {
										return memo + (sats[0][i].join(" ").match(/LargeSat/g) || []).length
									}, 0) <= 1;
					}), function(is) {
						sortEnumerations(is, sats[0]);
						return _.map(_.range(0,players.length,1), function(i) {
									return sats[i][is[i]];
								});
					}
				),
				// enumerate all combinations of 1 satellites for ISL
				_.map(enumerate(true, _.range(0,sats[0].length,1), players.length, 
					function(is) {
						// require all satellites have SGL and ISL
						// and at least one satellite to have a sensor
						return _.every(is, function(i) {
								return _.every(sats[0][i], function(j) {
										return j.match(/SGL/g) && j.match(/ISL/g);
									});
							}) && _.some(is, function(i) {
								return _.some(sats[0][i], function(j) {
										return j.match(/SAR|VIS/g);
									});
							}) && _.reduce(is, function(memo, i) {
										return memo + (sats[0][i].join(" ").match(/MediumSat/g) || []).length
									}, 0) <= 2 
							&& _.reduce(is, function(memo, i) {
										return memo + (sats[0][i].join(" ").match(/LargeSat/g) || []).length
									}, 0) <= 1;
					}), function(is) {
						sortEnumerations(is, sats[0]);
						return _.map(_.range(0,players.length,1), function(i) {
									return sats[i][is[i]];
								});
					}
				));
	}
	
    /**
     * Enumerates all designs for N satellites owned by P players.
     * @param {Number} number - The number of satellites.
     * @param {Array} players - The players.
     * @param {Array} sectors - The sectors.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of satellite designs.
     */
	function enumPxNSatDesigns(number, players, sectors, sgl, isl) {
		return _.map(enumPxNSats(number, players, _.map(sectors, 
				function(sector) { 
					return (sector-1+(6-1))%6+1;
				}), sgl, isl), 
				function(pSats) {
					return _.map(pSats, function(sats, i) {
						return [sats.join(" "), sizeStation(players[i],sectors[i],sgl,sats)].join(" ");
					}).join(" ");
				});
	}
	
    /**
     * Enumerates all symmetric sets of N satellites owned by P players.
     * @param {Number} number - The number of satellites.
     * @param {Array} players - The players.
     * @param {Array} sectors - The sectors.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of satellite designs.
     */
	function enumSymmetricPxNSats(number, players, sectors, sgl, isl) {
		var sats = [];
		_.each(_.range(0,players.length,1), function(i) {
			sats.push(enum1xNSats(number, players[i], sectors[i], sgl, isl))
		});
		return _.map(_.range(0,sats[0].length,1), function(i) {
					return _.map(_.range(0,players.length,1), function(p) {
								return sats[p][i];
							});
				});
	}
	
    /**
     * Enumerates all symmetric designs for N satellites owned by P players.
     * @param {Number} number - The number of satellites.
     * @param {Array} players - The players.
     * @param {Array} sectors - The sectors.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of satellite designs.
     */
	function enumSymmetricPxNSatDesigns(number, players, sectors, sgl, isl) {
		return _.map(enumSymmetricPxNSats(number, players, _.map(sectors, 
				function(sector) { 
					return (sector-1+(6-1))%6+1;
				}), sgl, isl), 
			function(pSats) {
				return _.map(pSats, function(sats, i) {
					return [sats.join(" "), sizeStation(players[i],sectors[i],sgl,sats)].join(" ");
				}).join(" ");
			});
	}
	
	/*
	var runs = _.union(
			enumPxNSatDesigns(1,[1],[1],"pSGL","pISL"), 
			enumPxNSatDesigns(2,[1],[1],"pSGL","pISL"),
			enumPxNSatDesigns(3,[1],[1],"pSGL","pISL"),
			enumPxNSatDesigns(4,[1],[1],"pSGL","pISL"),
			enumPxNSatDesigns(5,[1],[1],"pSGL","pISL"),
			enumPxNSatDesigns(6,[1],[1],"pSGL","pISL"),
			enumPxNSatDesigns(1,[1,2],[1,6],"pSGL","oISL"),
			enumPxNSatDesigns(1,[1,2],[1,6],"oSGL","oISL"),
			enumPxNSatDesigns(2,[1,2],[1,5],"pSGL","oISL"),
			enumPxNSatDesigns(2,[1,2],[1,5],"oSGL","oISL"),
			enumPxNSatDesigns(3,[1,2],[1,4],"pSGL","oISL"),
			enumPxNSatDesigns(3,[1,2],[1,4],"oSGL","oISL"),
			enumPxNSatDesigns(1,[1,2,3],[1,6,5],"pSGL","oISL"),
			enumPxNSatDesigns(1,[1,2,3],[1,6,5],"oSGL","oISL"),
			enumPxNSatDesigns(2,[1,2,3],[1,5,3],"pSGL","oISL"),
			enumPxNSatDesigns(2,[1,2,3],[1,5,3],"oSGL","oISL")
		);
	
	runs = _.filter(runs, function(run) {
		return !run.match(/VIS/g);
	})
	*/
	var runs = _.union(
			enumSymmetricPxNSatDesigns(1,[1],[1],"pSGL","pISL"), 
			enumSymmetricPxNSatDesigns(2,[1],[1],"pSGL","pISL"),
			enumSymmetricPxNSatDesigns(3,[1],[1],"pSGL","pISL"),
			enumSymmetricPxNSatDesigns(4,[1],[1],"pSGL","pISL"),
			enumSymmetricPxNSatDesigns(5,[1],[1],"pSGL","pISL"),
			enumSymmetricPxNSatDesigns(6,[1],[1],"pSGL","pISL"),
			enumSymmetricPxNSatDesigns(1,[1,2],[1,6],"oSGL","oISL"),
			enumSymmetricPxNSatDesigns(2,[1,2],[1,5],"oSGL","oISL"),
			enumSymmetricPxNSatDesigns(3,[1,2],[1,4],"oSGL","oISL"),
			enumSymmetricPxNSatDesigns(1,[1,2],[1,6],"pSGL","oISL"),
			enumSymmetricPxNSatDesigns(2,[1,2],[1,5],"pSGL","oISL"),
			enumSymmetricPxNSatDesigns(3,[1,2],[1,4],"pSGL","oISL")
		);
	
	//console.log(runs)
	console.log(runs.length)
	
	var start = _.isNumber(argv.start)?argv.start:0;
	var stop = _.isNumber(argv.stop)?argv.stop:100;
	var batchSize = _.isNumber(argv.bsize)?argv.bsize:3;
	
	execute(runs, batchSize, start, stop, function() { db.close(); });
	
	function execute(runs, batchSize, startSeed, stopSeed, exeComplete) {
		console.info('Executing ' + runs.length + ' runs for seeds ' + startSeed + '-' + stopSeed);
		var currentSeed = startSeed;
		function runsDone() {
			currentSeed++;
			if(currentSeed < stopSeed) {
				console.info('execution ' + ((currentSeed-startSeed)/(stopSeed-startSeed)*100) + "% complete")
				executeRuns(runs, batchSize, currentSeed, runsDone);
			} else {
				exeComplete();
			}
		}
		if(currentSeed < stopSeed) {
			executeRuns(runs, batchSize, startSeed, runsDone);
		}
	}
	function executeRuns(runs, batchSize, seed, runsDone) {
		console.info('Executing ' + runs.length + ' runs for seed ' + seed);
		var counter = 0;
		function batchDone() {
			counter+=batchSize;
			if(counter < runs.length) {
				console.info('seed ' + seed + ': ' + (counter/runs.length*100) + "% complete")
				executeBatch(runs.slice(counter,Math.min(counter+batchSize, runs.length)), seed, batchDone)
			} else {
				runsDone();
			}
		}
		if(counter < runs.length) {
			executeBatch(runs.slice(counter,Math.min(counter+batchSize, runs.length)), seed, batchDone);
		}
	}
	function executeBatch(runs, seed, batchDone) {
		var execCounter = 0;
		_.each(runs, function(run) {
			var numPlayers = parseInt(_.max(run.match(/(\d)\./g)))
			var ops = ' ';
			if(numPlayers===1) {
				ops = ' -o d6 ';
			} else if(numPlayers>1) {
				ops = ' -o n -f d6 ';
			}
			var exec = child_process.exec, child;
			var command = 'node fss -d 24 -i 0 -p ' + numPlayers + ops
					+ run + ' -s ' + seed;
			child = exec(command, function(error, stdout, stderr) {
				if (error !== null) {
					logger.error('exec error: ' + error);
				}
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
					db.collection('exp6s').update(
						{run: run, seed: seed, player: player},
						{$set: 
							{
								initialCash: initialCash, 
								finalCash: finalCash,
								stations: (run.match(new RegExp((player+1)+'\\.GroundSta', 'g')) || []).length,
								satellites: (run.match(new RegExp((player+1)+'\\.(?:Small|Medium|Large)Sat', 'g')) || []).length,
								totalStations: (run.match(/GroundSta/g) || []).length,
								totalSatellites: (run.match(/(?:Small|Medium|Large)Sat/g) || []).length,
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
								if(execCounter===runs.length) {
									batchDone();
								}
							}
						}
					);
				});
			});
		});
	}
})