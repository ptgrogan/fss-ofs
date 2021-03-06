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

requirejs(['underscore','winston','child_process','mongojs','fs'], function(_,logger,child_process,mongo,fs) {
	var db = mongo("fss");
	
	// code below inherited from https://gist.github.com/RedBeard0531/1886960
	var map = function() {
		emit({run: this.run,
			  players:this.players,
			  player: this.player,
			  stations: this.totalStations,
			  satellites: this.totalSatellites,
			  isl: this.isl,
			  init: this.initialCash,
			  totalCost: this.totalCost
			},
			 {sum: this.finalCash,
			  min: this.finalCash,
			  max: this.finalCash,
			  count:1,
			  diff: 0, // M2,n:  sum((val-mean)^2)
			  sum2: this.totalValue,
			  min2: this.totalValue,
			  max2: this.totalValue,
			  diff2: 0,
			});
	}
	 
	var reduce = function(key, values) {
		var a = values[0]; // will reduce into here
		for (var i=1/*!*/; i < values.length; i++){
			var b = values[i]; // will merge 'b' into 'a'
	 
			// temp helpers
			var delta = a.sum/a.count - b.sum/b.count; // a.mean - b.mean
			var delta2 = a.sum2/a.count - b.sum2/b.count;
			var weight = (a.count * b.count)/(a.count + b.count);
			
			// do the reducing
			a.diff += b.diff + delta*delta*weight;
			a.diff2 += b.diff2 + delta2*delta2*weight;
			a.sum += b.sum;
			a.sum2 += b.sum2;
			a.count += b.count;
			a.min = Math.min(a.min, b.min);
			a.min2 = Math.min(a.min2, b.min2);
			a.max = Math.max(a.max, b.max);
			a.max2 = Math.max(a.max2, b.max2);
		}
	 
		return a;
	}
	 
	var finalize = function(key, value){ 
		value.avg = value.sum / value.count;
		value.avg2 = value.sum2 / value.count;
		value.variance = value.diff / value.count;
		value.variance2 = value.diff2 / value.count;
		value.stddev = Math.sqrt(value.variance);
		value.stddev2 = Math.sqrt(value.variance2);
		value.stderr = value.stddev / Math.sqrt(value.count);
		value.stderr2 = value.stddev2 / Math.sqrt(value.count);
		return value;
	}
	// end inherited code
	
	
	db.collection('exp7s').mapReduce(map, reduce, {query:{totalSatellites:{$lte:6}}, finalize:finalize, out:{inline:1}}, function(err, result) {
		if(err!==null) {
			logger.error(err);
		} else {
			result.sort(function(a,b) {
				if(a._id.players === b._id.players) {
					if(a._id.player === b._id.player) {
						if(a._id.totalCost === b._id.totalCost) {
							return a._id.satellites - b._id.satellites;
						} else {
							return a._id.totalCost - b._id.totalCost;
						}
					} else {
						return a._id.player - b._id.player;
					}
				} else {
					return a._id.players - b._id.players;
				}
			});
			var stream = fs.createWriteStream('data-exp.csv');
			stream.once('open', function(fd) {
				stream.write(['Run', 'Players', 'Player', 'Satellites', 'Stations', 'ISL', 'Cost', 'Count', 'Min', 
						'Max', 'Avg', 'StdDev', 'StdErr', 'Total Cost','Total Value Avg','Total Value StdErr'].join()+'\n');
				_.each(result, function(item) {
					stream.write([item._id.run.replace(/,/g,'|'), item._id.players, item._id.player, 
							item._id.satellites, item._id.stations, item._id.isl,
							item._id.init, item.value.count, item.value.min, 
							item.value.max, item.value.avg, item.value.stddev, 
							item.value.stderr, item._id.totalCost, item.value.avg2, 
							item.value.stderr2].join()+'\n');
				});
				stream.on('finish', function() {
					var exec = child_process.exec, child;
					child = exec('python fss-exp7-pp.py', 
							function(error, stdout, stderr) {
								if(error) {
									logger.error(error);
								}
								if(stdout) {
									logger.error(stderr);
								}
								if(stdout) {
									logger.info(stdout);
								}
							})
				});
				stream.end();
			});
		}
		db.close();
	});
	
})