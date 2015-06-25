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

run = np.array([])
cost = np.array([])
exp_value = np.array([])
min_value = np.array([])
max_value = np.array([])
std_err = np.array([])

with open('data.csv','rb') as csvfile:
    reader = csv.reader(csvfile, delimiter=',')
    reader.next() # skip header
    for row in reader:
		if float(row[1])==1: # && bool(row[2]):
			run = np.append(run, int(row[0]))
			cost = np.append(cost, float(row[3]))
			exp_value = np.append(exp_value, float(row[7]))
			min_value = np.append(min_value, float(row[5]))
			max_value = np.append(max_value, float(row[6]))
			std_err = np.append(std_err, float(row[9]))
        
plt.clf()
plt.rcParams.update({'axes.labelsize':8, 
                     'font.size':8, 
                     'font.family':'Times New Roman',
                     'legend.fontsize':8, 
                     'xtick.labelsize':8,
                     'ytick.labelsize':8})

# plt.errorbar(cost, exp_value, yerr=[exp_value-min_value,max_value-exp_value],ls='.',c='r')
plt.errorbar(cost, exp_value, yerr=1.96*std_err,ls='o',c='k')

for i in range(0,np.size(run)):
    non_cost_dominated = cost<cost[i]
    non_value_dominated = exp_value>exp_value[i]
    if np.sum(np.logical_and(cost<cost[i], exp_value>exp_value[i])) == 0:
        plt.annotate('%0d'%run[i], xy=(cost[i], exp_value[i]),
                     xytext=(0,4), textcoords='offset points', size=8)


plt.xlabel('Initial Cost ($\S$)')
plt.ylabel('Expected Value ($\S$)')
plt.xlim([0, 8000])
plt.ylim([0, 20000])
plt.grid()
plt.gcf().set_size_inches(6., 3.)
plt.savefig('tradespace.pdf')