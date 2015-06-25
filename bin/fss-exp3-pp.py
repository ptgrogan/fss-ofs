# -*- coding: utf-8 -*-
"""
 Copyright 2015 Paul T. Grogan
 
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 
     http://www.apache.org/licenses/LICENSE-2.0
  
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
"""


import csv
import re
import numpy as np
import matplotlib.pyplot as plt

id = np.array([])
run = np.array([])
cost = np.array([])
exp_value = np.array([])
min_value = np.array([])
max_value = np.array([])
std_err = np.array([])
isl = np.array([], dtype=np.bool_)
players = np.array([])
player = np.array([])
stations = np.array([])
satellites = np.array([])
totalCost = np.array([])
totalExpValue = np.array([])
totalStdErr = np.array([])

with open('data-exp.csv','rb') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    reader.next() # skip header
    counter = 0
    for row in reader:
		counter+=1
		# if int(row[1])==0 and int(row[2])==1:# and row[3]=='false':
		run = np.append(run, row[0])
		id = np.append(id, counter)
		players = np.append(players, int(row[1]))
		player = np.append(player, int(row[2]))
		satellites = np.append(satellites, int(row[3]))
		stations = np.append(stations, int(row[4]))
		isl = np.append(isl, row[5]=='true')
		cost = np.append(cost, float(row[6]))
		min_value = np.append(min_value, float(row[7]))
		max_value = np.append(max_value, float(row[8]))
		exp_value = np.append(exp_value, float(row[10]))
		std_err = np.append(std_err, float(row[12]))
		totalCost = np.append(totalCost, float(row[13]))
		totalExpValue = np.append(totalExpValue, float(row[14]))
		totalStdErr = np.append(totalStdErr, float(row[15]))

def tradespace(label, id, cost, exp_value, std_err, run, isl):
	plt.clf()
	plt.rcParams.update({'axes.labelsize':8, 
						 'font.size':8, 
						 'font.family':'Times New Roman',
						 'legend.fontsize':8, 
						 'xtick.labelsize':8,
						 'ytick.labelsize':8})

	# plt.errorbar(cost, exp_value, yerr=[exp_value-min_value,max_value-exp_value],ls='.',c='r')
	plt.errorbar(cost[isl==False], exp_value[isl==False], yerr=1.96*std_err[isl==False],fmt='none',color='k',ecolor=[.6,.6,.6,.3])
	plt.errorbar(cost[isl], exp_value[isl], yerr=1.96*std_err[isl],fmt='none',color='b',ecolor=[.6,.6,1,.3])
	plt.plot(cost[isl==False], exp_value[isl==False], ls='', marker='.',mec='none',color=[0,0,0,.3])
	plt.plot(cost[isl], exp_value[isl], ls='', marker='.',mec='none',color=[0,0,1,.3])

	for i in range(0,np.size(run)):
		if np.sum(np.logical_and(cost[isl==isl[i]]<=cost[i], exp_value[isl==isl[i]]>exp_value[i])) == 0:
			plt.annotate('%0d'%id[i], xy=(cost[i], exp_value[i]),
						 xytext=(-5,4), textcoords='offset points', size=8,color='b' if isl[i] else 'k')

	plt.xlabel('Initial Cost ($\S$)')
	plt.ylabel('Expected Value ($\S$)')
	plt.xlim([0, 7500])
	plt.ylim([0, 20000])
	#plt.xscale('log')
	#plt.yscale('log')
	plt.grid()
	#plt.gcf().set_size_inches(6., 3.)
	plt.savefig(label+'-exp-ts.png', dpi=300)
	#plt.savefig(label+'-exp-ts.pdf')
	
tradespace('1-1', id[np.logical_and(players==1,satellites==1)], 
	cost[np.logical_and(players==1,satellites==1)], 
	exp_value[np.logical_and(players==1,satellites==1)],
	std_err[np.logical_and(players==1,satellites==1)], 
	run[np.logical_and(players==1,satellites==1)], 
	isl[np.logical_and(players==1,satellites==1)])
tradespace('1-2', id[np.logical_and(players==1,satellites==2)], 
	cost[np.logical_and(players==1,satellites==2)], 
	exp_value[np.logical_and(players==1,satellites==2)],
	std_err[np.logical_and(players==1,satellites==2)], 
	run[np.logical_and(players==1,satellites==2)], 
	isl[np.logical_and(players==1,satellites==2)])
tradespace('1-3', id[np.logical_and(players==1,satellites==3)], 
	cost[np.logical_and(players==1,satellites==3)], 
	exp_value[np.logical_and(players==1,satellites==3)],
	std_err[np.logical_and(players==1,satellites==3)], 
	run[np.logical_and(players==1,satellites==3)], 
	isl[np.logical_and(players==1,satellites==3)])
tradespace('1-4', id[np.logical_and(players==1,satellites==4)], 
	cost[np.logical_and(players==1,satellites==4)], 
	exp_value[np.logical_and(players==1,satellites==4)],
	std_err[np.logical_and(players==1,satellites==4)], 
	run[np.logical_and(players==1,satellites==4)], 
	isl[np.logical_and(players==1,satellites==4)])
tradespace('2-2', id[np.logical_and(players==2, player==0)], 
	totalCost[np.logical_and(players==2, player==0)]/2, 
	totalExpValue[np.logical_and(players==2, player==0)]/2,
	totalStdErr[np.logical_and(players==2, player==0)]/2, 
	run[np.logical_and(players==2, player==0)], 
	isl[np.logical_and(players==2, player==0)])