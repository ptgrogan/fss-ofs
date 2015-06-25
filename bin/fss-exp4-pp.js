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

requirejs(['underscore','winston','mongojs','fs'], function(_,logger,mongo,fs) {
	var db = mongo("fss", ["exp4"]);
	
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
			  diff2: this.totalValue,
			});
	}
	 
	var reduce = function(key, values) {
		var a = values[0]; // will reduce into here
		for (var i=1/*!*/; i < values.length; i++){
			var b = values[i]; // will merge 'b' into 'a'
	 
			// temp helpers
			var delta = a.sum/a.count - b.sum/b.count; // a.mean - b.mean
			var weight = (a.count * b.count)/(a.count + b.count);
			
			// do the reducing
			a.diff += b.diff + delta*delta*weight;
			a.sum += b.sum;
			a.count += b.count;
			a.min = Math.min(a.min, b.min);
			a.max = Math.max(a.max, b.max);
			
			var delta2 = a.sum2/a.count - b.sum2/b.count;
			a.diff2 += b.diff2 + delta2*delta2*weight;
			a.sum2 += b.sum2;
			a.min2 = Math.min(a.min2, b.min2);
			a.max2 = Math.max(a.max2, b.max2);
		}
	 
		return a;
	}
	 
	var finalize = function(key, value){ 
		value.avg = value.sum / value.count;
		value.variance = value.diff / value.count;
		value.stddev = Math.sqrt(value.variance);
		value.stderr = value.stddev / Math.sqrt(value.count);
		value.avg2 = value.sum2 / value.count;
		value.variance2 = value.diff2 / value.count;
		value.stddev2 = Math.sqrt(value.variance2);
		value.stderr2 = value.stddev2 / Math.sqrt(value.count);
		return value;
	}
	// end inherited code
	
	/*
	db.collection('results').aggregate([{
		$group: {
			_id:{run:"$run",seed:"$seed"},
			totalCost:{$sum:"$initialCash"},
			totalValue:{$sum:"$finalCash"}
		}
	}], function(err, result) {
		_.each(result, function(item) {
			db.collection('results').update(
				{run: item._id.run, seed: item._id.seed}, 
				{$set: {
					totalCost: item.totalCost, 
					totalValue: item.totalValue}
				}, 
				{multi:true}, 
				function(err, res) { }
			);
		});
	});
	*/
	
	
	db.collection('exp4').mapReduce(map, reduce, {finalize:finalize, out:{inline:1}}, function(err, result) {
		if(err!==null) {
			logger.error(err);
		} else {
			result.sort(function(a,b) {
				if(a._id.players === b._id.players) {
					if(a._id.player === b._id.player) {
						if(a._id.satellites === b._id.satellites) {
							return a._id.totalCost - b._id.totalCost;
						} else {
							return a._id.satellites - b._id.satellites;
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
				stream.end();
			});
		}
		db.close();
	});
	
})