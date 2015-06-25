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
	var db = mongo("fss", ["exp4"]); // create database object
	
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
		return _.map(enumerate(false, _.without(["VIS","SAR","DAT","DEF",sgl,isl,null],undefined), capacity,
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
     * Enumerates all 1x1 satellites.
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
     * Enumerates all designs for 1x1 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x1 satellite designs.
     */
	function enum1x1SatDesigns(player, sector, sgl, isl) {
		// enumerate all 1 satellites
		return _.map(_.filter(enum1x1Sats(player, sector, sgl, isl), 
			function(sat) {
				// filter to require SGL and at least 1 of SAR or VIS
				return sat.match(/SGL/g) && (sat.match(/SAR|VIS/g) || []).length >= 1;
			}), function(sat) {
				// return design as sat plus sized station
				return [sat, sizeStation(player,sector,sgl,[sat])].join(" ");
			});
	}
	
    /**
     * Enumerates Pareto-optimal 1x1 satellites for a player.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @returns {Array} The set of 1x1 satellites.
     */
	function enumBest1x1Sats(player, sector, sgl) {
		// hard-coded based on previous tradespace
		return [
			player + ".SmallSat@MEO" + sector + ",SAR," + sgl,
			player + ".SmallSat@MEO" + sector + ",VIS," + sgl,
			player + ".MediumSat@MEO" + sector + ",SAR,DEF," + sgl,
			player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl
		];
	}
	
    /**
     * Enumerates all designs for 1x2 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x2 satellite designs.
     */
	function enum1x2SatDesigns(player, sector, sgl, isl) {
		var sat1SGL = enumBest1x1Sats(player, sector, sgl);
		var sat2SGL = enumBest1x1Sats(player, (sector-1+5)%6+1, sgl);
		var sat1ISL = enum1x1Sats(player, sector, sgl, isl);
		var sat2ISL = enum1x1Sats(player, (sector-1+5)%6+1, sgl, isl);
		
		return _.union(
				// enumerate all combinations of SGL/SGL
				_.map(enumerate(true, _.range(0,sat1SGL.length,1), 2, 
					function(is) {
						// allow all combinations
						return true;
					}), function(is) {
							// order to place sensors / larger sat in sector 1
							if((sat1SGL[is[0]].match(/VIS|SAR/g) || []).length 
										< (sat1SGL[is[1]].match(/VIS|SAR/g) || []).length
									|| (sat1SGL[is[0]].match(/,/g) || []).length 
										< (sat1SGL[is[1]].match(/,/g) || []).length) {
								return [sat1SGL[is[1]], sat2SGL[is[0]], 
									sizeStation(player,sector,sgl,
									[sat1SGL[is[1]], sat2SGL[is[0]]])].join(" ");
							} else {
								return [sat1SGL[is[0]], sat2SGL[is[1]], 
									sizeStation(player,sector,sgl,
									[sat1SGL[is[0]], sat2SGL[is[1]]])].join(" ");
							}
					}
				), 
				// enumerate all combinations of ISL/ISL
				_.map(enumerate(true, _.range(0,sat1ISL.length,1), 2, 
					function(is) {
						// require ISL and SGL in each satellite
						// and at least one sensor on one satellite
						return sat1ISL[is[0]].match(/ISL/g) 
								&& sat1ISL[is[1]].match(/ISL/g) 
								&& sat1ISL[is[0]].match(/SGL/g) 
								&& sat1ISL[is[1]].match(/SGL/g)
								&& (sat1ISL[is[0]].match(/VIS|SAR/g) 
									|| sat1ISL[is[1]].match(/VIS|SAR/g));
					}), function(is) {
						// order to place sensors / larger sat in sector 1
						if((sat1ISL[is[0]].match(/VIS|SAR/g) || []).length 
									< (sat1ISL[is[1]].match(/VIS|SAR/g) || []).length
								|| (sat1ISL[is[0]].match(/,/g) || []).length 
									< (sat1ISL[is[1]].match(/,/g) || []).length ) {
							return [sat1ISL[is[1]], sat2ISL[is[0]], 
								sizeStation(player,sector,sgl,
									[sat1ISL[is[1]], sat2ISL[is[0]]])].join(" ");
						} else {
							return [sat1ISL[is[0]], sat2ISL[is[1]], 
								sizeStation(player,sector,sgl,
									[sat1ISL[is[0]], sat2ISL[is[1]]])].join(" ");
						}
					}
				));
	}
	
    /**
     * Enumerates Pareto-optimal 1x2 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x2 satellites.
     */
	function enumBest1x2Sats(player, sector, sgl,isl) {
		// hard-coded based on previous tradespace
		return [
			[player + ".SmallSat@MEO" + sector + ",SAR," + sgl, 
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl],
			[player + ".SmallSat@MEO" + sector + ",VIS," + sgl, 
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl],
			[player + ".SmallSat@MEO" + sector + ",SAR," + sgl,  
				player + ".SmallSat@MEO" + sector + ",VIS," + sgl],
			[player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl + "," + isl,  
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + "," + sgl + "," + isl],
			[player + ".MediumSat@MEO" + sector + ",SAR,DEF," + sgl,  
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl],
			[player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl,  
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl],
			[player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl,  
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",VIS," + sgl],
			[player + ".LargeSat@MEO" + sector + ",VIS,DAT,DEF," + sgl + "," + isl,  
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + "," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl, 
				 player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + "," + sgl + "," + isl],
			[player + ".MediumSat@MEO" + sector + ",SAR,DEF," + sgl,  
				player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl + "," + sgl],
			[player + ".LargeSat@MEO" + sector + ",VIS,DAT,DEF," + sgl + "," + isl,  
				player + ".MediumSat@MEO" + ((sector-1+5)%6+1) + ",DEF," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,  
				player + ".MediumSat@MEO" + ((sector-1+5)%6+1) + ",DEF," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,  
				player + ".LargeSat@MEO" + ((sector-1+5)%6+1) + ",VIS,SAR,DEF," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DAT,DEF," + sgl + "," + isl,  
				player + ".LargeSat@MEO" + ((sector-1+5)%6+1) + ",VIS,SAR,DEF," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DAT,DEF," + sgl + "," + isl,  
				player + ".LargeSat@MEO" + ((sector-1+5)%6+1) + ",VIS,SAR,DAT,DEF," + sgl + "," + isl],
		];
	}
	
    /**
     * Enumerates all designs for 1x3 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x3 satellite designs.
     */
	function enum1x3SatDesigns(player, sector, sgl, isl) {
		return _.flatten(
				// enumerate all best 2 satellites
				_.map(enumBest1x2Sats(player, sector, sgl, isl), 
					function(sats12) {
						return _.union(
								// enumerate all best 1 satellites for SGL
								_.map(enumBest1x1Sats(player, ((sector-1+4)%6+1), sgl), 
									function(sat3) {
										return [sats12[0],sats12[1],sat3,
											sizeStation(player,sector,sgl,
												[sats12[0],sats12[1],sat3])].join(" ");
									}
								), 
								// enumerate all 1 satellites for ISL
								_.map(_.filter(enum1x1Sats(player, ((sector-1+4)%6+1), sgl, isl), 
									function(sat3) {
										// require satellite to have ISL and SGL
										return sats12[0].match(/ISL/g) && sat3.match(/ISL/g) && sat3.match(/SGL/g);
									}), function(sat3) {
										return [sats12[0],sats12[1],sat3,
											sizeStation(player,sector,sgl,
												[sats12[0],sats12[1],sat3])].join(" ");
									}
								));
					}
				));
	}
	
    /**
     * Enumerates Pareto-optimal 1x3 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x3 satellites.
     */
	function enumBest1x3Sats(player, sector, sgl, isl) {
		// hard-coded based on previous tradespace
		return [
			[player + ".SmallSat@MEO" + sector + ",SAR," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + ",SAR," + sgl],
			[player + ".SmallSat@MEO" + sector + ",VIS," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + ",SAR," + sgl],
			[player + ".SmallSat@MEO" + sector + ",VIS," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + ",VIS," + sgl],
			[player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl + "," + isl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + "," + sgl + "," + isl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + ",VIS," + sgl],
			[player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + ",SAR," + sgl],
			[player + ".MediumSat@MEO" + sector + ",VIS,DEF," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + ",SAR," + sgl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + ",VIS," + sgl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + "," + sgl + "," + isl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + "," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,
				player + ".SmallSat@MEO" + ((sector-1+5)%6+1) + "," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+4)%6+1) + ",DAT," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+5)%6+1) + ",DEF," + sgl + "," + isl,
				player + ".SmallSat@MEO" + ((sector-1+4)%6+1) + "," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+5)%6+1) + ",DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+4)%6+1) + ",DAT," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+5)%6+1) + ",DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+4)%6+1) + ",DEF," + sgl + "," + isl],
			[player + ".LargeSat@MEO" + sector + ",VIS,SAR,DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+5)%6+1) + ",DEF," + sgl + "," + isl,
				player + ".MediumSat@MEO" + ((sector-1+4)%6+1) + ",DAT,DEF," + sgl + "," + isl],
		];
	}
	
    /**
     * Enumerates all designs for 1x4 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 1x4 satellite designs.
     */
	function enum1x4SatDesigns(player, sector, sgl, isl) {
		return _.flatten(
				// enumerate all best 3 satellites
				_.map(enumBest1x3Sats(player, sector, sgl, isl), 
					function(sats13) {
						return _.union(
								// enumerate all best 1 satellites for SGL
								_.map(enumBest1x1Sats(player, sector+3, sgl), 
									function(sat4) {
										return [sats13[0], sats13[1], sats13[2], sat4, 
												sizeStation(player,sector,sgl,
													[sats13[0], sats13[1], sats13[2], sat4])].join(" ")
									}
								),
								// enumerate all 1 satellites for ISL							
								_.map(_.filter(enum1x1Sats(player, sector+3, sgl, isl), 
									function(sat4) {
										// require satellite to have ISL and SGL
										return sats13[0].match(/ISL/g) 
												&& sat4.match(/ISL/g) 
												&& sat4.match(/SGL/g);
									}), function(sat4) {
										return [sats13[0], sats13[1], sats13[2], sat4, 
												sizeStation(player,sector,sgl,
													[sats13[0], sats13[1], sats13[2], sat4])].join(" ")
									}
								));
					}
				));
	}
	
    /**
     * Enumerates all designs for 2x1 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 2x1 satellite designs.
     */
	function enum2x1SatDesigns(players, sectors, sgl, isl) {
		var p1satsSGL = enumBest1x1Sats(players[0], sectors[0], sgl);
		var p2satsSGL = enumBest1x1Sats(players[1], sectors[1], sgl);
		var p1satsISL = enum1x1Sats(players[0], sectors[0], sgl, isl);
		var p2satsISL = enum1x1Sats(players[1], sectors[0]+1, sgl, isl);
		
		return _.union(
				// enumerate all combinations of 1 satellites for SGL
				_.map(enumerate(true, _.range(0,p1satsSGL.length,1), 2, 
					function(is) {
						// allow all combinations
						return true;
					}), function(is) {
						// order to place sensors / larger sat in sector 1
						if((p1satsSGL[is[0]].match(/VIS|SAR/g) || []).length 
									< (p1satsSGL[is[1]].match(/VIS|SAR/g) || []).length
								|| (p1satsSGL[is[0]].match(/,/g) || []).length 
									< (p1satsSGL[is[1]].match(/,/g) || []).length) {
							return [p1satsSGL[is[1]], sizeStation(players[0],sectors[0],sgl,[p1satsSGL[is[1]]]), 
									p2satsSGL[is[0]], sizeStation(players[1],sectors[1],sgl,[p2satsSGL[is[0]]])].join(" ");
						} else {
							return [p1satsSGL[is[0]], sizeStation(players[0],sectors[0],sgl,[p1satsSGL[is[0]]]), 
									p2satsSGL[is[1]], sizeStation(players[1],sectors[1],sgl,[p2satsSGL[is[1]]])].join(" ");
						}
					}
				), 
				// enumerate all combinations of 1 satellites for ISL
				_.map(enumerate(true, _.range(0,p1satsISL.length,1), 2, 
					function(is) {
						// require all satellites have SGL, at least one sensor,
						// and equal numbers of ISL
						return p1satsISL[is[0]].match(/SGL/g) && p1satsISL[is[1]].match(/SGL/g)
								&& (p1satsISL[is[0]].match(/SAR|VIS/g) || []).length >= 1
								&& (p1satsISL[is[1]].match(/SAR|VIS/g) || []).length >= 1
								&& !p1satsISL[is[0]].match(/pISL/g) 
								&& !p1satsISL[is[1]].match(/pISL/g)
								&& (p1satsISL[is[0]].match(/ISL/g) || []).length 
									=== (p1satsISL[is[1]].match(/ISL/g) || []).length
					}), function(is) {
						// order to place sensors / larger sat in sector 1
						if((p1satsISL[is[0]].match(/VIS|SAR/g) || []).length 
									< (p1satsISL[is[1]].match(/VIS|SAR/g) || []).length
								|| (p1satsISL[is[0]].match(/,/g) || []).length 
									< (p1satsISL[is[1]].match(/,/g) || []).length) {
							return [p1satsISL[is[1]], sizeStation(players[0],sectors[0],sgl,[p1satsISL[is[1]]]), 
									p2satsISL[is[0]], sizeStation(players[1],sectors[1],sgl,[p2satsISL[is[0]]])].join(" ");
						} else {
							return [p1satsISL[is[0]], sizeStation(players[0],sectors[0],sgl,[p1satsISL[is[0]]]), 
									p2satsISL[is[1]], sizeStation(players[1],sectors[1],sgl,[p2satsISL[is[1]]])].join(" ");
						}
					}
				));
	}
	
    /**
     * Enumerates all designs for 2x1.5 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 2x1.5 satellite designs.
     */
	function enum2x1_5SatDesigns(players, sectors, sgl, isl) {
		var p2satsSGL = enumBest1x1Sats(players[1], sectors[1], sgl);
		var p2satsISL = enum1x1Sats(players[1], sectors[0]+1, sgl, isl);
		
		return _.flatten(
				// enumerate all best 2 satellites
				_.map(enumBest1x2Sats(players[0], sectors[0], sgl, isl), 
					function(sats12) {
						var p2sats = (sats12[0].match(/ISL/g) || sats12[1].match(/ISL/g)) ? p2satsISL : p2satsSGL;
						return _.map(_.filter(p2sats, function(sat3) {
									// require satellite to have SGL, at least one sensor,
									// and equal numbers of ISL
									return sat3.match(/SGL/g)
											&& (sat3.match(/SAR|VIS/g) || []).length >= 1
											&& !sat3.match(/pISL/g)
											&& (sat3.match(/ISL/g) || []).length 
												=== Math.max((sats12[0].match(/ISL/g) || []).length,
													(sats12[1].match(/ISL/g) || []).length)
								}), function(sat3) {
									return [sats12[0], sats12[1], sizeStation(players[0],sectors[0],sgl,sats12), 
											sat3, sizeStation(players[1],sectors[1],sgl,[sat3])].join(" ");
								});
					}
				));
	}
	
    /**
     * Enumerates all designs for 2x2 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 2x2 satellite designs.
     */
	function enum2x2SatDesigns(players, sectors, sgl, isl) {
		var p1sats = enumBest1x2Sats(players[0], sectors[0], sgl, isl);
		var p2sats = enumBest1x2Sats(players[1], sectors[1], sgl, isl);
		// enumerate all combinations of best 2 satellites
		return _.map(enumerate(true, _.range(0,p1sats.length,1), 2, 
			function(is) {
				// allow all combinations
				return true;
			}), function(is) {				
				// order to place sensors / larger sat in sector 1
				if((p1sats[is[0]][0].match(/VIS|SAR/g) || []).length 
								+ (p1sats[is[0]][1].match(/VIS|SAR/g) || []).length 
							< (p2sats[is[1]][0].match(/VIS|SAR/g) || []).length
								+ (p2sats[is[1]][1].match(/VIS|SAR/g) || []).length
						|| (p1sats[is[0]][0].match(/,/g) || []).length 
								+ (p1sats[is[0]][1].match(/,/g) || []).length 
							< (p2sats[is[1]][0].match(/,/g) || []).length
								+ (p2sats[is[1]][1].match(/,/g) || []).length) {
					return [p1sats[is[1]][0], p1sats[is[1]][1], 
							sizeStation(players[0],sectors[0],sgl,
								p1sats[is[1]]), 
							p2sats[is[0]][0], p2sats[is[0]][1], 
							sizeStation(players[1],sectors[1],sgl,
								p2sats[is[0]])].join(" ");
				} else {
					return [p1sats[is[0]][0], p1sats[is[0]][1], 
							sizeStation(players[0],sectors[0],sgl,
								p1sats[is[0]]), 
							p2sats[is[1]][0], p2sats[is[1]][1], 
							sizeStation(players[1],sectors[1],sgl,
								p2sats[is[1]])].join(" ");
				}
			});
	}
	
    /**
     * Enumerates all designs for 2x2_5 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 2x2.5 satellite designs.
     */
	function enum2x2_5SatDesigns(players, sectors, sgl, isl) {
		return _.flatten(
				//enumerate all best 3 satellites
				_.map(enumBest1x3Sats(players[0], sectors[0], sgl, isl), 
					function(sats13) {
						//enumerate all best 2 satellites
						return _.map(enumBest1x2Sats(players[1], sectors[1], sgl, isl), 
								function(sats45) {
									return [sats13[0], sats13[1], sats13[2], 
											sizeStation(players[0],sectors[0],sgl,sats13),
											sats45[0], sats45[1], 
											sizeStation(players[1],sectors[1],sgl,
												sats45)].join(" ");
								});
					}
				));
	}
	
    /**
     * Enumerates all designs for 2x3 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 2x3 satellite designs.
     */
	function enum2x3SatDesigns(players, sectors, sgl, isl) {
		var p1sats = enumBest1x3Sats(players[0], sectors[0], sgl, isl);
		var p2sats = enumBest1x3Sats(players[1], sectors[1], sgl, isl);
		
		// enumerate all combinations of best 3 satellites
		return _.map(enumerate(true, _.range(0,p1sats.length,1), 2, 
				function(is) {
					// allow all combinations
					return true;
				}), function(is) {
					// order to place sensors / larger sat in sector 1
					if((p1sats[is[0]][0].match(/VIS|SAR/g) || []).length 
									+ (p1sats[is[0]][1].match(/VIS|SAR/g) || []).length 
									+ (p1sats[is[0]][2].match(/VIS|SAR/g) || []).length 
								< (p2sats[is[1]][0].match(/VIS|SAR/g) || []).length
									+ (p2sats[is[1]][1].match(/VIS|SAR/g) || []).length
									+ (p2sats[is[1]][2].match(/VIS|SAR/g) || []).length
							|| (p1sats[is[0]][0].match(/,/g) || []).length 
									+ (p1sats[is[0]][1].match(/,/g) || []).length 
									+ (p1sats[is[0]][2].match(/,/g) || []).length 
								< (p2sats[is[1]][0].match(/,/g) || []).length
									+ (p2sats[is[1]][1].match(/,/g) || []).length
									+ (p2sats[is[1]][2].match(/,/g) || []).length) {
						return [p1sats[is[1]][0], p1sats[is[1]][1], p1sats[is[1]][2], 
								sizeStation(players[0],sectors[0],sgl,p1sats[is[1]]), 
								p2sats[is[0]][0], p2sats[is[0]][1], p2sats[is[0]][2], 
								sizeStation(players[1],sectors[1],sgl,p2sats[is[0]])].join(" ");
					} else {
						return [p1sats[is[0]][0], p1sats[is[0]][1], p1sats[is[0]][2], 
								sizeStation(players[0],sectors[0],sgl,p1sats[is[0]]), 
								p2sats[is[1]][0], p2sats[is[1]][1], p2sats[is[1]][2], 
								sizeStation(players[1],sectors[1],sgl,p2sats[is[1]])].join(" ");
					}
				});
	}
	
    /**
     * Enumerates all designs for 3x1 satellites for a player.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 3x1 satellite designs.
     */
	function enum3x1SatDesigns(players, sectors, sgl, isl) {
		var p1satsSGL = enumBest1x1Sats(players[0], sectors[0], sgl);
		var p2satsSGL = enumBest1x1Sats(players[1], sectors[1], sgl);
		var p3satsSGL = enumBest1x1Sats(players[2], sectors[2], sgl);
		
		var p1satsISL = enum1x1Sats(players[0], sectors[0], sgl, isl);
		var p2satsISL = enum1x1Sats(players[1], sectors[0]+1, sgl, isl);
		var p3satsISL = enum1x1Sats(players[2], sectors[0]+2, sgl, isl);
		
		return _.union(
				// enumerate all combinations of best 1 satellites for SGL
				_.map(enumerate(true, _.range(0,p1satsSGL.length,1), 3, 
					function(is) {
						// allow all combinations
						return true;
					}), function(is) {
						is.sort(function(a,b) {
							// order to place sensors / larger sat in sector 1
							if((p1satsSGL[a].match(/VIS|SAR/g) || []).length ===
									(p1satsSGL[b].match(/VIS|SAR/g) || []).length) {
								return (p1satsSGL[a].match(/,/g) || []).length 
									- (p1satsSGL[b].match(/,/g) || []).length
							} else {
								return (p1satsSGL[a].match(/VIS|SAR/g) || []).length 
									- (p1satsSGL[b].match(/VIS|SAR/g) || []).length
							}
						});
						return [p1satsSGL[is[0]], sizeStation(players[0],sectors[0],sgl,[p1satsSGL[is[0]]]), 
									p2satsSGL[is[1]], sizeStation(players[1],sectors[1],sgl,[p2satsSGL[is[1]]]), 
									p3satsSGL[is[2]], sizeStation(players[2],sectors[2],sgl,[p3satsSGL[is[2]]])].join(" ");
					}
				// enumerate all combinations of 1 satellites for ISL
				), _.map(enumerate(true, _.range(0,p1satsISL.length,1), 3, 
					function(is) {
						// require every satellite to have SGL, ISL, and at least one sensor
						// disallow both SAR and VIS sensors on one satellite (reduce tradespace)
						return _.every(is, function(i) {
									return p1satsISL[i].match(/SGL/g) 
										&& p1satsISL[i].match(/ISL/g)
										&& !(p1satsISL[i].match(/SAR/g) && p1satsISL[i].match(/VIS/g))
										// && !(p1satsISL[i].match(/DAT/g) && p1satsISL[i].match(/DEF/g))
										&& (p1satsISL[i].match(/SAR|VIS/g) || []).length >= 1
										&& !p1satsISL[i].match(/pISL/g);
								}) && (p1satsISL[is[0]].match(/ISL/g) || []).length 
									=== (p1satsISL[is[1]].match(/ISL/g) || []).length
									&& (p1satsISL[is[0]].match(/ISL/g) || []).length 
									=== (p1satsISL[is[2]].match(/ISL/g) || []).length
					}), function(is) {
						is.sort(function(a,b) {
							// order to place sensors / larger sat in sector 1
							if((p1satsISL[a].match(/VIS|SAR/g) || []).length ===
									(p1satsISL[b].match(/VIS|SAR/g) || []).length) {
								return (p1satsISL[a].match(/,/g) || []).length 
									- (p1satsISL[b].match(/,/g) || []).length
							} else {
								return (p1satsISL[a].match(/VIS|SAR/g) || []).length 
									- (p1satsISL[b].match(/VIS|SAR/g) || []).length
							}
						});
						return [p1satsISL[is[0]], sizeStation(players[0],sectors[0],sgl,[p1satsISL[is[0]]]), 
									p2satsISL[is[1]], sizeStation(players[1],sectors[1],sgl,[p2satsISL[is[1]]]), 
									p3satsISL[is[2]], sizeStation(players[2],sectors[2],sgl,[p3satsISL[is[2]]])].join(" ");
					}
				));
	}
	
    /**
     * Enumerates all designs for 3x2 satellites.
     * @param {Number} player - The player.
     * @param {Number} sector - The sector.
     * @param {String} sgl - The SGL protocol.
     * @param {String} isl - The ISL protocol.
     * @returns {Array} The set of 3x2 satellite designs.
     */
	function enum3x2SatDesigns(players, sectors, sgl, isl) {
		var p1sats = enumBest1x2Sats(players[0], sectors[0], sgl, isl);
		var p2sats = enumBest1x2Sats(players[1], sectors[1], sgl, isl);
		var p3sats = enumBest1x2Sats(players[2], sectors[2], sgl, isl);
		// enumerate all combinations of best 2 satellites
		return _.map(enumerate(true, _.range(0,p1sats.length,1), 3, 
			function(is) {
				// require every satellite to have ISL or not
				return _.every(is, function(i) {
							return !p1sats[i].join(" ").match(/ISL/g);
						}) || _.every(is, function(i) {
							return p1sats[i].join(" ").match(/ISL/g);
						});
			}), function(is) {
				is.sort(function(a,b) {
					// order to place sensors / larger sat in sector 1
					if((p1sats[a].join(" ").match(/VIS|SAR/g) || []).length ===
							(p1sats[b].join(" ").match(/VIS|SAR/g) || []).length) {
						return (p1sats[a].join(" ").match(/,/g) || []).length 
							- (p1sats[b].join(" ").match(/,/g) || []).length
					} else {
						return (p1sats[a].join(" ").match(/VIS|SAR/g) || []).length 
							- (p1sats[b].join(" ").match(/VIS|SAR/g) || []).length
					}
				});
				return [p1sats[is[0]].join(" "), sizeStation(players[0],sectors[0],sgl,p1sats[is[0]]), 
							p2sats[is[1]].join(" "), sizeStation(players[1],sectors[1],sgl,p2sats[is[1]]), 
							p3sats[is[2]].join(" "), sizeStation(players[2],sectors[2],sgl,p3sats[is[2]])].join(" ");
			});
	}
	
	var runs = enum1x1SatDesigns(1,1, "pSGL", "pISL");
	var runs = enum1x2SatDesigns(1,1,"pSGL","pISL")
	var runs = enum1x3SatDesigns(1,1,"pSGL","pISL")
	var runs = enum1x4SatDesigns(1,1,"pSGL","pISL");
	
	var runs = _.union(
			enum2x1SatDesigns([1,2],[1,4],"pSGL","oISL"),
			enum2x1SatDesigns([1,2],[1,4],"oSGL","oISL"));
	var runs = _.union(
			enum2x1_5SatDesigns([1,2],[1,4],"pSGL","oISL"),
			enum2x1_5SatDesigns([1,2],[1,4],"oSGL","oISL"));
	var runs = _.union(
			enum2x2SatDesigns([1,2],[1,3],"pSGL","oISL"),
			enum2x2SatDesigns([1,2],[1,3],"oSGL","oISL"));
	var runs = _.union(
			enum2x2_5SatDesigns([1,2],[1,3],"pSGL","oISL"),
			enum2x2_5SatDesigns([1,2],[1,3],"oSGL","oISL"));
	var runs = _.union(
			enum2x3SatDesigns([1,2],[1,4],"pSGL","oISL"),
			enum2x3SatDesigns([1,2],[1,4],"oSGL","oISL"));
	var runs1x = _.union(
			enum1x1SatDesigns(1,1, "pSGL", "pISL"),
			enum1x2SatDesigns(1,1,"pSGL","pISL"),
			enum1x3SatDesigns(1,1,"pSGL","pISL"),
			enum1x4SatDesigns(1,1,"pSGL","pISL"));
	var runs2x = _.union(
			enum2x1SatDesigns([1,2],[1,4],"pSGL","oISL"),
			enum2x1SatDesigns([1,2],[1,4],"oSGL","oISL"),
			enum2x1_5SatDesigns([1,2],[1,4],"pSGL","oISL"),
			enum2x1_5SatDesigns([1,2],[1,4],"oSGL","oISL"),
			enum2x2SatDesigns([1,2],[1,3],"pSGL","oISL"),
			enum2x2SatDesigns([1,2],[1,3],"oSGL","oISL"),
			enum2x2_5SatDesigns([1,2],[1,3],"pSGL","oISL"),
			enum2x2_5SatDesigns([1,2],[1,3],"oSGL","oISL"),
			enum2x3SatDesigns([1,2],[1,3],"pSGL","oISL"),
			enum2x3SatDesigns([1,2],[1,3],"oSGL","oISL"));
	var runs3x = _.union(
			enum3x1SatDesigns([1,2,3],[1,3,5],"pSGL","oISL"),
			enum3x1SatDesigns([1,2,3],[1,3,5],"oSGL","oISL"),
			enum3x2SatDesigns([1,2,3],[1,3,5],"pSGL","oISL"),
			enum3x2SatDesigns([1,2,3],[1,3,5],"oSGL","oISL"));
	var runs = _.union(
			enum3x2SatDesigns([1,2,3],[1,3,5],"pSGL","oISL"),
			enum3x2SatDesigns([1,2,3],[1,3,5],"oSGL","oISL"))
	
	//console.log(runs)
	console.log(runs.length)
	
	var start = _.isNumber(argv.start)?argv.start:0;
	var stop = _.isNumber(argv.stop)?argv.stop:100;
	var batchSize = _.isNumber(argv.bsize)?argv.bsize:3;
	
	//execute(runs, batchSize, start, stop function() { db.close(); });
	/*
	execute(_.union(
			enum1x2SatDesigns(1,1,"pSGL","pISL"),
			enum1x3SatDesigns(1,1,"pSGL","pISL"),
			enum1x4SatDesigns(1,1,"pSGL","pISL"))
			, 4, 100, 200, 
			function() {
				execute(_.union(
						enum2x2SatDesigns([1,2],[1,3],"pSGL","oISL"),
						enum2x2SatDesigns([1,2],[1,3],"oSGL","oISL"),
						enum2x2_5SatDesigns([1,2],[1,3],"pSGL","oISL"),
						enum2x2_5SatDesigns([1,2],[1,3],"oSGL","oISL"),
						enum2x3SatDesigns([1,2],[1,3],"pSGL","oISL"),
						enum2x3SatDesigns([1,2],[1,3],"oSGL","oISL"),
						enum3x1SatDesigns([1,2,3],[1,3,5],"pSGL","oISL"),
						enum3x1SatDesigns([1,2,3],[1,3,5],"oSGL","oISL"))
						, 4, 20, 100, 
							function() {
								db.close();
							}
				);
			}
	);
	execute(_.union(enum2x3SatDesigns([1,2],[1,4],"pSGL","oISL"), 
			enum2x3SatDesigns([1,2],[1,4],"oSGL","oISL")), 
			batchSize, 0, 79, function() { db.close(); });
	*/
	
	
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
							db.collection('exp4').update(
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
	
    /**
     * Executes a simulation run.
     * @param {String} run - The design specification.
     * @param {Number} start - The starting seed.
     * @param {Number} stop - The stopping seed.
     * @param {Number} batchSize - The batch size.
     * @param {Function} runDone - The callback when the run is done.
     *
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
	
    /**
     * Executes a simulation batch.
     * @param {String} run - The design specification.
     * @param {Number} batchStart - The starting seed.
     * @param {Number} batchStop - The stopping seed.
     * @param {Function} batchDone - The callback when the batch is done.
     *
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
							db.collection('exp4').update(
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
		
	//executeRun(runs[runCounter], start, stop, batchSize, runCallback)
	*/
})