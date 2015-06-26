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
plt.rcParams.update({'axes.labelsize':8, 
					 'font.size':8, 
					 'font.family':'Times New Roman',
					 'legend.fontsize':8, 
					 'xtick.labelsize':8,
					 'ytick.labelsize':8})

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
						
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))],
		fmt='none',color='k',ecolor='k', alpha=0.3)
	plt.errorbar(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))],
		fmt='none',color='b',ecolor='b', alpha=0.3)
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))],
		fmt='none',color='g',ecolor='g', alpha=0.3)
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))],
		fmt='none',color='r',ecolor='r', alpha=0.3)
	plt.errorbar(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))],
		fmt='none',color='m',ecolor='m', alpha=0.3)
	plt.errorbar(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		yerr=1.96*std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))],
		fmt='none',color='y',ecolor='y', alpha=0.3)
		
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
		ls='', marker='.',mec='none',color='k', alpha=0.3)
	plt.plot(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
		ls='', marker='.',mec='none',color='b', alpha=0.3)
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
		ls='', marker='.',mec='none',color='g', alpha=0.3)
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
		ls='', marker='.',mec='none',color='r', alpha=0.3)
	plt.plot(cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
		ls='', marker='.',mec='none',color='m', alpha=0.3)
	plt.plot(cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
		ls='', marker='.',mec='none',color='y', alpha=0.3)
	
	p_id, p_cost, p_value, p_exp = pareto(
			id[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
			cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
			exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))], 
			std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==False))])
	#plt.plot(p_cost[p_exp==True],p_value[p_exp==True],'.-k', alpha=0.3)
	for i in range(0,np.size(p_id)):
		plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
					xytext=(-5,4), textcoords='offset points', size=8, color='k')
					
	p_id, p_cost, p_value, p_exp = pareto(
			id[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
			cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
			exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))], 
			std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==False))])
	#plt.plot(p_cost[p_exp==True],p_value[p_exp==True],'.-b', alpha=0.3)
	for i in range(0,np.size(p_id)):
		plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
					xytext=(-5,4), textcoords='offset points', size=8, color='b')
	
	p_id, p_cost, p_value, p_exp = pareto(
			id[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
			cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
			exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))], 
			std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==False))])
	#plt.plot(p_cost[p_exp==True],p_value[p_exp==True],'.-g', alpha=0.3)
	for i in range(0,np.size(p_id)):
		plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
					xytext=(-5,4), textcoords='offset points', size=8, color='g')

	p_id, p_cost, p_value, p_exp = pareto(
			id[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
			cost[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
			exp_value[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))], 
			std_err[np.logical_and.reduce((pisl==False,oisl==False,osgl==True))])
	#plt.plot(p_cost[p_exp==True],p_value[p_exp==True],'.-r', alpha=0.3)
	for i in range(0,np.size(p_id)):
		plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
					xytext=(-5,4), textcoords='offset points', size=8, color='r')

	p_id, p_cost, p_value, p_exp = pareto(
			id[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
			cost[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
			exp_value[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))], 
			std_err[np.logical_and.reduce((pisl==True,oisl==False,osgl==True))])
	#plt.plot(p_cost[p_exp==True],p_value[p_exp==True],'.-m', alpha=0.3)
	for i in range(0,np.size(p_id)):
		plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
					xytext=(-5,4), textcoords='offset points', size=8, color='m')
					
	p_id, p_cost, p_value, p_exp = pareto(
			id[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
			cost[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
			exp_value[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))], 
			std_err[np.logical_and.reduce((pisl==False,oisl==True,osgl==True))])
	#plt.plot(p_cost[p_exp==True],p_value[p_exp==True],'.-y', alpha=0.3)
	for i in range(0,np.size(p_id)):
		plt.annotate('%0d'%p_id[i], xy=(p_cost[i], p_value[i]),
					xytext=(-5,4), textcoords='offset points', size=8, color='y')
					
	p_id, p_cost, p_value, p_exp = pareto(id, cost, exp_value, std_err)
	plt.plot(p_cost[p_exp==True],p_value[p_exp==True],ls='--',color=[.3,.3,.3])
		
	plt.xlabel('Initial Cost ($\S$)')
	#plt.ylabel('Net Expected Value ($\S$)')
	plt.ylabel('Expected Value over 24 Turns ($\S$)')
	plt.xlim([1000, 4000])
	plt.ylim([1000, 12000])
	plt.legend(['pSGL','pSGL and pISL', 'pSGL and oISL', 'oSGL', 'oSGL and pISL', 'oSGL and oISL'],loc='upper left')
	plt.grid()
	plt.gcf().set_size_inches(6.5, 3.5)
	plt.savefig(label+'-exp-ts.png', dpi=300)
	
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
		

i_id, i_cost, i_value, i_exp = pareto(id[independent], 
		totalCost[independent]/2, 
		totalExpValue[independent]/2, 
		totalStdErr[independent]/2)
c_id, c_cost, c_value, c_exp = pareto(id[centralized], 
		totalCost[centralized]/2, 
		totalExpValue[centralized]/2, 
		totalStdErr[centralized]/2)

x_value = np.array([])
for i in c_id:
	m = re.search('^(1.* 1.GroundSta@SUR1)', run[i])
	if m:
		query = m.group(1).replace('oSGL','pSGL').replace('oISL','pISL')
		for design in run[independent]:
			if query in design:
				x_value = np.append(x_value, totalExpValue[np.logical_and(run==design,player==0)]/2)
				
plt.clf()

x = np.linspace(max(np.amin(i_cost[i_exp==True]), np.amin(c_cost[c_exp==True])), 
		max(np.amax(i_cost[i_exp==True]), np.amax(c_cost[c_exp==True])))

plt.fill_between(x, np.interp(x, i_cost[i_exp==True],i_value[i_exp==True]), 
		np.interp(x, c_cost[c_exp==True], c_value[c_exp==True]), color='none', hatch='/', edgecolor=[.3,.3,.3,.5], linewidth=0.0)
plt.fill_between(x, np.interp(x, c_cost[c_exp==True],x_value[c_exp==True]), 
		np.interp(x, i_cost[i_exp==True], i_value[i_exp==True]), color='none', hatch='\\', edgecolor=[1,.3,.3,.5], linewidth=0.0)
plt.plot(i_cost[i_exp==True], i_value[i_exp==True], '-k')
plt.plot(c_cost[c_exp==True], c_value[c_exp==True], '--k')
plt.plot(c_cost[c_exp==True], x_value[c_exp==True], '--r')

plt.annotate('Upside Potential of FSS Success', xy=(2600, 7500), size=8, color='k')
plt.annotate('Downside Risk of FSS Failure', xy=(2000, 2750), xytext=(2250,2000), 
		textcoords='data', arrowprops=dict(arrowstyle='->',connectionstyle='arc3',ec='r'), size=8, color='r')

plt.xlabel('Initial Cost ($\S$)')
plt.ylabel('Expected Value over 24 Turns ($\S$)')
plt.xlim([1000, 4000])
plt.ylim([1000, 12000])
plt.legend(['Independent Pareto Front','Centralized Pareto Front (FSS Success)','Centralized Pareto Front (FSS Failure)'],loc='upper left')
plt.grid()
plt.gcf().set_size_inches(6.5, 3.5)
plt.savefig('2-exp.png', dpi=300)