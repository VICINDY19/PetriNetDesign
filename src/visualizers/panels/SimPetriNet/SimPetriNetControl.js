/*globals define, WebGMEGlobal*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Sun Dec 11 2022 15:40:05 GMT+0000 (Coordinated Universal Time).
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames'
], function (
    CONSTANTS,
    GMEConcepts,
    nodePropertyNames
) {

    'use strict';

    function SimPetriNetControl(options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;
        this._currentNodeParentId = undefined;

        this._networkRootLoaded = false;
        this._fireableEvents = null;

        this._initWidgetEventHandlers();

        this.setFireableEvents = this.setFireableEvents.bind(this);

        this._logger.debug('ctor finished');
    }

    SimPetriNetControl.prototype._initWidgetEventHandlers = function () {
        this._widget.onNodeClick = function (id) {
            // Change the current active object
            WebGMEGlobal.State.registerActiveObject(id);
        };
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    // One major concept here is with managing the territory. The territory
    // defines the parts of the project that the visualizer is interested in
    // (this allows the browser to then only load those relevant parts).
    SimPetriNetControl.prototype.selectedObjectChanged = function (nodeId) {
        self = this;

        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
            self._networkRootLoaded = false;
        }

        self._currentNodeId = nodeId;

        if (typeof self._currentNodeId === 'string') {
            // Put new node's info into territory rules
            self._selfPatterns = {};
            self._selfPatterns[nodeId] = {children: 1};  // Territory "rule"

            self._territoryId = self._client.addUI(self, function (events) {
                self._eventCallback(events);
            });

            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    SimPetriNetControl.prototype._eventCallback = function (events) {
      const self = this;
       console.log(events);
       events.forEach(event => {
           if (event.eid &&
               event.eid === self._currentNodeId ) {
                   if (event.etype == 'load' || event.etype == 'update') {
                       self._networkRootLoaded = true;
                   } else {
                       self.clearPetriNet();
                       return;
                   }
               }

       });

       if (events.length && events[0].etype === 'complete' && self._networkRootLoaded) {
           // complete means we got all requested data and we do not have to wait for additional load cycles
           self._initPetriNet();
        }
    };

    SimPetriNetControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Machine manipulation functions * * * * * * * */
    SimPetriNetControl.prototype._initPetriNet = function () {
      const self = this;
      //just for the ease of use, lets create a META dictionary
      const rawMETA = self._client.getAllMetaNodes();
      const META = {};
      rawMETA.forEach(node => {
          META[node.getAttribute('name')] = node.getId(); //we just need the id...
      });
      //now we collect all data we need for network visualization
      const petriNetNode = self._client.getNode(self._currentNodeId);
      const elementIds = petriNetNode.getChildrenIds();

      var places = getPlaces(self._client, elementIds)
      var transitions = getTransitions(self._client, elementIds)
      var placeToTransitionArcs = getPlaceToTransitionArcs(self._client, elementIds)
      var transitionToPlaceArcs = getTransitionToPlaceArcs(self._client, elementIds)

      var inplaces = getInplaces(transitionToPlaceArcs, places, transitions)
      var source = getSource(inplaces)

      var outplaces = getOutplaces(placeToTransitionArcs, places, transitions)

      // Initialize petri net object
      let petriNet = {
        places: places,
        transitions: transitions,
        placeToTransitionArcs: placeToTransitionArcs,
        transitionToPlaceArcs: transitionToPlaceArcs,
        inplaces: inplaces,
        outplaces: outplaces,
        source: source,
        deadlocked: _checkPetriNetDeadlock
      }

      elementIds.forEach((elementId) => {
        const node = self._client.getNode(elementId);
        // the simple way of checking type
        if (node.isTypeOf(META['Place'])) {
          petriNet['places'][elementId] = {
            id: elementId,
            pos: node.getRegistry('position'),
            name: node.getAttribute('name'),
            tokens: node.getAttribute('tokens'),
            inTransitions: getInTransitionsForPlace(elementId, inplaces),
            outTransitions: getOutTransitionsForPlace(elementId, outplaces),
            connections: getArcsFromPlace(elementId, placeToTransitionArcs),
            neighbors: getNeighbors(elementId, placeToTransitionArcs, transitionToPlaceArcs)
          }
        }
        else if (node.isTypeOf(META['Transition'])) {
          petriNet['transitions'][elementId] = {
            id: elementId,
            pos: node.getRegistry('position'),
            name: node.getAttribute('name'),
            tokens: node.getAttribute('tokens'),
            inPlaces: getInplacesForTransition(elementId, inplaces),
            outplaces: getOutplacesForTransition(elementId, outplaces),
            connectors: getArcsFromTransition(elementId, transitionToPlaceArcs)
          }
        }
      })


      petriNet.setFireableEvents = this.setFireableEvents;
      self._widget.initPetriNet(petriNet);
  };


    SimPetriNetControl.prototype.clearPetriNet = function () {
        const self = this;
        self._networkRootLoaded = false;
        self._widget.destroyPetriNet();
    };

    SimPetriNetControl.prototype.setFireableEvents = function (events) {
        this._fireableEvents = enabledTransitions;
        if (enabledTransitions && enabledTransitions.length >= 1) {
            // we need to fill the dropdow button with options
            this.$btnEventSelector.clear();
            enabledTransitions.forEach(eTransition => {
                this.$btnEventSelector.addButton({
                    text: 'Fire Enabled Transition: ' + eTransition['name'],
                    title: 'Fire Enabled Transition: ' + eTransition['name'],
                    data: {eTransition: eTransition},
                    clickFn: data => {
                        this._widget.fireEvent(data.event);
                    }
                });
            });
        } else if (enabledTransitions && enabledTransitions.length === 0) {
            this._fireableEvents = null;
        }

        this._displayToolbarItems();
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    SimPetriNetControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    SimPetriNetControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    SimPetriNetControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    SimPetriNetControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {suppressVisualizerFromNode: true});
        }
    };

    SimPetriNetControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    SimPetriNetControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
          if(this._fireableEvents !== null && this._fireableEvents.length > 0) {
            this.$btnPetriNetClassification.show()
            this.$btnResetPetriNet.show()
            this.$btnSingleEvent.show()
            this.$btnEventSelector.show()
          }
          else {
            this.$btnPetriNetClassification.show()
            this.$btnResetPetriNet.show()
            this.$btnSingleEvent.hide()
            this.$btnEventSelector.hide()
          }
        } else {
            this._initializeToolbar();
        }
    };

    SimPetriNetControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    SimPetriNetControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    SimPetriNetControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        /************** Go to hierarchical parent button ****************/
        // Add button for interpreter - PetriNetClassification
        this.$btnPetriNetClassification = toolBar.addButton({
            title: 'Check Petri Net Classifications',
            icon: 'glyphicon glyphicon-search',
            clickFn: function (/*data*/) {
                const context = self._client.getCurrentPluginContext('PetriNetClassification',self._currentNodeId, []);
                // !!! it is important to fill out or pass an empty object as the plugin config otherwise we might get errors...
                context.pluginConfig = {};
                self._client.runServerPlugin(
                    'PetriNetClassification',
                    context,
                    function(err, result){
                        // here comes any additional processing of results or potential errors.
                        console.log('plugin err:', err);
                        console.log('plugin result:', result);
                });
            }
        });
        this._toolbarItems.push(this.$btnPetriNetClassification);

        // Add Reset button for simulator
        this.$btnResetPetriNet = toolBar.addButton({
            title: 'Reset Petri Net',
            icon: 'glyphicon glyphicon-refresh',
            clickFn: function (data) {
                self._widget.resetPetriNet();
            }
        });
        this._toolbarItems.push(this.$btnResetPetriNet);

        // when there are multiple events to choose from we offer a selector
        this.$btnEventSelector = toolBar.addDropDownButton({
            text: 'event'
        });
        this._toolbarItems.push(this.$btnEventSelector);
        this.$btnEventSelector.hide();

        // if there is only one event we just show a play button
        this.$btnSingleEvent = toolBar.addButton({
            title: 'Fire event',
            icon: 'glyphicon glyphicon-play',
            clickFn: function (data) {
              self._widget.fireEvent(self._fireableEvents[0]);
            }
        });
        this._toolbarItems.push(this.$btnSingleEvent);

        this._toolbarInitialized = true;
    };

    return SimPetriNetControl;
});

// HELPER FUNCTIONS
let getMeta = (client, node) => {
  var metaId = node.getMetaTypeId()
  let metaNode = client.getNode(metaId)
  return metaNode.getAttribute('name')
}

let getPlaces = (client, elementIds) => {
  var places_list = []
  elementIds.forEach(id => {
    var node = client.getNode(id)
    if(getMeta(client, node) === 'Place'){
      places_list.push(id)
    }
  })
  return places_list
}

let getTransitions = (client, elementIds) => {
  var transitions_list = []
  elementIds.forEach(id => {
    var node = client.getNode(id)
    if(getMeta(client, node) === 'Transition'){
      transitions_list.push(id)
    }
  })
  return transitions_list
}

let getPlaceToTransitionArcs = (client, elementIds) => {
  var arcs = [];
  elementIds.forEach(id => {
    var node = client.getNode(id)
    if(getMeta(client, node) === 'PlaceToTransitionArc'){
      let arc_object = {
        id: id,
        name: node.getAttribute('name'),
        src: node.getPointerId('src'),
        dst: node.getPointerId('dst')
      }
      arcs.push(arc_object)
    }
  })
  return arcs
}

let getTransitionToPlaceArcs = (client, elementIds) => {
  var arcs = [];
  elementIds.forEach(id => {
    var node = client.getNode(id)
    if(getMeta(client, node) === 'TransitionToPlaceArc'){
      let arc_object = {
        id: id,
        name: node.getAttribute('name'),
        src: node.getPointerId('src'),
        dst: node.getPointerId('dst')
      }
      arcs.push(arc_object)
    }
  })
  return arcs
}

let _checkPetriNetDeadlock = (petriNet) => {
  return Object.keys(petriNet['transitions']).every((transition) => {
    getInplacesForTransition(transitions, petriNet['outplaces']).every(
      (id) => {
        petriNet['places'][id]['tokens'] <= 0;
      }
    );
  });
};

let getOutTransitionsForPlace = (elementId, outplaces) => {
  return Object.keys(outplaces[elementId]).filter(
    (transition) => outplaces[elementId][transition]
  );
};

let getInTransitionsForPlace = (elementId, inplaces) => {
  return Object.keys(inplaces[elementId]).filter(
    (transition) => inplaces[elementId][transition]
  );
};

let getInPlacesForTransition = (elementId, outplaces) => {
  return Object.keys(outplaces).filter(
    (place) => outplaces[place][elementId]
  );
};

let getOutPlacesForTransition = (elementId, inplaces) => {
  return Object.keys(inputMatrix).filter(
    (place) => inplaces[place][elementId]
  );
};

let getSource = (inplaces) => {
  for (const place in inplaces) {
    checkFlow = Object.entries(inplaces[place]).every((element) => {
      return !element[1];
    });
    if (checkFlow) {
      return place
    }
  }
  return inplaces[0]
};

let getNeighbors = (elementId, placeToTransitionArcs, transitionToPlaceArcs) => {
  var neighbors = [];
  var outArcs = placeToTransitionArcs.filter((arc) => arc['src'] === elementId);
  outArcs.forEach((out_arc) => {
    filter_list = transitionToPlaceArcs.filter((out_arc) => out_arc['src'] === out_arc['dst'])
    get_destinations = filter_list.map((out_arc) => {
        if (out_arc['src'] === out_arc['dst']) {
          return out_arc['dst'];
        }
      })
    neighbors.push(get_destinations);
  });
  return neighbors;
};

let getArcsFromPlace = (elementId, placeToTransitionArcs) => {
  return placeToTransitionArcs.filter((arc) => arc['src'] === elementId);
};

let getArcsFromTransition = (elementId, transitionToPlaceArcs) => {
  return transitionToPlaceArcs.filter((arc) => arc['src'] === elementId);
};

let getOutplaces= (placeToTransitionArcs, places, transitions) => {
  let outplaces = {};
  places.forEach((place, i) => {
    outplaces[place] = {};
    transitions.forEach((transition, j) => {
      outplaces[place][transition] = placeToTransitionArcs.some((arc, i) => {
        return arc['src'] === place && arc['dst'] === transition;
      });
    });
  });
  return outplaces;
};

let getInplaces = (transitionToPlaceArcs, places, transitions) => {
  let inplaces = {};
  places.forEach((place, i) => {
    inplaces[place] = {};
    transitions.forEach((transition, j) => {
      inplaces[place][transition] = transitionToPlaceArcs.some((arc, i) => {
        return arc['src'] === transition && arc['dst'] === place;
      });
    });
  });
  return inplaces;
};
