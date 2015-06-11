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
	var db = mongo("fss", ["results"]);
	
	// code below inherited from https://gist.github.com/RedBeard0531/1886960
	var map = function() {
		emit(this.run,
			 {sum: this.finalCash,
			  min: this.finalCash,
			  max: this.finalCash,
			  count:1,
			  diff: 0, // M2,n:  sum((val-mean)^2)
			  init: this.initialCash,
			  stations: this.stations,
			  isl: this.isl
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
		}
	 
		return a;
	}
	 
	var finalize = function(key, value){ 
		value.avg = value.sum / value.count;
		value.variance = value.diff / value.count;
		value.stddev = Math.sqrt(value.variance);
		value.stderr = value.stddev / Math.sqrt(value.count);
		return value;
	}
	// end inherited code
	
	db.collection('results').mapReduce(map, reduce, {finalize:finalize, out:{inline:1}}, function(err, result) {
		if(err!==null) {
			logger.error(err);
		} else {
			var stream = fs.createWriteStream('data.csv');
			stream.once('open', function(fd) {
				stream.write(['Run', 'Stations', 'ISL', 'Cost', 'Count', 'Min', 
						'Max', 'Avg', 'StdDev', 'StdErr'].join()+'\n');
				_.each(result, function(item) {
					stream.write([item._id, item.value.stations, item.value.isl,
							item.value.init, item.value.count, item.value.min, 
							item.value.max, item.value.avg, item.value.stddev, 
							item.value.stderr].join()+'\n');
				});
				stream.end();
			});
		}
		db.close();
	});
})