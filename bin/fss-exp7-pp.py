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
import scipy.stats as stats
import matplotlib.pyplot as plt

id = np.array([])
run = np.array([])
cost = np.array([])
exp_value = np.array([])
min_value = np.array([])
max_value = np.array([])
std_err = np.array([])
oisl = np.array([], dtype=np.bool_)
pisl = np.array([], dtype=np.bool_)
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
		pisl = np.append(pisl, 'pISL' in row[0])
		oisl = np.append(oisl, 'oISL' in row[0])
		osgl = np.append(osgl, 'oSGL' in row[0])
		cost = np.append(cost, float(row[6]))
		min_value = np.append(min_value, float(row[7]))
		max_value = np.append(max_value, float(row[8]))
		exp_value = np.append(exp_value, float(row[10]))
		std_err = np.append(std_err, float(row[12]))
		totalCost = np.append(totalCost, float(row[13]))
		totalExpValue = np.append(totalExpValue, float(row[14]))
		totalStdErr = np.append(totalStdErr, float(row[15]))
    #exp_value = exp_value - cost
    #totalExpValue = totalExpValue - totalCost

def pareto(id, cost, exp_value, std_err):
	p_id = np.array([])
	p_cost = np.array([])
	p_value = np.array([])
	p_exp = np.array([])
	for i in range(0,np.size(cost)):
		if exp_value[i] > 0 and np.sum(np.logical_and(cost<=cost[i], 
				exp_value-1.96*std_err>exp_value[i]+1.96*std_err[i])) == 0:
			p_id = np.append(p_id, id[i])
			p_cost = np.append(p_cost, cost[i])
			p_value = np.append(p_value, exp_value[i])
			if np.sum(np.logical_and(cost<=cost[i], exp_value>exp_value[i])) == 0:
				p_exp = np.append(p_exp, True)
			else:
				p_exp = np.append(p_exp, False)
	return p_id, p_cost, p_value, p_exp

def tradespace(label, id, cost, exp_value, std_err, run, pisl, oisl, osgl):
	plt.clf()
	plt.rcParams.update({'axes.labelsize':8, 
						 'font.size':8, 
						 'font.family':'Times New Roman',
						 'legend.fontsize':8, 
						 'xtick.labelsize':8,
						 'ytick.labelsize':8})

	# plt.errorbar(cost, exp_value, yerr=[exp_value-min_value,max_value-exp_value],ls='.',c='r')
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))],
		fmt='none',color='k',ecolor=[.6,.6,.6,.3])
	plt.errorbar(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))],
		fmt='none',color='b',ecolor=[.6,.6,1,.3])
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))],
		fmt='none',color='g',ecolor=[.6,1,.6,.3])
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))],
		fmt='none',color='r',ecolor=[1,.6,.6,.3])
	plt.errorbar(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))],
		fmt='none',color='m',ecolor=[1,.6,1,.3])
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))],
		fmt='none',color='y',ecolor=[1,1,.6,.3])
		
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		ls='', marker='.',mec='none',color=[0,0,0,.3])
	plt.plot(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		ls='', marker='.',mec='none',color=[0,0,1,.3])
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		ls='', marker='.',mec='none',color=[0,1,0,.3])
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		ls='', marker='.',mec='none',color=[1,0,0,.3])
	plt.plot(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		ls='', marker='.',mec='none',color=[1,0,1,.3])
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		ls='', marker='.',mec='none',color=[1,1,0,.3])
		
	if np.size(id[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))])>0:
		p_id, p_cost, p_value, p_exp = pareto(
				id[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
				cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
				exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
				std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))])
		for i in range(0,np.size(p_id)):
			plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8, color='k')
		m, b, r, p, se = stats.linregress(p_cost[p_exp==True], p_value[p_exp==True])
		x_r = np.linspace(np.amin(p_cost[p_exp==True]), np.amax(p_cost[p_exp==True]), 100)
		#plt.plot(x_r, b + m*x_r,ls='-',color=[0,0,0,.3])
		plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='-',color=[0,0,0,.3])
	if np.size(id[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))])>0:
		p_id, p_cost, p_value, p_exp = pareto(
				id[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
				cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
				exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
				std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))])
		for i in range(0,np.size(p_id)):
			plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8, color='b')
		m, b, r, p, se = stats.linregress(p_cost[p_exp==True], p_value[p_exp==True])
		x_r = np.linspace(np.amin(p_cost[p_exp==True]), np.amax(p_cost[p_exp==True]), 100)
		#plt.plot(x_r, b + m*x_r,ls='-',color=[0,0,1,.3])
		plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='-',color=[0,0,1,.3])
	if np.size(id[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))])>0:
		p_id, p_cost, p_value, p_exp = pareto(
				id[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
				cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
				exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
				std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))])
		for i in range(0,np.size(p_id)):
			plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8, color='g')
		m, b, r, p, se = stats.linregress(p_cost[p_exp==True], p_value[p_exp==True])
		x_r = np.linspace(np.amin(p_cost[p_exp==True]), np.amax(p_cost[p_exp==True]), 100)
		#plt.plot(x_r, b + m*x_r,ls='-',color=[0,1,0,.3])
		plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='-',color=[0,1,0,.3])
	if np.size(id[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))])>0:
		p_id, p_cost, p_value, p_exp = pareto(
				id[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
				cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
				exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
				std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))])
		for i in range(0,np.size(p_id)):
			plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8, color='r')
		m, b, r, p, se = stats.linregress(p_cost[p_exp==True], p_value[p_exp==True])
		x_r = np.linspace(np.amin(p_cost[p_exp==True]), np.amax(p_cost[p_exp==True]), 100)
		#plt.plot(x_r, b + m*x_r,ls='-',color=[1,0,0,.3])
		plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='-',color=[1,0,0,.3])
	if np.size(id[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))])>0:
		p_id, p_cost, p_value, p_exp = pareto(
				id[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
				cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
				exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
				std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))])
		for i in range(0,np.size(p_id)):
			plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8, color='m')
		m, b, r, p, se = stats.linregress(p_cost[p_exp==True], p_value[p_exp==True])
		x_r = np.linspace(np.amin(p_cost[p_exp==True]), np.amax(p_cost[p_exp==True]), 100)
		#plt.plot(x_r, b + m*x_r,ls='-',color=[1,0,1,.3])
		plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='-',color=[1,0,1,.3])
	if np.size(id[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))])>0:
		p_id, p_cost, p_value, p_exp = pareto(
				id[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
				cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
				exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
				std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))])
		for i in range(0,np.size(p_id)):
			plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
						xytext=(-5,4), textcoords='offset points', size=8, color='y')
		m, b, r, p, se = stats.linregress(p_cost[p_exp==True], p_value[p_exp==True])
		x_r = np.linspace(np.amin(p_cost[p_exp==True]), np.amax(p_cost[p_exp==True]), 100)
		#plt.plot(x_r, b + m*x_r,ls='-',color=[1,1,0,.3])
		plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='-',color=[1,1,0,.3])
	plt.xlabel('Initial Cost ($\S$)')
	#plt.ylabel('Net Expected Value ($\S$)')
	plt.ylabel('Expected Value ($\S$)')
	plt.xlim([1000, 5000])
	plt.ylim([1000, 12000])
	#plt.xscale('log')
	#plt.yscale('log')
	plt.grid()
	#plt.gcf().set_size_inches(6., 3.)
	plt.savefig(label+'-exp-ts.png', dpi=300)
	#plt.savefig(label+'-exp-ts.pdf')
	
independent = np.logical_and.reduce((players==2,player==0,oisl==False,osgl==False))
centralized = np.logical_and.reduce((players==2,player==0,np.logical_or(oisl,osgl)))
if np.size(id[independent]) > 0:
	tradespace('2i', id[independent], 
		totalCost[independent]/2, 
		totalExpValue[independent]/2,
		totalStdErr[independent]/2, 
		run[independent], 
		pisl[independent], 
		oisl[independent], 
		osgl[independent])
if np.size(id[centralized]) > 0:
	tradespace('2c', id[centralized], 
		totalCost[centralized]/2, 
		totalExpValue[centralized]/2,
		totalStdErr[centralized]/2, 
		run[centralized], 
		pisl[centralized], 
		oisl[centralized], 
		osgl[centralized])