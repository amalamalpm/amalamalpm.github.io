/**
 * GEDCOM Family Tree Editor
 * Copyright (c) 2024-2026 amalamalpm
 * Licensed under MIT License - see LICENSE.txt
 */

import cytoscape from "./cytoscape.esm.mjs";
import display from './gedcom.js';
import {displayFileContent} from "./gedcom_edit.js";

let positionMap = new Map();
let elements = [];
let mapToDisplay;
let lastTappedNode = null;

// Node dimensions - sized for photo + name layout
let node_height = 85;
let node_width = 100;
let spacing_between_nodes_and_rows = 1.5; // Compact spacing

// Colors - theme aware
function getThemeColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    male: isDark ? '#1e3a5f' : '#cde4f9',
    female: isDark ? '#4a2c3d' : '#f9d5e5',
    unknown: isDark ? '#374151' : '#e8e8e8',
    maleBorder: isDark ? '#3b82f6' : '#7eb3d8',
    femaleBorder: isDark ? '#ec4899' : '#d4a5b5',
    unknownBorder: isDark ? '#6b7280' : '#bbb',
    text: isDark ? '#f1f5f9' : '#333',
    edge: isDark ? '#64748b' : '#94a3b8',
    primary: isDark ? '#3b82f6' : '#2563eb'
  };
}

let family_color = '#fdd';
let node_color = '#ddd';
let node_color_M = '#ccf';
let node_color_F = '#cfC';
let node_color_M_alive = '#cff';
let node_color_F_alive = '#FfC';

// Generation filter settings
let focusPersonId = null;
let maxGenerations = 100; // Show all by default

/* Generation filtering functions */
function setFocusPerson(personId) {
  focusPersonId = personId;
}

function setMaxGenerations(count) {
  maxGenerations = count;
}

function clearFilter() {
  focusPersonId = null;
  maxGenerations = 100;
}

function calculateGenerationDistance(startId, targetId, gedcomData) {
  if (!startId || !targetId || startId === targetId) return 0;
  if (!gedcomData || !gedcomData.indviduals || !gedcomData.families) return Infinity;
  
  const visited = new Set();
  const queue = [{id: startId, distance: 0}];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.id === targetId) return current.distance;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    const person = gedcomData.indviduals.get(current.id);
    if (!person) continue;
    
    // Add parents (via FAMC)
    if (person.FAMC) {
      const famcList = Array.isArray(person.FAMC) ? person.FAMC : [person.FAMC];
      famcList.forEach(famc => {
        const family = gedcomData.families.get(famc.id);
        if (family) {
          if (family.HUSB) {
            const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
            husbList.forEach(h => queue.push({id: h.id, distance: current.distance + 1}));
          }
          if (family.WIFE) {
            const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
            wifeList.forEach(w => queue.push({id: w.id, distance: current.distance + 1}));
          }
        }
      });
    }
    
    // Add children (via FAMS)
    if (person.FAMS) {
      const famsList = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
      famsList.forEach(fams => {
        const family = gedcomData.families.get(fams.id);
        if (family && family.CHIL) {
          const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
          childList.forEach(c => queue.push({id: c.id, distance: current.distance + 1}));
        }
      });
    }
    
    // Add spouse
    if (person.FAMS) {
      const famsList = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
      famsList.forEach(fams => {
        const family = gedcomData.families.get(fams.id);
        if (family) {
          if (family.HUSB) {
            const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
            husbList.forEach(h => {
              if (h.id !== current.id) queue.push({id: h.id, distance: current.distance});
            });
          }
          if (family.WIFE) {
            const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
            wifeList.forEach(w => {
              if (w.id !== current.id) queue.push({id: w.id, distance: current.distance});
            });
          }
        }
      });
    }
  }
  return Infinity;
}

function isNodeVisible(nodeId, gedcomData) {
  if (!focusPersonId || maxGenerations >= 100) return true;
  if (!gedcomData || !gedcomData.families || !gedcomData.indviduals) return true;
  
  // Check if it's a family node (FAM IDs start with @F)
  if (nodeId && nodeId.startsWith('@F')) {
    const family = gedcomData.families.get(nodeId);
    if (!family) return false;
    
    // Family is visible if any member is visible
    const members = [];
    if (family.HUSB) {
      const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
      members.push(...husbList.map(h => h.id));
    }
    if (family.WIFE) {
      const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
      members.push(...wifeList.map(w => w.id));
    }
    if (family.CHIL) {
      const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
      members.push(...childList.map(c => c.id));
    }
    
    return members.some(memberId => {
      const dist = calculateGenerationDistance(focusPersonId, memberId, gedcomData);
      return dist <= maxGenerations;
    });
  }
  
  const distance = calculateGenerationDistance(focusPersonId, nodeId, gedcomData);
  return distance <= maxGenerations;
}

/* Drawing of graph */

function addEdges(row, gedcomData) {
  if (!row) return;
  
  // Draw edges
  if (row.HUSB) {
    let husbands = row.HUSB;
    if (!Array.isArray(husbands)) {
      husbands = [husbands];
    }
    husbands.forEach((husband) => {
      if (husband && husband.id && isNodeVisible(husband.id, gedcomData) && isNodeVisible(row.id, gedcomData)) {
      elements.push({
        group: 'edges',
          classes: ['edges_v', 'edge_husb'],
        data: {
          id: "edge_" + row.id + "_" + husband.id, source: husband.id, target: row.id, label: 'H'}
      });
      }
    })
  }
  if (row.WIFE) {
    let wives = row.WIFE;
    if (!Array.isArray(wives)) {
      wives = [wives];
    }
    wives.forEach((wife) => {
      if (wife && wife.id && isNodeVisible(wife.id, gedcomData) && isNodeVisible(row.id, gedcomData)) {
      elements.push({
        group: 'edges',
          classes: ['edges_v', 'edge_wife'],
          data: {id: "edge_" + row.id + "_" + wife.id, source: wife.id, target: row.id, label: 'W'}
      });
      }
    })
  }
  if (row.CHIL) {
    let children = row.CHIL
    if (!Array.isArray(children)) {
      children = [children];
    }
    children.forEach((child) => {
      if (child && child.id && isNodeVisible(child.id, gedcomData) && isNodeVisible(row.id, gedcomData)) {
      elements.push({
        group: 'edges',
          classes: ['edges_h', 'edge_child'],
        data: {id: "edge_" + row.id + "_" + child.id, source: child.id, target: row.id, label: 'C'}
      });
      }
    });
  }
}

function extractLabel(rowForLabel) {
  if(rowForLabel.NAME && rowForLabel.NAME.value && rowForLabel.NAME.value.length > 0) {
    return rowForLabel.NAME.value;
  } else if(rowForLabel.id) {
    return rowForLabel.id.replaceAll('@', '');
  }
  return "-"
}

function extractDates(row) {
  let dates = '';
  if (row.BIRT && row.BIRT.DATE) {
    dates += row.BIRT.DATE.value || '';
  }
  if (row.DEAT && row.DEAT.DATE) {
    dates += ' - ' + (row.DEAT.DATE.value || '');
  } else if (dates) {
    dates += ' - ';
  }
  return dates;
}

function parseAndConvertIntoElements() {
  mapToDisplay = display();
  const gedcomData = document.dataParsed;
  positionMap = new Map();
  elements = [];
  
  if (!mapToDisplay) return elements;
  
  // Track column index per row for compact layout after filtering
  const rowColCounters = new Map();
  
  mapToDisplay.forEach((value, key) => {
    if (!value || !value.order) return;
    
    // Initialize column counter for this row
    if (!rowColCounters.has(key)) {
      rowColCounters.set(key, 0);
    }
    
    value.order.forEach((row) => {
      // Apply generation filter
      if (!isNodeVisible(row.id, gedcomData)) {
        return; // Skip this node
      }
      
      // Get next column index for this row (compact positioning)
      const colIndex = rowColCounters.get(key);
      rowColCounters.set(key, colIndex + 1);
      
      let rowElement = {
        group: 'nodes',
        classes: [row.tag === 'FAM' ? 'family' : 'nodes'],
        data: {
          id: row.id,
          label: extractLabel(row),
          dates: extractDates(row),
          familyRow: row,
          coloVals: colIndex,  // Use recalculated column index
          gender: row.SEX ? ( row.SEX.value==='M' ? 'M' : (row.SEX.value==='F'? 'F' : 'U') ) : 'U',
          alive: (row.DEAT != null || row.DEATH != null),
        },
        position: {x: 0, y: 0}
      };
      if (row.tag === 'FAM') {
        addEdges(row, gedcomData);
      }

      positionMap.set(row.id, row.rowLevel);
      elements.push(rowElement);
    });
  });

  return elements;
}

let cy;

function startDraw() {
  cy = cytoscape({

    container: document.getElementById('cy'), // container to render in

    elements: parseAndConvertIntoElements(),

    style: [ // the stylesheet for the graph
      // Individual person nodes
      {
        selector: 'node.nodes',
        style: {
          'width': node_width,
          'height': node_height,
          'background-fit': 'contain',
          'background-image': function (ele){
            const familyRow = ele.data('familyRow');
            let imageDataOrUrl = familyRow && familyRow.IMG && familyRow.IMG.value;
            if (imageDataOrUrl) {
              return imageDataOrUrl;
            }
            return 'none';
          },
          'background-width': '70%',
          'background-height': '70%',
          'background-position-y': '15%',  // Position image in upper part
          'background-opacity': function(ele) {
            // Full opacity if has image, otherwise use background color
            const familyRow = ele.data('familyRow');
            return (familyRow && familyRow.IMG && familyRow.IMG.value) ? 1 : 0;
          },
          'label': function(ele) {
            // Show name at bottom
            const label = ele.data('label') || '';
            return label.replace(/\//g, '').trim();
          },
          'text-valign': 'bottom',  // Name at bottom
          'text-halign': 'center',
          'text-margin-y': 5,  // Small margin from bottom edge
          'font-size': '9px',
          'font-weight': '600',
          'font-family': 'Arial, sans-serif',
          'text-wrap': 'wrap',
          'text-max-width': node_width - 6,
          'text-background-color': function(ele) {
            // Add background to text for readability over images
            const colors = getThemeColors();
            let gender = ele.data('gender') || 'U';
            if (gender === 'M') return colors.male;
            if (gender === 'F') return colors.female;
            return colors.unknown;
          },
          'text-background-opacity': 0.85,
          'text-background-padding': '2px',
          'color': function() { return getThemeColors().text; },
          'background-color': function (ele) {
            const colors = getThemeColors();
            let gender = ele.data('gender') || 'U';
            if (gender === 'M') return colors.male;
            if (gender === 'F') return colors.female;
            return colors.unknown;
          },
          'border-width': 1,
          'border-color': function (ele) {
            const colors = getThemeColors();
            let gender = ele.data('gender') || 'U';
            if (gender === 'M') return colors.maleBorder;
            if (gender === 'F') return colors.femaleBorder;
            return colors.unknownBorder;
          },
          'shape': 'round-rectangle'
        }
      },
      // Family nodes - small subtle diamond for marriage/family connection
      {
        selector: 'node.family',
        style: {
          'width': 12,
          'height': 12,
          'shape': 'diamond',
          'background-color': function() {
            return document.documentElement.getAttribute('data-theme') === 'dark' ? '#475569' : '#cbd5e1';
          },
          'border-width': 1,
          'border-color': function() {
            return document.documentElement.getAttribute('data-theme') === 'dark' ? '#64748b' : '#94a3b8';
          },
          'opacity': 0.7,
          'label': ''
        }
      },
      // Selected node highlight
      {
        selector: '.selectedNode',
        style: {
          'border-width': 3,
          'border-color': function() { return getThemeColors().primary; },
          'border-style': 'solid'
        }
      },
      // Nodes with hidden connections - dotted border indicator
      {
        selector: '.has-hidden',
        style: {
          'border-width': 1,
          'border-style': 'dashed',
          'border-color': '#f59e0b'  // Amber/orange color
        }
      },
      // Combined: selected + has-hidden
      {
        selector: '.selectedNode.has-hidden',
        style: {
          'border-width': 3,
          'border-color': '#2563eb',
          'border-style': 'dashed'
        }
      },
      // Search match highlight
      {
        selector: '.search-match',
        style: {
          'border-width': 3,
          'border-color': '#f59e0b',
          'border-style': 'solid',
          'background-opacity': 1
        }
      },
      // Edges - base style
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': function() { return getThemeColors().edge; },
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '9px',
          'font-weight': 'bold',
          'text-background-color': function() { 
            return document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#fff';
          },
          'text-background-opacity': 0.9,
          'text-background-padding': '2px',
          'color': function() { return getThemeColors().text; }
        }
      },
      // Husband edges
      {
        selector: 'edge.edge_husb',
        style: {
          'line-color': function() { return getThemeColors().maleBorder; },
          'color': function() { return getThemeColors().maleBorder; }
        }
      },
      // Wife edges
      {
        selector: 'edge.edge_wife',
        style: {
          'line-color': function() { return getThemeColors().femaleBorder; },
          'color': function() { return getThemeColors().femaleBorder; }
        }
      },
      // Child edges
      {
        selector: 'edge.edge_child',
        style: {
          'line-color': function() { return getThemeColors().edge; },
          'color': function() { return getThemeColors().edge; }
        }
      },
      // Spouse connection edges (to family node)
      {
        selector: 'edge.edges_v',
        style: {
          'curve-style': 'straight',
          'line-style': 'solid',
          'source-endpoint': '0 50%',   // Bottom of spouse node
          'target-endpoint': '0 0'      // Center of family node
        }
      },
      // Parent-child edges (vertical) - source is child, target is family
      {
        selector: 'edge.edges_h',
        style: {
          'curve-style': 'bezier',
          'source-endpoint': '0 -50%',  // Connect to TOP of child node
          'target-endpoint': '0 0'       // Center of family node
        }
      },
    ],

    layout: {
      name: 'grid',
      spacingFactor: 1.5,
      padding: 30,
      avoidOverlap: true,
      avoidOverlapPadding: 10,
      condense: true,
      position: function (node) {
        let row = positionMap.get(node.id());
        let col = node.data('coloVals');
        if (row === undefined) row = 0;
        if (col === undefined) col = 0;
        if (node.hasClass('family')) {
          row = row + 0.5;  // Family nodes centered between parents and children
        }
        return {row: row, col: col};
      }
    }

  });

  // Mark nodes that have hidden connections (for visual indicator)
  markNodesWithHiddenConnections();

  /*
  Actions on nodes
   */

  cy.on('tap', 'node', function (evt) {
    let node = evt.target;
    let familyRow = node.data('familyRow');
    displayFileContent(familyRow);

    if (lastTappedNode) {
      lastTappedNode.removeClass('selectedNode');
    }
    node.addClass('selectedNode');
    lastTappedNode = node;

    // Update the "Focus on Person" dropdown to this person for easy filtering
    if (familyRow && familyRow.tag === 'INDI' && familyRow.id) {
      const focusSelect = document.getElementById('focusPerson');
      const focusSearch = document.getElementById('focusPersonSearch');
      if (focusSelect) {
        focusSelect.value = familyRow.id;
      }
      if (focusSearch) {
        const name = extractLabel(familyRow) || familyRow.id;
        focusSearch.value = name;
      }
    }

    // If filtering is active and clicked on a person node, offer to refocus
    if (focusPersonId && familyRow && familyRow.tag === 'INDI' && familyRow.id !== focusPersonId) {
      // Trigger callback to update focus if set
      if (onNodeClickedWhileFiltering) {
        onNodeClickedWhileFiltering(familyRow.id, extractLabel(familyRow));
      }
    }
  });
}

// Callback for when a node is clicked while filtering
let onNodeClickedWhileFiltering = null;

function setNodeClickCallback(callback) {
  onNodeClickedWhileFiltering = callback;
}

// Drag & drop state
let dragEnabled = true;

function toggleDragMode(enabled) {
  dragEnabled = enabled !== undefined ? enabled : !dragEnabled;
  if (cy) {
    cy.nodes().forEach(node => {
      node.grabify();
      if (!dragEnabled) {
        node.ungrabify();
      }
    });
  }
  return dragEnabled;
}

function isDragEnabled() {
  return dragEnabled;
}

// Lock all nodes (disable dragging)
function lockNodes() {
  if (cy) {
    cy.nodes().ungrabify();
    dragEnabled = false;
  }
}

// Unlock all nodes (enable dragging)
function unlockNodes() {
  if (cy) {
    cy.nodes().grabify();
    dragEnabled = true;
  }
}

function isFilterActive() {
  return focusPersonId !== null && maxGenerations < 100;
}

// Check and mark nodes that have hidden (filtered out) connections
function markNodesWithHiddenConnections() {
  if (!cy || !isFilterActive()) return;
  
  const gedcomData = document.dataParsed;
  if (!gedcomData) return;
  
  const visibleNodeIds = new Set(cy.nodes().map(n => n.id()));
  
  cy.nodes('.nodes').forEach(node => {
    const personId = node.id();
    const person = gedcomData.indviduals.get(personId);
    if (!person) return;
    
    let hasHidden = false;
    
    // Check spouse families (FAMS) for hidden members
    if (person.FAMS) {
      const famsList = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
      for (const famsRef of famsList) {
        const family = gedcomData.families.get(famsRef.id);
        if (!family) continue;
        
        // Check spouse
        const spouseRefs = person.SEX?.value === 'M' ? family.WIFE : family.HUSB;
        if (spouseRefs) {
          const spouseList = Array.isArray(spouseRefs) ? spouseRefs : [spouseRefs];
          if (spouseList.some(s => !visibleNodeIds.has(s.id))) {
            hasHidden = true;
            break;
          }
        }
        
        // Check children
        if (family.CHIL) {
          const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
          if (childList.some(c => !visibleNodeIds.has(c.id))) {
            hasHidden = true;
            break;
          }
        }
      }
    }
    
    // Check parent family (FAMC) for hidden members
    if (!hasHidden && person.FAMC) {
      const famcList = Array.isArray(person.FAMC) ? person.FAMC : [person.FAMC];
      for (const famcRef of famcList) {
        const family = gedcomData.families.get(famcRef.id);
        if (!family) continue;
        
        // Check parents
        if (family.HUSB) {
          const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
          if (husbList.some(h => !visibleNodeIds.has(h.id))) {
            hasHidden = true;
            break;
          }
        }
        if (family.WIFE) {
          const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
          if (wifeList.some(w => !visibleNodeIds.has(w.id))) {
            hasHidden = true;
            break;
          }
        }
        
        // Check siblings
        if (family.CHIL) {
          const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
          if (childList.some(c => c.id !== personId && !visibleNodeIds.has(c.id))) {
            hasHidden = true;
            break;
          }
        }
      }
    }
    
    // Apply or remove the class
    if (hasHidden) {
      node.addClass('has-hidden');
    } else {
      node.removeClass('has-hidden');
    }
  });
}

// Expand to show connected family members of a person without full re-render
function expandFromPerson(personId) {
  if (!cy) return;
  
  const gedcomData = document.dataParsed;
  if (!gedcomData) return;
  
  const person = gedcomData.indviduals.get(personId);
  if (!person) return;
  
  const clickedNode = cy.getElementById(personId);
  if (clickedNode.length === 0) return;
  
  const clickedPos = clickedNode.position();
  const newElements = [];
  const existingIds = new Set(cy.nodes().map(n => n.id()));
  
  // Helper to create a node element
  function createNodeElement(row, xOffset, yOffset) {
    if (existingIds.has(row.id)) return null;
    existingIds.add(row.id);
    
    return {
      group: 'nodes',
      classes: [row.tag === 'FAM' ? 'family' : 'nodes'],
      data: {
        id: row.id,
        label: extractLabel(row),
        familyRow: row,
        gender: row.SEX ? (row.SEX.value === 'M' ? 'M' : (row.SEX.value === 'F' ? 'F' : 'U')) : 'U',
        alive: (row.DEAT != null || row.DEATH != null),
      },
      position: { x: clickedPos.x + xOffset, y: clickedPos.y + yOffset }
    };
  }
  
  // Helper to create edge element with relationship label
  function createEdgeElement(sourceId, targetId, edgeClass, relationType) {
    const edgeId = `edge_${targetId}_${sourceId}`;
    if (cy.getElementById(edgeId).length > 0) return null;
    
    // Determine label and type class based on relationship
    let label = '';
    let typeClass = '';
    if (relationType === 'husb') { label = 'H'; typeClass = 'edge_husb'; }
    else if (relationType === 'wife') { label = 'W'; typeClass = 'edge_wife'; }
    else if (relationType === 'child') { label = 'C'; typeClass = 'edge_child'; }
    
    return {
      group: 'edges',
      classes: [edgeClass, typeClass].filter(Boolean),
      data: { id: edgeId, source: sourceId, target: targetId, label: label }
    };
  }
  
  let xOffset = 0;
  
  // Add spouse families (FAMS)
  if (person.FAMS) {
    const famsList = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
    famsList.forEach(famsRef => {
      const family = gedcomData.families.get(famsRef.id);
      if (!family) return;
      
      // Add family node (centered between parents at y=0 and children at y=120)
      const famNode = createNodeElement(family, 0, 60);
      if (famNode) newElements.push(famNode);
      
      // Add edge from person to family (determine if husb or wife)
      const isHusband = person.SEX?.value === 'M';
      const famEdge = createEdgeElement(personId, family.id, 'edges_v', isHusband ? 'husb' : 'wife');
      if (famEdge) newElements.push(famEdge);
      
      // Add spouse
      const spouseRefs = isHusband ? family.WIFE : family.HUSB;
      const spouseType = isHusband ? 'wife' : 'husb';
      if (spouseRefs) {
        const spouseList = Array.isArray(spouseRefs) ? spouseRefs : [spouseRefs];
        spouseList.forEach((spouseRef, idx) => {
          const spouse = gedcomData.indviduals.get(spouseRef.id);
          if (spouse) {
            const spouseNode = createNodeElement(spouse, (idx + 1) * 120, 0);
            if (spouseNode) newElements.push(spouseNode);
            const spouseEdge = createEdgeElement(spouse.id, family.id, 'edges_v', spouseType);
            if (spouseEdge) newElements.push(spouseEdge);
          }
        });
      }
      
      // Add children
      if (family.CHIL) {
        const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
        childList.forEach((childRef, idx) => {
          const child = gedcomData.indviduals.get(childRef.id);
          if (child) {
            const childNode = createNodeElement(child, (idx - childList.length/2) * 110, 120);
            if (childNode) newElements.push(childNode);
            const childEdge = createEdgeElement(child.id, family.id, 'edges_h', 'child');
            if (childEdge) newElements.push(childEdge);
          }
        });
      }
    });
  }
  
  // Add parent family (FAMC)
  if (person.FAMC) {
    const famcList = Array.isArray(person.FAMC) ? person.FAMC : [person.FAMC];
    famcList.forEach(famcRef => {
      const family = gedcomData.families.get(famcRef.id);
      if (!family) return;
      
      // Add family node (centered between parents at y=-120 and child at y=0)
      const famNode = createNodeElement(family, 0, -60);
      if (famNode) newElements.push(famNode);
      
      // Add edge from person to family (as child)
      const famEdge = createEdgeElement(personId, family.id, 'edges_h', 'child');
      if (famEdge) newElements.push(famEdge);
      
      // Add parents
      if (family.HUSB) {
        const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
        husbList.forEach((husbRef, idx) => {
          const husb = gedcomData.indviduals.get(husbRef.id);
          if (husb) {
            const husbNode = createNodeElement(husb, -60 - idx * 110, -120);
            if (husbNode) newElements.push(husbNode);
            const husbEdge = createEdgeElement(husb.id, family.id, 'edges_v', 'husb');
            if (husbEdge) newElements.push(husbEdge);
          }
        });
      }
      if (family.WIFE) {
        const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
        wifeList.forEach((wifeRef, idx) => {
          const wife = gedcomData.indviduals.get(wifeRef.id);
          if (wife) {
            const wifeNode = createNodeElement(wife, 60 + idx * 110, -120);
            if (wifeNode) newElements.push(wifeNode);
            const wifeEdge = createEdgeElement(wife.id, family.id, 'edges_v', 'wife');
            if (wifeEdge) newElements.push(wifeEdge);
          }
        });
      }
      
      // Add siblings (as children of the same family)
      if (family.CHIL) {
        const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
        childList.forEach((childRef, idx) => {
          if (childRef.id === personId) return; // Skip self
          const sibling = gedcomData.indviduals.get(childRef.id);
          if (sibling) {
            const sibNode = createNodeElement(sibling, (idx - childList.length/2) * 110, 0);
            if (sibNode) newElements.push(sibNode);
            const sibEdge = createEdgeElement(sibling.id, family.id, 'edges_h', 'child');
            if (sibEdge) newElements.push(sibEdge);
          }
        });
      }
    });
  }
  
  // Add new elements to graph
  if (newElements.length > 0) {
    cy.add(newElements);
    
    // Refresh hidden connection indicators
    markNodesWithHiddenConnections();
    
    // Animate to fit new nodes
    cy.animate({
      fit: { eles: cy.elements(), padding: 30 },
      duration: 300
    });
  }
  
  return newElements.length;
}

// Zoom controls
function zoomIn() {
  if (cy) cy.zoom(cy.zoom() * 1.2);
}

function zoomOut() {
  if (cy) cy.zoom(cy.zoom() / 1.2);
}

function fitToScreen() {
  if (cy) cy.fit(50);
}

// Re-layout current visible nodes to fix overlapping
function relayoutNodes() {
  if (!cy) return;
  
  const gedcomData = document.dataParsed;
  const nodePositions = new Map();
  
  // Step 1: Group individual (INDI) nodes by row level
  const rowGroups = new Map();
  const familyNodes = [];
  
  cy.nodes().forEach(node => {
    const familyRow = node.data('familyRow');
    let row = familyRow ? familyRow.rowLevel : 0;
    if (row === undefined || row === null) row = 0;
    
    if (node.hasClass('family')) {
      // Save family nodes for later positioning
      familyNodes.push({ node: node, row: row + 0.5 });
    } else {
      // Group individual nodes by row
      if (!rowGroups.has(row)) {
        rowGroups.set(row, []);
      }
      rowGroups.get(row).push({
        node: node,
        currentX: node.position('x')
      });
    }
  });
  
  // Step 2: Sort individual nodes within each row and assign sequential columns
  rowGroups.forEach((nodes, row) => {
    nodes.sort((a, b) => a.currentX - b.currentX);
    nodes.forEach((item, idx) => {
      nodePositions.set(item.node.id(), { row: row, col: idx });
    });
  });
  
  // Step 3: Position family nodes between their husband and wife
  familyNodes.forEach(({ node, row }) => {
    const familyRow = node.data('familyRow');
    let col = 0;
    let foundSpouses = false;
    
    if (familyRow && gedcomData) {
      const husbCol = [];
      const wifeCol = [];
      
      // Find husband column(s)
      if (familyRow.HUSB) {
        const husbList = Array.isArray(familyRow.HUSB) ? familyRow.HUSB : [familyRow.HUSB];
        husbList.forEach(h => {
          const pos = nodePositions.get(h.id);
          if (pos !== undefined) husbCol.push(pos.col);
        });
      }
      
      // Find wife column(s)
      if (familyRow.WIFE) {
        const wifeList = Array.isArray(familyRow.WIFE) ? familyRow.WIFE : [familyRow.WIFE];
        wifeList.forEach(w => {
          const pos = nodePositions.get(w.id);
          if (pos !== undefined) wifeCol.push(pos.col);
        });
      }
      
      // Calculate average column position between spouses
      const allCols = [...husbCol, ...wifeCol];
      if (allCols.length > 0) {
        col = allCols.reduce((a, b) => a + b, 0) / allCols.length;
        foundSpouses = true;
      }
    }
    
    // If no spouses found, use current x position to estimate column
    if (!foundSpouses) {
      col = node.position('x') / 120;
    }
    
    nodePositions.set(node.id(), { row: row, col: col });
  });
  
  // Run the grid layout with pre-calculated positions
  const layout = cy.layout({
    name: 'grid',
    spacingFactor: 1.5,
    padding: 30,
    avoidOverlap: true,
    avoidOverlapPadding: 20,
    condense: true,
    animate: true,
    animationDuration: 300,
    position: function (node) {
      const pos = nodePositions.get(node.id());
      if (pos) {
        return { row: pos.row, col: pos.col };
      }
      return { row: 0, col: 0 };
    }
  });
  
  layout.run();
  
  // Fit to screen after layout completes
  setTimeout(() => {
    cy.fit(30);
  }, 350);
}

function centerOnNode(nodeId) {
  if (cy) {
    const node = cy.getElementById(nodeId);
    if (node.length > 0) {
      cy.center(node);
      cy.zoom(1.5);
    }
  }
}

// Get all individuals for dropdown
function getAllIndividuals() {
  const gedcomData = document.dataParsed;
  if (!gedcomData || !gedcomData.indviduals) return [];
  
  const individuals = [];
  gedcomData.indviduals.forEach((person, id) => {
    const fullName = extractLabel(person);
    const nickname = person._NICK?.value || '';
    individuals.push({
      id: id,
      name: fullName,
      nickname: nickname,
      displayName: formatDisplayName(fullName, nickname)
    });
  });
  return individuals.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// Format name with nickname based on user preference
function formatDisplayName(fullName, nickname) {
  const showNickname = localStorage.getItem('showNicknameInDisplay') !== 'false'; // Default true
  if (showNickname && nickname && nickname.trim()) {
    const cleanName = fullName.replace(/\//g, '');
    return `${cleanName} "${nickname}"`;
  }
  return fullName.replace(/\//g, '');
}

// Get the show nickname setting
function getShowNicknameSetting() {
  return localStorage.getItem('showNicknameInDisplay') !== 'false';
}

// Set the show nickname setting
function setShowNicknameSetting(value) {
  localStorage.setItem('showNicknameInDisplay', value ? 'true' : 'false');
}

// Update a node's display data without full redraw (preserves expanded nodes)
function updateNodeData(nodeId) {
  if (!cy) return;
  
  const gedcomData = document.dataParsed;
  if (!gedcomData) return;
  
  const node = cy.getElementById(nodeId);
  if (node.length === 0) return;
  
  // Get updated data from gedcom
  const person = gedcomData.indviduals.get(nodeId);
  if (!person) return;
  
  // Update node data
  node.data('label', extractLabel(person));
  node.data('familyRow', person);
  node.data('gender', person.SEX ? (person.SEX.value === 'M' ? 'M' : (person.SEX.value === 'F' ? 'F' : 'U')) : 'U');
  node.data('alive', (person.DEAT != null || person.DEATH != null));
  
  // Trigger style update
  node.style();
}

// Update all visible nodes' display data without full redraw
function updateAllNodesData() {
  if (!cy) return;
  
  const gedcomData = document.dataParsed;
  if (!gedcomData) return;
  
  cy.nodes('.nodes').forEach(node => {
    const nodeId = node.id();
    const person = gedcomData.indviduals.get(nodeId);
    if (person) {
      node.data('label', extractLabel(person));
      node.data('familyRow', person);
      node.data('gender', person.SEX ? (person.SEX.value === 'M' ? 'M' : (person.SEX.value === 'F' ? 'F' : 'U')) : 'U');
      node.data('alive', (person.DEAT != null || person.DEATH != null));
    }
  });
  
  // Trigger style refresh
  cy.style().update();
}

// Refresh graph styles (called when theme changes)
function refreshStyles() {
  if (cy) {
    cy.style().update();
  }
}

// Search persons by name, date, or place
function searchPersons(query) {
  if (!cy || !query || query.trim().length === 0) {
    // Clear search highlighting
    if (cy) {
      cy.nodes('.search-match').removeClass('search-match');
    }
    return [];
  }
  
  const searchTerm = query.toLowerCase().trim();
  const gedcomData = document.dataParsed;
  const results = [];
  
  // Clear previous search highlights
  cy.nodes('.search-match').removeClass('search-match');
  
  // Search through all visible nodes
  cy.nodes('.nodes').forEach(node => {
    const familyRow = node.data('familyRow');
    if (!familyRow) return;
    
    let matches = false;
    
    // Search in name
    if (familyRow.NAME && familyRow.NAME.value) {
      if (familyRow.NAME.value.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
    }
    
    // Search in nickname
    if (familyRow._NICK && familyRow._NICK.value) {
      if (familyRow._NICK.value.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
    }
    
    // Search in birth date/place
    if (familyRow.BIRT) {
      if (familyRow.BIRT.DATE && familyRow.BIRT.DATE.value && 
          familyRow.BIRT.DATE.value.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
      if (familyRow.BIRT.PLAC && familyRow.BIRT.PLAC.value && 
          familyRow.BIRT.PLAC.value.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
    }
    
    // Search in death date/place
    if (familyRow.DEAT) {
      if (familyRow.DEAT.DATE && familyRow.DEAT.DATE.value && 
          familyRow.DEAT.DATE.value.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
      if (familyRow.DEAT.PLAC && familyRow.DEAT.PLAC.value && 
          familyRow.DEAT.PLAC.value.toLowerCase().includes(searchTerm)) {
        matches = true;
      }
    }
    
    // Search in ID
    if (node.id().toLowerCase().includes(searchTerm)) {
      matches = true;
    }
    
    if (matches) {
      node.addClass('search-match');
      const fullName = extractLabel(familyRow);
      const nickname = familyRow._NICK?.value || '';
      results.push({
        id: node.id(),
        name: fullName,
        nickname: nickname,
        displayName: formatDisplayName(fullName, nickname),
        node: node
      });
    }
  });
  
  return results;
}

// Center on search result
function centerOnSearchResult(nodeId) {
  if (!cy) return;
  const node = cy.getElementById(nodeId);
  if (node.length > 0) {
    cy.animate({
      center: { eles: node },
      zoom: 1.5,
      duration: 300
    });
    // Select the node
    if (lastTappedNode) {
      lastTappedNode.removeClass('selectedNode');
    }
    node.addClass('selectedNode');
    lastTappedNode = node;
  }
}

// Clear search highlighting
function clearSearch() {
  if (cy) {
    cy.nodes('.search-match').removeClass('search-match');
  }
}

// Export graph as PNG
function exportAsPng(scale = 2) {
  if (!cy) return null;
  
  const png = cy.png({
    output: 'blob',
    bg: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0f172a' : '#f5f7fa',
    full: true,
    scale: scale
  });
  
  return png;
}

// Export graph as SVG
function exportAsSvg() {
  if (!cy) return null;
  
  const svg = cy.svg({
    full: true,
    bg: document.documentElement.getAttribute('data-theme') === 'dark' ? '#0f172a' : '#f5f7fa'
  });
  
  return svg;
}

// Download PNG
function downloadPng(filename = 'family-tree.png', scale = 2) {
  const blob = exportAsPng(scale);
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Download SVG
function downloadSvg(filename = 'family-tree.svg') {
  const svg = exportAsSvg();
  if (svg) {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Calculate statistics from the family tree
function calculateStatistics() {
  const gedcomData = document.dataParsed;
  if (!gedcomData) return null;
  
  const stats = {
    totalPersons: 0,
    males: 0,
    females: 0,
    unknown: 0,
    totalFamilies: 0,
    livingPersons: 0,
    deceasedPersons: 0,
    avgLifespan: 0,
    oldestPerson: null,
    youngestBirth: null,
    mostChildren: { family: null, count: 0 },
    commonSurnames: {},
    commonFirstNames: {},
    birthsByDecade: {},
    places: {}
  };
  
  const lifespans = [];
  
  // Process individuals
  if (gedcomData.indviduals) {
    gedcomData.indviduals.forEach((person, id) => {
      stats.totalPersons++;
      
      // Gender
      const sex = person.SEX?.value;
      if (sex === 'M') stats.males++;
      else if (sex === 'F') stats.females++;
      else stats.unknown++;
      
      // Living/deceased
      if (person.DEAT) {
        stats.deceasedPersons++;
      } else {
        stats.livingPersons++;
      }
      
      // Parse dates for lifespan calculation
      if (person.BIRT?.DATE?.value && person.DEAT?.DATE?.value) {
        const birthYear = extractYear(person.BIRT.DATE.value);
        const deathYear = extractYear(person.DEAT.DATE.value);
        if (birthYear && deathYear) {
          const lifespan = deathYear - birthYear;
          if (lifespan > 0 && lifespan < 120) {
            lifespans.push(lifespan);
            if (!stats.oldestPerson || lifespan > stats.oldestPerson.age) {
              const fullName = extractLabel(person);
              const nickname = person._NICK?.value || '';
              stats.oldestPerson = { 
                name: fullName, 
                displayName: formatDisplayName(fullName, nickname),
                age: lifespan,
                id: id
              };
            }
          }
        }
      }
      
      // Track births by decade
      if (person.BIRT?.DATE?.value) {
        const year = extractYear(person.BIRT.DATE.value);
        if (year) {
          const decade = Math.floor(year / 10) * 10;
          stats.birthsByDecade[decade] = (stats.birthsByDecade[decade] || 0) + 1;
          
          if (!stats.youngestBirth || year > stats.youngestBirth.year) {
            const fullName = extractLabel(person);
            const nickname = person._NICK?.value || '';
            stats.youngestBirth = {
              name: fullName,
              displayName: formatDisplayName(fullName, nickname),
              year: year,
              id: id
            };
          }
        }
      }
      
      // Track places
      const birthPlace = person.BIRT?.PLAC?.value;
      if (birthPlace) {
        stats.places[birthPlace] = (stats.places[birthPlace] || 0) + 1;
      }
      
      // Track names
      if (person.NAME?.value) {
        const nameParts = person.NAME.value.split('/');
        if (nameParts[0]) {
          const firstName = nameParts[0].trim().split(' ')[0];
          if (firstName) {
            stats.commonFirstNames[firstName] = (stats.commonFirstNames[firstName] || 0) + 1;
          }
        }
        if (nameParts[1]) {
          const surname = nameParts[1].trim();
          if (surname) {
            stats.commonSurnames[surname] = (stats.commonSurnames[surname] || 0) + 1;
          }
        }
      }
    });
  }
  
  // Process families
  if (gedcomData.families) {
    gedcomData.families.forEach((family, id) => {
      stats.totalFamilies++;
      
      // Count children
      if (family.CHIL) {
        const childCount = Array.isArray(family.CHIL) ? family.CHIL.length : 1;
        if (childCount > stats.mostChildren.count) {
          const husbName = family.HUSB ? extractDisplayNameById(family.HUSB.id, gedcomData) : 'Unknown';
          const wifeName = family.WIFE ? extractDisplayNameById(family.WIFE.id, gedcomData) : 'Unknown';
          stats.mostChildren = {
            family: `${husbName} & ${wifeName}`,
            count: childCount,
            id: id
          };
        }
      }
    });
  }
  
  // Calculate average lifespan
  if (lifespans.length > 0) {
    stats.avgLifespan = Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length);
  }
  
  // Sort and limit name frequencies
  stats.topSurnames = Object.entries(stats.commonSurnames)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  stats.topFirstNames = Object.entries(stats.commonFirstNames)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  stats.topPlaces = Object.entries(stats.places)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return stats;
}

// Helper to extract year from GEDCOM date
function extractYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1]) : null;
}

// Helper to get label by ID
function extractLabelById(id, gedcomData) {
  if (!id || !gedcomData?.indviduals) return 'Unknown';
  const person = gedcomData.indviduals.get(id);
  return person ? extractLabel(person) : 'Unknown';
}

// Extract display name (with nickname) by ID
function extractDisplayNameById(id, gedcomData) {
  if (!id || !gedcomData?.indviduals) return 'Unknown';
  const person = gedcomData.indviduals.get(id);
  if (!person) return 'Unknown';
  const fullName = extractLabel(person);
  const nickname = person._NICK?.value || '';
  return formatDisplayName(fullName, nickname);
}

/**
 * Find potential duplicate persons
 * Uses name similarity and date matching
 * @returns {Array} Array of duplicate candidate pairs
 */
function findDuplicates() {
  const gedcomData = document.dataParsed;
  if (!gedcomData || !gedcomData.indviduals) return [];
  
  const duplicates = [];
  const persons = Array.from(gedcomData.indviduals.entries());
  
  // Compare each pair
  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const [id1, person1] = persons[i];
      const [id2, person2] = persons[j];
      
      const similarity = calculateSimilarity(person1, person2);
      
      if (similarity >= 0.7) {
        const name1 = extractLabel(person1);
        const nick1 = person1._NICK?.value || '';
        const name2 = extractLabel(person2);
        const nick2 = person2._NICK?.value || '';
        
        duplicates.push({
          person1: {
            id: id1,
            name: name1,
            displayName: formatDisplayName(name1, nick1),
            birth: person1.BIRT?.DATE?.value || '',
            death: person1.DEAT?.DATE?.value || ''
          },
          person2: {
            id: id2,
            name: name2,
            displayName: formatDisplayName(name2, nick2),
            birth: person2.BIRT?.DATE?.value || '',
            death: person2.DEAT?.DATE?.value || ''
          },
          similarity: Math.round(similarity * 100)
        });
      }
    }
  }
  
  // Sort by similarity (highest first)
  duplicates.sort((a, b) => b.similarity - a.similarity);
  
  return duplicates;
}

/**
 * Calculate similarity between two persons
 * @param {Object} p1 - First person
 * @param {Object} p2 - Second person
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(p1, p2) {
  let score = 0;
  let factors = 0;
  
  // Name similarity (most important)
  const name1 = (p1.NAME?.value || '').toLowerCase().replace(/\//g, ' ').trim();
  const name2 = (p2.NAME?.value || '').toLowerCase().replace(/\//g, ' ').trim();
  
  if (name1 && name2) {
    const nameSim = levenshteinSimilarity(name1, name2);
    score += nameSim * 3; // Weight name heavily
    factors += 3;
  }
  
  // Birth date
  const birth1 = extractYear(p1.BIRT?.DATE?.value);
  const birth2 = extractYear(p2.BIRT?.DATE?.value);
  
  if (birth1 && birth2) {
    if (birth1 === birth2) {
      score += 1;
    } else if (Math.abs(birth1 - birth2) <= 2) {
      score += 0.5;
    }
    factors += 1;
  }
  
  // Death date
  const death1 = extractYear(p1.DEAT?.DATE?.value);
  const death2 = extractYear(p2.DEAT?.DATE?.value);
  
  if (death1 && death2) {
    if (death1 === death2) {
      score += 1;
    } else if (Math.abs(death1 - death2) <= 2) {
      score += 0.5;
    }
    factors += 1;
  }
  
  // Gender match
  const sex1 = p1.SEX?.value;
  const sex2 = p2.SEX?.value;
  
  if (sex1 && sex2) {
    if (sex1 === sex2) {
      score += 0.5;
    } else {
      score -= 1; // Penalty for gender mismatch
    }
    factors += 0.5;
  }
  
  return factors > 0 ? score / factors : 0;
}

/**
 * Calculate Levenshtein distance similarity
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Similarity (0-1)
 */
/**
 * Calculate relationship between two people
 * @param {string} id1 - First person's ID
 * @param {string} id2 - Second person's ID
 * @returns {Object} Relationship info
 */
function calculateRelationship(id1, id2) {
  const gedcomData = document.dataParsed;
  if (!gedcomData || !gedcomData.indviduals) {
    return { relationship: 'Unknown', path: [] };
  }
  
  if (id1 === id2) {
    return { relationship: 'Same person', path: [] };
  }
  
  // BFS to find relationship path
  const visited = new Set();
  const queue = [{
    id: id1,
    path: [{ id: id1, relation: 'self' }],
    generations: 0
  }];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (current.id === id2) {
      // Get gender of person 2 for gender-specific relationship terms
      const person2 = gedcomData.indviduals.get(id2);
      const gender2 = person2?.SEX?.value || 'U';
      return {
        relationship: describeRelationship(current.path, gender2),
        path: current.path,
        generations: current.generations
      };
    }
    
    if (visited.has(current.id)) continue;
    if (current.path.length > 15) continue; // Limit search depth
    visited.add(current.id);
    
    const person = gedcomData.indviduals.get(current.id);
    if (!person) continue;
    
    // Add parents
    if (person.FAMC) {
      const famcList = Array.isArray(person.FAMC) ? person.FAMC : [person.FAMC];
      famcList.forEach(famc => {
        const family = gedcomData.families.get(famc.id);
        if (family) {
          if (family.HUSB) {
            const husb = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
            husb.forEach(h => {
              if (!visited.has(h.id)) {
                queue.push({
                  id: h.id,
                  path: [...current.path, { id: h.id, relation: 'father' }],
                  generations: current.generations + 1
                });
              }
            });
          }
          if (family.WIFE) {
            const wife = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
            wife.forEach(w => {
              if (!visited.has(w.id)) {
                queue.push({
                  id: w.id,
                  path: [...current.path, { id: w.id, relation: 'mother' }],
                  generations: current.generations + 1
                });
              }
            });
          }
          // Siblings
          if (family.CHIL) {
            const children = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
            children.forEach(c => {
              if (c.id !== current.id && !visited.has(c.id)) {
                queue.push({
                  id: c.id,
                  path: [...current.path, { id: c.id, relation: 'sibling' }],
                  generations: current.generations
                });
              }
            });
          }
        }
      });
    }
    
    // Add children
    if (person.FAMS) {
      const famsList = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
      famsList.forEach(fams => {
        const family = gedcomData.families.get(fams.id);
        if (family) {
          // Spouse
          const spouseRefs = person.SEX?.value === 'M' ? family.WIFE : family.HUSB;
          if (spouseRefs) {
            const spouses = Array.isArray(spouseRefs) ? spouseRefs : [spouseRefs];
            spouses.forEach(s => {
              if (!visited.has(s.id)) {
                queue.push({
                  id: s.id,
                  path: [...current.path, { id: s.id, relation: 'spouse' }],
                  generations: current.generations
                });
              }
            });
          }
          // Children
          if (family.CHIL) {
            const children = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
            children.forEach(c => {
              if (!visited.has(c.id)) {
                queue.push({
                  id: c.id,
                  path: [...current.path, { id: c.id, relation: 'child' }],
                  generations: current.generations - 1
                });
              }
            });
          }
        }
      });
    }
  }
  
  return { relationship: 'Not directly related', path: [] };
}

/**
 * Describe relationship from path
 */
function describeRelationship(path, targetGender = 'U') {
  if (path.length <= 1) return 'Self';
  
  const relations = path.slice(1).map(p => p.relation);
  const isMale = targetGender === 'M';
  const isFemale = targetGender === 'F';
  
  // Simple direct relationships
  if (relations.length === 1) {
    const r = relations[0];
    if (r === 'father') return 'Father';
    if (r === 'mother') return 'Mother';
    if (r === 'child') return isMale ? 'Son' : isFemale ? 'Daughter' : 'Child';
    if (r === 'sibling') return isMale ? 'Brother' : isFemale ? 'Sister' : 'Sibling';
    if (r === 'spouse') return isMale ? 'Husband' : isFemale ? 'Wife' : 'Spouse';
  }
  
  if (relations.length === 2) {
    const [r1, r2] = relations;
    
    // Grandparent
    if ((r1 === 'father' || r1 === 'mother') && (r2 === 'father' || r2 === 'mother')) {
      return isMale ? 'Grandfather' : isFemale ? 'Grandmother' : 'Grandparent';
    }
    // Grandchild
    if (r1 === 'child' && r2 === 'child') {
      return isMale ? 'Grandson' : isFemale ? 'Granddaughter' : 'Grandchild';
    }
    // Aunt/Uncle
    if ((r1 === 'father' || r1 === 'mother') && r2 === 'sibling') {
      return isMale ? 'Uncle' : isFemale ? 'Aunt' : 'Aunt/Uncle';
    }
    // Niece/Nephew
    if (r1 === 'sibling' && r2 === 'child') {
      return isMale ? 'Nephew' : isFemale ? 'Niece' : 'Niece/Nephew';
    }
    // Parent-in-law
    if (r1 === 'spouse' && (r2 === 'father' || r2 === 'mother')) {
      return isMale ? 'Father-in-law' : isFemale ? 'Mother-in-law' : 'Parent-in-law';
    }
    // Child-in-law (spouse of child)
    if (r1 === 'child' && r2 === 'spouse') {
      return isMale ? 'Son-in-law' : isFemale ? 'Daughter-in-law' : 'Child-in-law';
    }
    // Sibling-in-law (spouse's sibling)
    if (r1 === 'spouse' && r2 === 'sibling') {
      return isMale ? 'Brother-in-law' : isFemale ? 'Sister-in-law' : 'Sibling-in-law';
    }
    // Sibling-in-law (sibling's spouse)
    if (r1 === 'sibling' && r2 === 'spouse') {
      return isMale ? 'Brother-in-law' : isFemale ? 'Sister-in-law' : 'Sibling-in-law';
    }
  }
  
  if (relations.length === 3) {
    const [r1, r2, r3] = relations;
    
    // Cousin
    if ((r1 === 'father' || r1 === 'mother') && r2 === 'sibling' && r3 === 'child') {
      return 'First Cousin';
    }
    // Great-grandparent
    if (relations.every(r => r === 'father' || r === 'mother')) {
      return isMale ? 'Great-grandfather' : isFemale ? 'Great-grandmother' : 'Great-grandparent';
    }
    // Great-grandchild
    if (relations.every(r => r === 'child')) {
      return isMale ? 'Great-grandson' : isFemale ? 'Great-granddaughter' : 'Great-grandchild';
    }
    // Great Aunt/Uncle
    if ((r1 === 'father' || r1 === 'mother') && (r2 === 'father' || r2 === 'mother') && r3 === 'sibling') {
      return isMale ? 'Great-uncle' : isFemale ? 'Great-aunt' : 'Great-aunt/uncle';
    }
    // Grand Niece/Nephew
    if (r1 === 'sibling' && r2 === 'child' && r3 === 'child') {
      return isMale ? 'Grand-nephew' : isFemale ? 'Grand-niece' : 'Grand-niece/nephew';
    }
    // Cousin's spouse
    if ((r1 === 'father' || r1 === 'mother') && r2 === 'sibling' && r3 === 'spouse') {
      return 'Cousin-in-law';
    }
  }
  
  // Count generations up and down
  let up = 0, down = 0, sideways = 0;
  relations.forEach(r => {
    if (r === 'father' || r === 'mother') up++;
    else if (r === 'child') down++;
    else if (r === 'sibling') sideways++;
  });
  
  if (up > 0 && down > 0 && sideways > 0) {
    const cousinNum = Math.min(up, down);
    const removed = Math.abs(up - down);
    if (removed === 0) {
      return `${getOrdinal(cousinNum)} Cousin`;
    }
    return `${getOrdinal(cousinNum)} Cousin ${removed}x removed`;
  }
  
  // Handle great-great etc.
  if (up >= 3 && down === 0 && sideways === 0) {
    const greats = up - 2;
    const prefix = greats > 0 ? 'Great-'.repeat(greats) : '';
    return isMale ? `${prefix}Grandfather` : isFemale ? `${prefix}Grandmother` : `${prefix}Grandparent`;
  }
  
  if (down >= 3 && up === 0 && sideways === 0) {
    const greats = down - 2;
    const prefix = greats > 0 ? 'Great-'.repeat(greats) : '';
    return isMale ? `${prefix}Grandson` : isFemale ? `${prefix}Granddaughter` : `${prefix}Grandchild`;
  }
  
  return `${path.length - 1} steps away`;
}

function getOrdinal(n) {
  const ordinals = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
  return ordinals[n] || `${n}th`;
}

function levenshteinSimilarity(s1, s2) {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  // Quick check for very different lengths
  if (Math.abs(len1 - len2) > Math.max(len1, len2) / 2) return 0;
  
  // Levenshtein distance
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return 1 - distance / maxLen;
}

export { 
  startDraw, 
  zoomIn, 
  zoomOut, 
  fitToScreen, 
  relayoutNodes,
  centerOnNode,
  setFocusPerson, 
  setMaxGenerations, 
  clearFilter,
  getAllIndividuals,
  setNodeClickCallback,
  isFilterActive,
  expandFromPerson,
  updateNodeData,
  updateAllNodesData,
  refreshStyles,
  searchPersons,
  centerOnSearchResult,
  clearSearch,
  downloadPng,
  downloadSvg,
  calculateStatistics,
  findDuplicates,
  toggleDragMode,
  isDragEnabled,
  lockNodes,
  unlockNodes,
  calculateRelationship,
  formatDisplayName,
  getShowNicknameSetting,
  setShowNicknameSetting
};
