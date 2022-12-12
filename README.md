# Petri Net Design Studio
This repository is a fully dockerized design studio equipped with the functionality to develop Petri Net models, simulate networks based on created Petri Nets and classify the Petri Net models. 

## What is a Petri Net?
A Petri Net, otherwise known as a Place/Transition net, is a directed bipartite graph that has two types of elements: places and transitions. Within a petri net, places are connected to transitions through the use of arcs. A place can contain any number of tokens which are processed through the transitions, moving to another place, typically. A transition processes a single token at a time and is only enabled if all places connected to it as an input or inplace contains at least one token. As a transition processes a token from a source place, the source place will decrease in token count, while the place receiving the new token will increase in token count. Within this design studio, places will be represented as a white circle which will contain smaller black circles or markings to represent the token count. Each place will also have a label with it's name and initial token count (Ex. 'Player1-2'). Transitions will be represented by squares and arcs are directed line arrows. 

## Use-Cases of this domain!
- Create simplified models of systems using a Petri Net based domain
- Obtain and expand knowledge of Petri Nets
- Simulate systems

## Installation
- install [Docker-Desktop](https://www.docker.com/products/docker-desktop) (Ensure you are using an up-to-date version)
- clone the repository
- edit the '.env' file so that the BASE_DIR variable points to the main repository directory
- `docker-compose up -d`
- connect to your server at http://localhost:8888
- Start modeling!

## If something goes wrong or you want to update the studio, these commands may help...
All of the following commands should be used from your main project directory (where this file also should be):
- To **rebuild** the complete solution `docker-compose build` (and follow with the `docker-compose up -d` to restart the server)
- To **debug** using the logs of the WebGME service `docker-compose logs webgme`
- To **stop** the server just use `docker-compose stop`
- To **enter** the WebGME container and use WebGME commands `docker-compose exec webgme bash` (you can exit by simply closing the command line with linux command 'exit') 
- To **clean** the host machine of unused (old version) images `docker system prune -f`

## Modeling
When the design studio starts up, you will be met with a pop-up modal that will allow you to create a new project. Click on the button 'Create new...' Provide a name for the project and click 'Create'. This will take you to a new screen to choose an existing seed. From the dropdown, you will want to select PetriNet and click the 'Create' button. 

When your new project opens, you will be at the Root. There you will see a number of already developed examples for your viewing. (Please refer to the 'Examples' section below for more detail on these examples.) To start creating your own Petri Net model, you will want to select the rectangular shaped 'PetriNet' object from the Composition list and drag it to the Root area. You can then alter it's name attribute so it is personalized. This PetriNet object will contain your actual developed Petri Net model. Once you are altered the name and are ready to start developing your model, click on the object in the Root area. It will become highlighted and have four buttons in each corner, click on the button in the top left corner (circle with down arrow). This will open up the PetriNet 'workspace' where you can develop your Petri Net model by dragging and dropping Place and Transition objects into the workspace, connecting them by hovering, using a source selector then dragging over to the next component you would like to connect to. You can alter the name attributes for the Places and Transitions and also the tokens attribute for Places to individualize your network and display the movement of tokens. 

#Happy Petri Net Modeling!

## Classifying your Petri Net models
The design studio, once in your PetriNet, will enable two methods of executing a plugin/interpreter to classify the Petri Net you have developed. 

Before we get into how to run the the plugin/interpreter, let's discuss the four types of classifications it looks for:
- Free-choice petri net - if the intersection of the inplaces sets of two transitions are not empty, then the two transitions should be the same (or in short, each transition has its own unique set of inplaces)
- State machine - a petri net is a state machine if every transition has exactly one inplace and one outplace
- Marked graph - a petri net is a marked graph if every place has exaclty one out transition and one in transition
- Workflow net - a petri net is a workflow net if it has exactly one source place s where *s = 0*, one sink place o where o* = 0, and every x E P U T is on a path from s to o

The plugin/interpreter can be executed in the following ways:
1. Click on the dropdown indicator on the play button (left most button in the toolbar) which will dropdown a list that will contain 'PetriNetClassification.' Click on it. This will render a pop-up modal. Click on the 'Run...' button. This will execute the plugin for classification and the output will appear in the notifications. 
2. The interpreter can also be executed by clicking on the 'SimPetriNet' visualizer in the visualizer selector. There the toolbar will be populated with more buttons. Click on the magnifying glass icon button to execute the classification interpreter. Output will also appear in the notifications. 

## Examples
Within the Petri Net Seed, there are a number of examples. 

The first set are classification examples. They are developed models which represent the classification type it is labeled as. Be sure to run the classification plugin/interpreter on the example model to verify! 

The next examples are the following:
*Tennis*
The petri net model for tennis is quite simple. It has two players, Player1 and Player2, each represented by a Place. The transitions connecting the two players, are representative of the players hitting the ball. If Player1 hits the ball, the ball or token in this case, will go to Player2 and vice-versa. This model creates a loop due to this. Since there is only one ball used to play tennis, there is one initial token in the model, as indicated by Player1's token count. 

*Order Processing*
The petri net model for order processing is a more complex example of a process which can be modeled by petri nets. Each transition represents an action that is being done/taken in regards to the order while each Place represents the status of the order at different times in the processing. A single token is used to represent the order. 
