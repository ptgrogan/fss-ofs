# fss-ofs
Federated Satellite Systems---Orbital Federates Simulation

This is a simulator for the Orbital Federates game. Its current form runs as a command-line script which accepts initial design decisions and options as arguments and outputs the final state of each player.

## Prerequisites

This project requires the following two applications:
 1. Node.js (recommended version: [0.10.34](http://nodejs.org/dist/v0.10.34/) for compatibility with lp_solve module)
 2. Visual Studio (recommended version: [Community 2013](https://www.visualstudio.com/en-us/products/visual-studio-community-vs.aspx), required to compile lp_solve module)
*Note: the specific versions above are strongly recommended due to numerous problems encountered!*

## Installation Instruction
 1. Clone this repository using any git client ([git-scm](http://git-scm.com/downloads) is a basic one)
 2. Install NPM modules:
  * Open a command console, navigate to the cloned repository directory, and enter the command: `npm install`
  * Script should install dependent modules. There may be several yellow warnings which seem to be OK.
  * Note: In case of `Error: ENOENT, stat 'C:\\path\to\npm'` message manually create the npm directory at the requested path.
  * Note: Visual Studio or .NET Framework is required to compile the lp_solve module. Recommend using Visual Studio Community 2013.
  * Note: Recent versions of Node.js generate errors when installing lp_solve. Recommend using Node.js version 0.10.34.
  
## Executing the Simulation
 1. Navigate to the `/test` directory
 2. Execute the command `node fss` to execute a basic game with no initial conditions
 3. The output of `1200` indicates the player still has all 1200 of initial funds

## Command line options
 * `-i` Sets initial funds for each player. Must be a positive integer. Default: `-i 1200`
 * `-d` Sets the game duration in number of turns. Must be a positive integer. Default: `-d 24`
 * `-s` Sets the master random number generator seed. Must be an integer. Default: `-s 0`
 * `-l` Sets the logging level. Select from {none, error, info, verbose, debug}. Default: `-l none`
 * `-p` Sets the number of players. Must be a positive integer. Default: `-p 1`
 * `-o` Sets the operational decision model. Select from {d,s} for dynamic (integer program) or simple (heuristic). Default: `-o s`
 * `P.SysName@LOC,Sub1,Sub2,SubN` Defines a system controlled by player `P` (positive integer) of system type `SysName`, instantiated at location `LOC` with subsystems `Sub1`, `Sub2`, and `SubN`.
   * Available Systems:
     * `GroundSta`: Ground station with capacity for 3 subsystem modules. Costs 500 to design and 0 to commission on the surface.
     * `SmallSat`: Satellite with capacity for 2 subsystem modules. Costs 200 to design and 0 commission in LEO, 100 to commission in MEO, and 200 to commission in GEO.
     * `MediumSat`: Satellite with capacity for 4 subsystem modules. Costs 300 to design and 0 commission in LEO, 150 to commission in MEO, and 300 to commission in GEO.
     * `LargeSat`: Satellite with capacity for 6 subsystem modules. Costs 400 to design and 0 commission in LEO, 200 to commission in MEO, and 400 to commission in GEO.
   * Available Locations:
     * `SUR1`--`SUR6`: Surface locations in sectors 1--6.
     * `LEO1`--`LEO6`: Low-Earth orbital locations above sectors 1--6. Spacecraft propagate 2 sectors per turn.
     * `MEO1`--`MEO6`: Medium-Earth orbital locations above sectors 1--6. Spacecraft propagate 1 sector per turn.
     * `GEO1`--`GEO6`: Geostationary Earth orbital locations above sectors 1--6. Spacecraft propagate 0 sectors per turn.
   * Available Subsystems:
     * `pSGL`: Proprietary space-to-ground link. Can transmit 1 bit of data between spacecraft and ground stations (same owner) per turn. Takes up 1 module and costs 50.
     * `oSGL`: Open space-to-ground link. Can transmit 1 bit of data between spacecraft and ground stations (any owner) per turn. Takes up 1 module and costs 100.
     * `pISL`: Proprietary inter-satellite link. Can transmit 1 bit of data between spacecraft (same owner) per turn. Takes up 1 module and costs 50.
     * `oISL`: Open inter-satellite link. Can transmit 1 bit of data between spacecraft (any owner) per turn. Takes up 1 module and costs 100.
     * `VIS`: Visual light sensor. Can sense and store 1 bit of visual light data per turn. Takes up 1 module and costs 250.
     * `SAR`: Synthetic aperture radar. Can sense and store 1 bit of radar data per turn. Takes up 1 module and costs 250.
     * `DAT`: Data storage unit. Can store 1 bit of data per turn. Takes up 1 module and costs 50.
     * `DEF`: Debris defense. Protects a spacecraft from debris events. Takes up 1 module and costs 100.

## Example Script

Input:

`node fss -p 2 1.SmallSat@LEO1,pSGL,VIS 1.GroundSta@SUR3,pSGL 2.SmallSat@LEO3,oSGL,SAR 2.GroundSta@SUR5,oSGL -s 10 -o d`

Run a 2-player simulation with initial seed 10 and dynamic operational model. Player 1 controls a ground station and small satellite with proprietary space-to-ground link and a visual light sensor. Player 2 controls a ground station and small satellite with open space-to-ground link and synthetic aperture radar.

Output:

`2725,3150`

To show player 1 ends with 2725 and player 2 ends with 3150.