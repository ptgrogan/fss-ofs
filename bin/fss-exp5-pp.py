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
osgl = np.array([], dtype=np.bool_)
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
		osgl = np.append(osgl, 'oSGL' in row[0])
		cost = np.append(cost, float(row[6]))
		min_value = np.append(min_value, float(row[7]))
		max_value = np.append(max_value, float(row[8]))
		exp_value = np.append(exp_value, float(row[10]))
		std_err = np.append(std_err, float(row[12]))
		totalCost = np.append(totalCost, float(row[13]))
		totalExpValue = np.append(totalExpValue, float(row[14]))
		totalStdErr = np.append(totalStdErr, float(row[15]))
    exp_value = exp_value - cost
    totalExpValue = totalExpValue - totalCost

def tradespace(label, id, cost, exp_value, std_err, run, isl, osgl):
	plt.clf()
	plt.rcParams.update({'axes.labelsize':8, 
						 'font.size':8, 
						 'font.family':'Times New Roman',
						 'legend.fontsize':8, 
						 'xtick.labelsize':8,
						 'ytick.labelsize':8})

	# plt.errorbar(cost, exp_value, yerr=[exp_value-min_value,max_value-exp_value],ls='.',c='r')
	plt.errorbar(cost[np.logical_and(isl==False,osgl==False)], 
		exp_value[np.logical_and(isl==False,osgl==False)], 
		yerr=1.96*std_err[np.logical_and(isl==False,osgl==False)],
		fmt='none',color='k',ecolor=[.6,.6,.6,.3])
	plt.errorbar(cost[np.logical_and(isl,osgl==False)], 
		exp_value[np.logical_and(isl,osgl==False)], 
		yerr=1.96*std_err[np.logical_and(isl,osgl==False)],
		fmt='none',color='b',ecolor=[.6,.6,1,.3])
	plt.errorbar(cost[np.logical_and(isl==False,osgl)], 
		exp_value[np.logical_and(isl==False,osgl)], 
		yerr=1.96*std_err[np.logical_and(isl==False,osgl)],
		fmt='none',color='b',ecolor=[1,.6,.6,.3])
	plt.errorbar(cost[np.logical_and(isl,osgl)], 
		exp_value[np.logical_and(isl,osgl)], 
		yerr=1.96*std_err[np.logical_and(isl,osgl)],
		fmt='none',color='b',ecolor=[.6,1,.6,.3])
	plt.plot(cost[np.logical_and(isl==False,osgl==False)], 
		exp_value[np.logical_and(isl==False,osgl==False)], 
		ls='', marker='.',mec='none',color=[0,0,0,.3])
	plt.plot(cost[np.logical_and(isl,osgl==False)], 
		exp_value[np.logical_and(isl,osgl==False)], 
		ls='', marker='.',mec='none',color=[0,0,1,.3])
	plt.plot(cost[np.logical_and(isl==False,osgl)], 
		exp_value[np.logical_and(isl==False,osgl)], 
		ls='', marker='.',mec='none',color=[1,0,0,.3])
	plt.plot(cost[np.logical_and(isl,osgl)], 
		exp_value[np.logical_and(isl,osgl)], 
		ls='', marker='.',mec='none',color=[0,1,0,.3])

	for i in range(0,np.size(run)):
		if not osgl[i] and np.sum(np.logical_and(cost[osgl==False]<=cost[i], exp_value[osgl==False]>exp_value[i])) == 0:
			plt.annotate('%0d'%id[i], xy=(cost[i], exp_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8,
						color='b' if isl[i] else 'k')
		if osgl[i] and np.sum(np.logical_and(cost[osgl]<=cost[i], exp_value[osgl]>exp_value[i])) == 0:
			plt.annotate('%0d'%id[i], xy=(cost[i], exp_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8,
						color='g' if isl[i] else 'r')
	plt.xlabel('Initial Cost ($\S$)')
	plt.ylabel('Net Expected Value ($\S$)')
	plt.xlim([1000, 5000])
	plt.ylim([-1000, 8000])
	#plt.xscale('log')
	#plt.yscale('log')
	plt.grid()
	#plt.gcf().set_size_inches(6., 3.)
	plt.savefig(label+'-exp-ts.png', dpi=300)
	#plt.savefig(label+'-exp-ts.pdf')
	
tradespace('1', id[players==1], 
	cost[players==1], 
	exp_value[players==1],
	std_err[players==1], 
	run[players==1], 
	isl[players==1], 
	osgl[players==1])
tradespace('1-1', id[np.logical_and(players==1,satellites==1)], 
	cost[np.logical_and(players==1,satellites==1)], 
	exp_value[np.logical_and(players==1,satellites==1)],
	std_err[np.logical_and(players==1,satellites==1)], 
	run[np.logical_and(players==1,satellites==1)], 
	isl[np.logical_and(players==1,satellites==1)], 
	osgl[np.logical_and(players==1,satellites==1)])
tradespace('1-2', id[np.logical_and(players==1,satellites==2)], 
	cost[np.logical_and(players==1,satellites==2)], 
	exp_value[np.logical_and(players==1,satellites==2)],
	std_err[np.logical_and(players==1,satellites==2)], 
	run[np.logical_and(players==1,satellites==2)], 
	isl[np.logical_and(players==1,satellites==2)], 
	osgl[np.logical_and(players==1,satellites==2)])
tradespace('1-3', id[np.logical_and(players==1,satellites==3)], 
	cost[np.logical_and(players==1,satellites==3)], 
	exp_value[np.logical_and(players==1,satellites==3)],
	std_err[np.logical_and(players==1,satellites==3)], 
	run[np.logical_and(players==1,satellites==3)], 
	isl[np.logical_and(players==1,satellites==3)], 
	osgl[np.logical_and(players==1,satellites==3)])
tradespace('1-4', id[np.logical_and(players==1,satellites==4)], 
	cost[np.logical_and(players==1,satellites==4)], 
	exp_value[np.logical_and(players==1,satellites==4)],
	std_err[np.logical_and(players==1,satellites==4)], 
	run[np.logical_and(players==1,satellites==4)], 
	isl[np.logical_and(players==1,satellites==4)], 
	osgl[np.logical_and(players==1,satellites==4)])
tradespace('2', id[np.logical_and(players==2,player==0)], 
	totalCost[np.logical_and(players==2,player==0)]/2, 
	totalExpValue[np.logical_and(players==2,player==0)]/2,
	totalStdErr[np.logical_and(players==2,player==0)]/2, 
	run[np.logical_and(players==2,player==0)], 
	isl[np.logical_and(players==2,player==0)], 
	osgl[np.logical_and(players==2,player==0)])
tradespace('2-2', id[np.logical_and.reduce((players==2, player==0, satellites==2))], 
	totalCost[np.logical_and.reduce((players==2, player==0, satellites==2))]/2, 
	totalExpValue[np.logical_and.reduce((players==2, player==0, satellites==2))]/2,
	totalStdErr[np.logical_and.reduce((players==2, player==0, satellites==2))]/2, 
	run[np.logical_and.reduce((players==2, player==0, satellites==2))], 
	isl[np.logical_and.reduce((players==2, player==0, satellites==2))], 
	osgl[np.logical_and.reduce((players==2,player==0, satellites==2))])
tradespace('2-3', id[np.logical_and.reduce((players==2, player==0, satellites==3))], 
	totalCost[np.logical_and.reduce((players==2, player==0, satellites==3))]/2, 
	totalExpValue[np.logical_and.reduce((players==2, player==0, satellites==3))]/2,
	totalStdErr[np.logical_and.reduce((players==2, player==0, satellites==3))]/2, 
	run[np.logical_and.reduce((players==2, player==0, satellites==3))], 
	isl[np.logical_and.reduce((players==2, player==0, satellites==3))], 
	osgl[np.logical_and.reduce((players==2,player==0, satellites==3))])
tradespace('2-4', id[np.logical_and.reduce((players==2, player==0, satellites==4))], 
	totalCost[np.logical_and.reduce((players==2, player==0, satellites==4))]/2, 
	totalExpValue[np.logical_and.reduce((players==2, player==0, satellites==4))]/2,
	totalStdErr[np.logical_and.reduce((players==2, player==0, satellites==4))]/2, 
	run[np.logical_and.reduce((players==2, player==0, satellites==4))], 
	isl[np.logical_and.reduce((players==2, player==0, satellites==4))], 
	osgl[np.logical_and.reduce((players==2,player==0, satellites==4))])
tradespace('2-5', id[np.logical_and.reduce((players==2, player==0, satellites==5))], 
	totalCost[np.logical_and.reduce((players==2, player==0, satellites==5))]/2, 
	totalExpValue[np.logical_and.reduce((players==2, player==0, satellites==5))]/2,
	totalStdErr[np.logical_and.reduce((players==2, player==0, satellites==5))]/2, 
	run[np.logical_and.reduce((players==2, player==0, satellites==5))], 
	isl[np.logical_and.reduce((players==2, player==0, satellites==5))], 
	osgl[np.logical_and.reduce((players==2,player==0, satellites==5))])
tradespace('2-6', id[np.logical_and.reduce((players==2, player==0, satellites==6))], 
	totalCost[np.logical_and.reduce((players==2, player==0, satellites==6))]/2, 
	totalExpValue[np.logical_and.reduce((players==2, player==0, satellites==6))]/2,
	totalStdErr[np.logical_and.reduce((players==2, player==0, satellites==6))]/2, 
	run[np.logical_and.reduce((players==2, player==0, satellites==6))], 
	isl[np.logical_and.reduce((players==2, player==0, satellites==6))], 
	osgl[np.logical_and.reduce((players==2,player==0, satellites==6))])
tradespace('3-3', id[np.logical_and.reduce((players==3, player==0, satellites==3))], 
	totalCost[np.logical_and.reduce((players==3, player==0, satellites==3))]/3, 
	totalExpValue[np.logical_and.reduce((players==3, player==0, satellites==3))]/3,
	totalStdErr[np.logical_and.reduce((players==3, player==0, satellites==3))]/3, 
	run[np.logical_and.reduce((players==3, player==0, satellites==3))], 
	isl[np.logical_and.reduce((players==3, player==0, satellites==3))], 
	osgl[np.logical_and.reduce((players==3,player==0, satellites==3))])
tradespace('3-6', id[np.logical_and.reduce((players==3, player==0, satellites==6))], 
	totalCost[np.logical_and.reduce((players==3, player==0, satellites==6))]/3, 
	totalExpValue[np.logical_and.reduce((players==3, player==0, satellites==6))]/3,
	totalStdErr[np.logical_and.reduce((players==3, player==0, satellites==6))]/3, 
	run[np.logical_and.reduce((players==3, player==0, satellites==6))], 
	isl[np.logical_and.reduce((players==3, player==0, satellites==6))], 
	osgl[np.logical_and.reduce((players==3,player==0, satellites==6))])