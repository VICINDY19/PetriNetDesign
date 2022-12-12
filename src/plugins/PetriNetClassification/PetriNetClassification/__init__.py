"""
This is where the implementation of the plugin code goes.
The PetriNetClassification-class is imported from both run_plugin.py and run_debug.py
"""
import sys
import logging
from webgme_bindings import PluginBase

# Setup a logger
logger = logging.getLogger('PetriNetClassification')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class PetriNetClassification(PluginBase):
  def main(self):
    active_node = self.active_node
    root_node = self.root_node
    core = self.core
    META = self.META
    self.namespace = None
    nodes = core.load_sub_tree(active_node)   
    logger = self.logger
    
    # Develop petri net graph
    petriNet = {}
    nodesbypath = {}
    
    for node in nodes:
      nodesbypath[core.get_path(node)] = node
      
    for node in nodes:
      if core.is_instance_of(node, META['Place']) or core.is_instance_of(node, META['Transition']):
        path = core.get_path(node)
                             
        entry = {}
        entry['path'] = path
        entry['type'] = core.get_attribute(core.get_meta_type(node), 'name')
        entry['src_paths'] = []
        entry['dst_paths'] = []
       
        for arc in nodes:
          if core.is_instance_of(arc, META['Arc']) or core.is_instance_of(arc, META['PlaceToTransitionArc']) or core.is_instance_of(arc, META['TransitionToPlaceArc']):
            src = core.get_pointer_path(arc, 'src')
            dst = core.get_pointer_path(arc, 'dst')
            srcpath = core.get_path(nodesbypath[src])
            dstpath = core.get_path(nodesbypath[dst])                                

            # Add to the src paths or to the dst paths depending on the match to the current path
            if path == srcpath:
              destination = core.get_base_type(nodesbypath[dst])
              entry['dst_paths'].append({
                'path': dstpath, 
                'name': core.get_attribute(nodesbypath[dst], 'name'),
                'type': core.get_attribute(core.get_meta_type(destination), 'name')
              })
            elif path == dstpath:
              source = core.get_base_type(nodesbypath[src])
              entry['src_paths'].append({
                'path': srcpath, 
                'name': core.get_attribute(nodesbypath[src], 'name'),
                'type': core.get_attribute(core.get_meta_type(source), 'name')
              })
         
          petriNet[path] = entry
    
    # Function to check if the petri net is a free-choice petri net
    # As per assignment: Free-choice petri net - if the intersection of the inplaces sets of two transitions
    # are not empty, then the two transitions should be the same (or in short, each transition has its own
    # unique set of inplaces)
    
    # Stackexchange clarification:
    # As far as there is an intuition behind free-choice nets, it is expressed by their name: whenever there is 
    # a choice, say, between step B or step C (that is to say: we have a place A with an arc to transition B and 
    # an arc to transition C), then that choice is free, that is to say, neither B or C are subject to any other 
    # additional conditions (that is to say, they cannot have additional input places).
    def checkFreeChoice(petriNet):
      for value in petriNet.values():
        if value['type'] == 'Transition':
          if len(value['src_paths']) > 0:
            for path in value['src_paths']:
              in_places = petriNet[path['path']]
              if len(in_places['dst_paths']) == 1 and value['path'] == in_places['dst_paths'][0]['path']: # Check if the transitions are the same, if not empty
                continue
              else:
                return False           
          else:
            return False
      return True
    
    # Function to check if the petri net is a state machine
    # As per assignment: State machine - a petri net is a state machine if every transition has exactly one
    # inplace and one outplace
    def checkStateMachine(petriNet):
      for value in petriNet.values():
        if value['type'] == 'Transition':
          sum_inplaces = 0
          sum_outplaces = 0
          
          for path in value['src_paths']:
            if path['type'] == 'Place':
              sum_inplaces += 1
          for path in value['dst_paths']:
            if path['type'] == 'Place':
              sum_outplaces +=1 
          if sum_inplaces == 1 and sum_outplaces == 1:
            continue
          else: 
            return False
      return True
    
    # Function to check if the petri net is a marked graph
    # As per assignment: Marked graph - a petri net is a marked graph if every place has exactly one out
    # transition and one in transition
    def checkMarkedGraph(petriNet):
      for value in petriNet.values():
        if value['type'] == 'Place':
          sum_inTransitions = 0
          sum_outTransitions = 0
          
          for path in value['src_paths']:
            if path['type'] == 'Transition':
              sum_inTransitions += 1
          for path in value['dst_paths']:
            if path['type'] == 'Transition':
              sum_outTransitions += 1
          if sum_inTransitions == 1 and sum_outTransitions == 1:
            continue
          else:
            return False
      return True
      
    # Function to check if the petri net is a workflow net
    # As per assignment: Workflow net - A petri net is a workflow net if it has exactly one source place s
    # where *s = 0/, one sink place o where o* = 0/, and every x E P U T is on a path from s to o
    
    # As per Google searches for workflow net definition:
    # There's a clear start place (no transition can place a token in this place) == source place
    # There's a clear end place (no transition can consume tokens from this place) == sink place
    # Every other place and transition in the petri net have a path going from the start to the end
    def checkWorkflowNet(petriNet):
      sourcePlace = None
      sinkPlace = None
      
      # First, check if all Transitions have an inplace and outplace
      for value in petriNet.values():
        if value['type'] == 'Transition':
          if len(value['src_paths']) == 0 or len(value['dst_paths']) == 0:
            return False
          
      # Set the Source and Sink
      # If there are multiple places that can be a source or a sink, then it is not a workflow net
      for value in petriNet.values():
        if value['type'] == 'Place':
          if len(value['src_paths']) == 0 and len(value['dst_paths']) == 0:
            return False
          else:
            # Set the source
            if len(value['src_paths']) == 0:
              if sourcePlace is not None:
                return False
              else:
                sourcePlace = value
            
            # Set the sink
            if len(value['dst_paths']) == 0:
              if sinkPlace is not None:
                return False
              else:
                sinkPlace = value
                
      if sourcePlace and sinkPlace:
        visited = set()
        queue = []
        never_pop = []
        sources_set = {}
        
        # Add the initial source to the lists
        visited.add(sourcePlace['path'])
        queue.append(sourcePlace['path'])
        sources_set[sourcePlace['path']] = None
        
        while len(queue) > 0:
          q = queue.pop(0)
          for p in petriNet[q]['dst_paths']:
            if p['path'] not in visited:
              visited.add(p['path'])
              queue.append(p['path'])
              never_pop.append(p)
              sources_set[p['path']] = q
        
        # Get the paths going from the source to the sink
        for n in never_pop:
          overall_paths = []
          loop = n['path']
          while loop is not None:
            overall_paths.insert(0, loop)
            loop = sources_set[loop]
            
        if len(overall_paths) != 0:
          if overall_paths[0] == sourcePlace['path'] and overall_paths[len(overall_paths)-1] == sinkPlace['path']:
            return True
      
      return False
    
    notifs = []
    # Call check functions to obtain notifications for output
    if checkFreeChoice(petriNet):
      notifs.append("The Petri net is a Free-choice petri net.")
    
    if checkStateMachine(petriNet):
      notifs.append("The Petri net is a State Machine.")
      
    if checkMarkedGraph(petriNet):
      notifs.append("The Petri net is a Marked Graph.")
      
    if checkWorkflowNet(petriNet):
      notifs.append("The Petri net is a Workflow net.")
     
    if len(notifs) == 0:
      notifs.append("The Petri net did not meet any of the specified classifications (Free-choice petri net, State Machine, Marked Graph & Workflow net).")
    
    # Send off the notifs!
    output_string = ""
    for index, value in enumerate(notifs):
      if index == len(notifs)-1:
        output_string += value 
      else:
        output_string += (value + '\n')
    logger.info('The output string is {0}'.format(output_string))
    self.send_notification(output_string)
    
      
      

