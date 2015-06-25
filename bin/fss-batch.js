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
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO1,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 45
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@LEO3,SAR,VIS,pSGL,pSGL,DEF,DAT 1.GroundSta@SUR1,pSGL,pSGL", // 46
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@LEO3,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@LEO5,SAR,VIS,pSGL,pSGL,DEF,DAT 1.GroundSta@SUR1,pSGL,pSGL", // 47
		"1.LargeSat@MEO1,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@MEO2,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@MEO3,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@MEO4,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@LEO5,SAR,VIS,pSGL,pSGL,DEF,DAT 1.LargeSat@MEO6,SAR,VIS,pSGL,pSGL,DEF,DAT 1.GroundSta@SUR1,pSGL,pSGL", // 48
		"1.MediumSat@LEO1,VIS,pSGL,DEF 1.GroundSta@SUR1,pSGL", // 49
		"1.SmallSat@LEO1,VIS,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.SmallSat@LEO5,VIS,pSGL 1.SmallSat@LEO1,SAR,pSGL 1.GroundSta@SUR1,pSGL", // 50
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 51
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 52
		"1.MediumSat@LEO1,VIS,DAT,pSGL,pSGL 1.MediumSat@LEO3,VIS,DAT,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 53
		"1.MediumSat@LEO1,VIS,DAT,pSGL,pSGL 1.MediumSat@LEO3,VIS,DAT,pSGL,pSGL 1.MediumSat@LEO5,VIS,DAT,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 54
		"1.MediumSat@LEO1,SAR,DAT,pSGL,pSGL 1.MediumSat@LEO3,SAR,DAT,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 55
		"1.MediumSat@LEO1,SAR,DAT,pSGL,pSGL 1.MediumSat@LEO3,SAR,DAT,pSGL,pSGL 1.MediumSat@LEO5,SAR,DAT,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 56
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL,DEF 1.LargeSat@LEO3,SAR,VIS,pSGL,pSGL,DEF 1.LargeSat@LEO5,SAR,VIS,pSGL,pSGL,DEF 1.GroundSta@SUR1,pSGL,pSGL", // 57
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL,DAT 1.LargeSat@LEO3,SAR,VIS,pSGL,pSGL,DAT 1.LargeSat@LEO5,SAR,VIS,pSGL,pSGL,DAT 1.GroundSta@SUR1,pSGL,pSGL", // 58
		"1.LargeSat@LEO1,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.LargeSat@LEO2,SAR,VIS,DEF,pISL,pISL,pISL 1.LargeSat@LEO3,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.LargeSat@LEO4,SAR,VIS,DEF,pISL,pISL,pISL 1.LargeSat@LEO5,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.LargeSat@LEO6,SAR,VIS,DEF,pISL,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 59
		"1.LargeSat@LEO1,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.MediumSat@LEO2,VIS,pISL,pISL,pISL 1.LargeSat@LEO3,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.MediumSat@LEO4,VIS,pISL,pISL,pISL 1.LargeSat@LEO5,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.MediumSat@LEO6,VIS,pISL,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 60
		"1.LargeSat@LEO1,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.MediumSat@LEO2,SAR,pISL,pISL,pISL 1.LargeSat@LEO3,SAR,pISL,pISL,pSGL,pSGL,pSGL 1.MediumSat@LEO4,SAR,pISL,pISL,pISL 1.LargeSat@LEO5,SAR,pISL,pISL,pSGL,pSGL,pSGL 1.MediumSat@LEO6,SAR,pISL,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 61
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.SmallSat@GEO1,pISL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 62
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.SmallSat@GEO1,pISL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 63
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.SmallSat@GEO1,pISL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO4,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 64
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO4,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 65
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL, 1.MediumSat@LEO6,SAR,VIS,pISL,pISL 1.MediumSat@LEO2,SAR,VIS,pISL,pISL 1.MediumSat@LEO4,SAR,VIS,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 66
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL, 1.MediumSat@LEO6,DEF,VIS,pISL,pISL 1.MediumSat@LEO2,DEF,VIS,pISL,pISL 1.MediumSat@LEO4,DEF,VIS,pISL,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 67
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL, 1.MediumSat@LEO6,SAR,VIS,pISL,pISL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO4,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 68
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO3,SAR,VIS,pSGL,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL, 1.MediumSat@GEO1,pISL,pISL,pSGL,pSGL, 1.MediumSat@LEO6,SAR,VIS,pISL,pISL 1.MediumSat@LEO2,SAR,VIS,pISL,pISL 1.SmallSat@LEO4,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 69
		"1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL 1.SmallSat@GEO2,pISL,pISL 1.SmallSat@GEO3,pISL,pISL 1.SmallSat@GEO4,pISL,pISL 1.SmallSat@GEO5,pISL,pISL 1.SmallSat@GEO6,pISL,pISL 1.SmallSat@LEO1,VIS,pISL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO3,VIS,pISL 1.SmallSat@LEO4,VIS,pISL 1.SmallSat@LEO5,VIS,pISL 1.SmallSat@LEO6,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 70
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@LEO2,VIS,SAR,pISL,pISL 1.MediumSat@LEO4,VIS,SAR,pISL,pISL 1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 71
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@LEO2,VIS,SAR,pISL,pISL 1.MediumSat@LEO4,VIS,SAR,pISL,pISL 1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.SmallSat@LEO2,VIS,pISL 1.SmallSat@LEO4,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 72
		"1.MediumSat@LEO6,VIS,SAR,pISL,pISL 1.MediumSat@LEO2,VIS,SAR,pISL,pISL 1.MediumSat@LEO4,VIS,SAR,pISL,pISL 1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL, 1.SmallSat@LEO6,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 73
		"1.SmallSat@LEO6,VIS,pISL 1.MediumSat@LEO1,VIS,pISL,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 74
		"1.SmallSat@LEO6,VIS,pISL 1.MediumSat@LEO1,VIS,pISL,pSGL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL", // 75
		"1.SmallSat@LEO6,VIS,pISL 1.MediumSat@LEO1,VIS,pISL,pSGL,pSGL 1.SmallSat@LEO1,pISL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 76
		"1.SmallSat@LEO6,VIS,pISL 1.LargeSat@LEO1,VIS,pISL,pISL,pSGL,pSGL,pSGL 1.SmallSat@LEO2,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 77
		"1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL 1.SmallSat@MEO1,VIS,pISL 1.SmallSat@MEO2,VIS,pISL 1.SmallSat@MEO3,VIS,pISL 1.SmallSat@MEO4,VIS,pISL 1.SmallSat@MEO5,VIS,pISL 1.SmallSat@MEO6,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 78
		"1.LargeSat@GEO1,pISL,pISL,pISL,pSGL,pSGL,pSGL 1.SmallSat@MEO1,VIS,pISL 1.SmallSat@MEO3,VIS,pISL 1.SmallSat@MEO5,VIS,pISL 1.GroundSta@SUR1,pSGL,pSGL,pSGL", // 79
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 80
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.SmallSat@LEO5,VIS,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 81
		"1.MediumSat@LEO1,SAR,VIS,pSGL,pSGL 1.SmallSat@LEO3,VIS,pSGL 1.MediumSat@LEO5,SAR,VIS,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 82
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL,DAT 1.LargeSat@LEO3,SAR,VIS,pSGL,pSGL,DAT 1.LargeSat@LEO5,SAR,VIS,pSGL,pSGL,DAT 1.GroundSta@SUR1,pSGL", // 83
		"1.LargeSat@LEO1,SAR,VIS,pSGL,pSGL 1.LargeSat@LEO3,SAR,VIS,pSGL,pSGL 1.LargeSat@LEO5,SAR,VIS,pSGL,pSGL 1.GroundSta@SUR1,pSGL,pSGL", // 84

		"1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 85
		"1.SmallSat@LEO1,SAR,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 86
		"1.SmallSat@LEO5,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 87
		"1.SmallSat@LEO5,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 88
		"1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.SmallSat@LEO3,VIS,oSGL 2.GroundSta@SUR3,oSGL", // 89
		"1.SmallSat@LEO1,SAR,oSGL 1.GroundSta@SUR1,oSGL 2.SmallSat@LEO3,SAR,oSGL 2.GroundSta@SUR3,oSGL", // 90
		"1.SmallSat@LEO5,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.SmallSat@LEO1,VIS,oSGL 2.SmallSat@LEO3,VIS,oSGL 2.GroundSta@SUR3,oSGL", // 91
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.MediumSat@LEO3,SAR,VIS,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 92
		"1.LargeSat@LEO1,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL,oSGL 2.LargeSat@LEO3,VIS,DAT,SAR,oSGL,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL,oSGL", // 93
		"1.SmallSat@LEO5,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.SmallSat@LEO3,SAR,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.SmallSat@LEO1,SAR,oSGL 2.SmallSat@LEO3,VIS,oSGL 2.SmallSat@LEO5,SAR,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 94
		"1.SmallSat@LEO5,SAR,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.SmallSat@LEO1,SAR,oSGL 2.SmallSat@LEO3,VIS,oSGL 2.GroundSta@SUR3,oSGL", // 95
		"1.SmallSat@LEO5,SAR,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.SmallSat@LEO1,SAR,oSGL 2.SmallSat@LEO3,VIS,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 96
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 97
		"1.LargeSat@LEO1,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL,oSGL", // 98
		"1.SmallSat@LEO1,VIS,oSGL 2.GroundSta@SUR1,oSGL", // 99
		"1.SmallSat@LEO1,SAR,oSGL 2.GroundSta@SUR1,oSGL", // 100
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL", // 101
		"1.LargeSat@LEO1,VIS,DAT,SAR,oSGL,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL,oSGL", // 102
		"1.LargeSat@LEO1,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.LargeSat@LEO3,VIS,DAT,SAR,oSGL,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL,oSGL", // 103
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 1.MediumSat@LEO3,SAR,VIS,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL", // 104
		"1.LargeSat@LEO1,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.LargeSat@LEO3,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.LargeSat@LEO5,VIS,DAT,SAR,oSGL,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL,oSGL", // 105
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 1.MediumSat@LEO3,SAR,VIS,oSGL,oSGL 1.MediumSat@LEO5,SAR,VIS,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL", // 106
		"1.SmallSat@LEO5,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 2.GroundSta@SUR1,oSGL", // 107
		"1.SmallSat@LEO5,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 1.SmallSat@LEO1,VIS,oSGL 2.GroundSta@SUR1,oSGL", // 108
		"1.LargeSat@LEO1,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.LargeSat@LEO5,VIS,DAT,SAR,oSGL,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL,oSGL 2.LargeSat@LEO3,VIS,DAT,SAR,oSGL,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL,oSGL", // 109
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 1.GroundSta@SUR1,oSGL 2.MediumSat@LEO3,SAR,VIS,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 110
		"1.SmallSat@LEO1,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.SmallSat@LEO3,VIS,oSGL 2.GroundSta@SUR3,oSGL", // 111
		"1.SmallSat@LEO1,VIS,oSGL 2.SmallSat@LEO2,VIS,oSGL 1.SmallSat@LEO3,VIS,oSGL 2.SmallSat@LEO4,VIS,oSGL 1.SmallSat@LEO5,VIS,oSGL 2.SmallSat@LEO6,VIS,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR2,oSGL", // 112
		"1.SmallSat@LEO1,VIS,oSGL 2.SmallSat@LEO1,SAR,oSGL 1.SmallSat@LEO3,VIS,oSGL 2.SmallSat@LEO3,SAR,oSGL 1.SmallSat@LEO5,VIS,oSGL 2.SmallSat@LEO5,SAR,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 113
		"1.LargeSat@LEO1,SAR,VIS,DAT,DEF,oSGL,oSGL 2.LargeSat@LEO2,SAR,VIS,DAT,DEF,oSGL,oSGL 1.LargeSat@LEO3,SAR,VIS,DAT,DEF,oSGL,oSGL 2.LargeSat@LEO4,SAR,VIS,DAT,DEF,oSGL,oSGL 1.LargeSat@LEO5,SAR,VIS,DAT,DEF,oSGL,oSGL 2.LargeSat@LEO6,SAR,VIS,DAT,DEF,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 114
		"1.MediumSat@LEO1,SAR,VIS,oSGL,oSGL 2.MediumSat@LEO2,SAR,VIS,oSGL,oSGL 1.MediumSat@LEO3,SAR,VIS,oSGL,oSGL 2.MediumSat@LEO4,SAR,VIS,oSGL,oSGL 1.MediumSat@LEO5,SAR,VIS,oSGL,oSGL 2.MediumSat@LEO6,SAR,VIS,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 115
		"1.SmallSat@LEO1,VIS,oSGL 2.SmallSat@LEO1,SAR,oSGL 1.SmallSat@LEO3,VIS,oSGL 2.SmallSat@LEO3,SAR,oSGL 1.SmallSat@LEO5,VIS,oSGL 2.SmallSat@LEO5,SAR,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 116
		"1.SmallSat@LEO6,VIS,oISL 1.SmallSat@LEO1,oISL,oSGL 2.SmallSat@LEO2,VIS,oISL 2.SmallSat@LEO3,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 117
		"1.MediumSat@LEO1,VIS,SAR,oISL,oSGL 2.MediumSat@LEO2,VIS,SAR,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR2,oSGL", // 118
		"1.MediumSat@LEO1,VIS,oISL,oSGL,oSGL 2.MediumSat@LEO2,VIS,oISL,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 119
		"1.SmallSat@LEO1,VIS,oISL 1.SmallSat@LEO3,VIS,oISL 2.MediumSat@GEO2,oISL,oISL,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 120
		"1.SmallSat@LEO1,VIS,oISL 1.SmallSat@LEO3,VIS,oISL 1.SmallSat@LEO4,VIS,oISL 2.MediumSat@GEO2,oISL,oISL,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 121
		"1.MediumSat@LEO1,VIS,SAR,oISL,oISL 1.SmallSat@LEO3,VIS,oISL 1.SmallSat@LEO4,VIS,oISL 2.MediumSat@GEO2,oISL,oISL,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 122
		"1.MediumSat@LEO1,VIS,SAR,oISL,oISL 1.SmallSat@LEO3,VIS,oISL 1.SmallSat@LEO4,VIS,oISL 2.LargeSat@GEO2,oISL,oISL,oISL,oSGL,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 123
		"1.MediumSat@LEO1,VIS,SAR,oISL,oISL 1.MediumSat@LEO3,VIS,SAR,oISL,oISL 1.SmallSat@LEO4,VIS,oISL 2.LargeSat@GEO2,oISL,oISL,oISL,oSGL,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 124
		"1.MediumSat@LEO1,VIS,SAR,oISL,oISL 1.MediumSat@LEO3,VIS,SAR,oISL,oISL 1.MediumSat@LEO4,VIS,SAR,oISL,oISL 2.LargeSat@GEO2,oISL,oISL,oISL,oSGL,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 125
		"1.MediumSat@LEO1,VIS,oISL,oSGL,oSGL 1.SmallSat@LEO3,oISL,oSGL 2.MediumSat@LEO2,VIS,oISL,oSGL,oSGL 2.SmallSat@LEO4,oISL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 126
		"1.MediumSat@LEO1,VIS,oISL,oSGL,oSGL 1.SmallSat@LEO3,oISL,oSGL 1.SmallSat@LEO5,oISL,oSGL 2.MediumSat@LEO2,VIS,oISL,oSGL,oSGL 2.SmallSat@LEO4,oISL,oSGL 2.SmallSat@LEO6,oISL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.GroundSta@SUR2,oSGL,oSGL", // 127
		"1.SmallSat@MEO5,oSGL,oISL 1.SmallSat@MEO6,oSGL,oISL 1.SmallSat@MEO1,oSGL,oISL 1.GroundSta@SUR1,oSGL 2.SmallSat@LEO2,VIS,pISL", // 128
		"1.MediumSat@LEO6,VIS,SAR,oISL,oISL 1.MediumSat@LEO2,VIS,SAR,oISL,oISL 1.MediumSat@LEO4,VIS,SAR,oISL,oISL 2.LargeSat@GEO1,oISL,oISL,oISL,oSGL,oSGL,oSGL 2.GroundSta@SUR1,oSGL,oSGL,oSGL", // 129
		"1.MediumSat@LEO6,VIS,SAR,oISL,oISL 1.MediumSat@LEO2,VIS,SAR,oISL,oISL 1.MediumSat@LEO4,VIS,SAR,oISL,oISL 1.SmallSat@GEO1,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.SmallSat@GEO3,oISL,oSGL 2.GroundSta@SUR3,oSGL", // 130
		"1.MediumSat@LEO6,VIS,SAR,oISL,oISL 1.MediumSat@LEO2,VIS,SAR,oISL,oISL 1.MediumSat@LEO4,VIS,SAR,oISL,oISL 1.MediumSat@GEO1,oISL,oISL,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.MediumSat@GEO3,oISL,oISL,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 131
		"1.MediumSat@LEO6,VIS,SAR,oISL,oISL 1.MediumSat@LEO2,VIS,SAR,oISL,oISL 1.MediumSat@LEO4,VIS,SAR,oISL,oISL 1.LargeSat@GEO1,oISL,oISL,oISL,oSGL,oSGL,oSGL 1.GroundSta@SUR1,oSGL,oSGL 2.LargeSat@GEO3,oISL,oISL,oISL,oSGL,oSGL,oSGL 2.GroundSta@SUR3,oSGL,oSGL", // 132
		"1.MediumSat@LEO1,VIS,SAR,oISL,oSGL 1.SmallSat@LEO2,oISL,DEF 2.MediumSat@LEO3,VIS,SAR,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 133
		"1.SmallSat@GEO1,oISL,oSGL 1.SmallSat@LEO6,VIS,oISL 2.SmallSat@LEO2,VIS,oISL 2.SmallSat@GEO3,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 134
		"1.SmallSat@GEO1,oISL,oSGL 1.SmallSat@LEO6,VIS,oISL 1.SmallSat@LEO4,VIS,oISL 2.SmallSat@LEO2,VIS,oISL 2.SmallSat@GEO3,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR3,oSGL", // 135
		"1.SmallSat@GEO1,oISL,oSGL 1.SmallSat@LEO1,VIS,oISL 2.SmallSat@LEO2,VIS,oISL 2.SmallSat@GEO2,oISL,oSGL 1.GroundSta@SUR1,oSGL 2.GroundSta@SUR2,oSGL", // 136
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
				var numPlayers = parseInt(_.max(runs[run].match(/(\d)\./g)))
				var ops = ' ';
				if(numPlayers===1) {
					ops = ' -o d ';
				} else if(numPlayers>1) {
					ops = ' -o n -f d ';
				}
				child = exec('node fss -d 12 -i 0 -p ' + numPlayers + ops
						+ runs[run] + ' -s ' + seed, 
						function(error, stdout, stderr) {
							logger.info('Result for seed ' + seed + ': ' + stdout);
							var values = stdout.replace('\n','').split(',');
							var totalCost = 0;
							var totalValue = 0;
							_.each(values, function(value, player) {
								totalCost += parseFloat(value.split(':')[0]);
								totalValue += parseFloat(value.split(':')[1]);
							});
							_.each(values, function(value, player) {
								var initialCash = parseFloat(value.split(':')[0]);
								var finalCash = parseFloat(value.split(':')[1]);
								db.collection('results').update(
									{run: run, seed: seed, player: player},
									{$set: 
										{
											initialCash: initialCash, 
											finalCash: finalCash,
											stations: (runs[run].match(new RegExp((player+1)+'\\.GroundSta', 'g')) || []).length,
											isl: ((runs[run].match(/ISL/g) || []).length>0),
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
										batchCounter++;
										if(batchCounter===batchSize*numPlayers 
												|| batchCounter===(batchStop-batchStart)*numPlayers) {
											batchCounter = 0;
											if(stop > batchStop) {
												executeBatch(batchStart+batchSize, Math.min(batchStart+2*batchSize, stop));
											}
										}
										counter++;
										if(counter===(stop-start)*numPlayers) {
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