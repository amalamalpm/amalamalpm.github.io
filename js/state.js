/**
 * State Management with Undo/Redo
 * Uses command pattern to track and reverse changes
 * Version: 2.0 - Fixed circular reference handling
 */
console.log('state.js v2.0 loaded - using deepClone');

// History stacks
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

// State change listeners
const listeners = [];

// Properties to skip when cloning (circular references)
const SKIP_PROPERTIES = ['parent', 'indviduals', 'families', 'order'];

/**
 * Deep clone an object, skipping circular reference properties
 * @param {Object} obj - Object to clone
 * @param {Set} seen - Set of seen objects (for circular detection)
 * @returns {Object} Cloned object
 */
function deepClone(obj, seen = new Set()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item, seen));
  }
  
  // Handle Map
  if (obj instanceof Map) {
    const clonedMap = new Map();
    obj.forEach((value, key) => {
      clonedMap.set(key, deepClone(value, seen));
    });
    return clonedMap;
  }
  
  // Prevent circular references
  if (seen.has(obj)) {
    return undefined;
  }
  seen.add(obj);
  
  // Handle regular objects
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && !SKIP_PROPERTIES.includes(key)) {
      cloned[key] = deepClone(obj[key], seen);
    }
  }
  
  // Preserve constructor name for FamilyRow
  if (obj.constructor && obj.constructor.name === 'FamilyRow') {
    cloned._type = 'FamilyRow';
    // Keep essential identifying properties
    if (obj.level !== undefined) cloned.level = obj.level;
    if (obj.id !== undefined) cloned.id = obj.id;
    if (obj.tag !== undefined) cloned.tag = obj.tag;
  }
  
  return cloned;
}

/**
 * Save state for undo
 * @param {string} description - Description of the action
 * @param {Function} undoFn - Function to undo the action
 * @param {Function} redoFn - Function to redo the action
 */
function pushState(description, undoFn, redoFn) {
  undoStack.push({
    description,
    undo: undoFn,
    redo: redoFn,
    timestamp: Date.now()
  });
  
  // Limit history size
  while (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  
  // Clear redo stack on new action
  redoStack.length = 0;
  
  notifyListeners();
}

/**
 * Save a snapshot of the entire GEDCOM data for undo
 * @param {string} description - Description of the action
 */
function saveSnapshot(description) {
  const gedcomData = document.dataParsed;
  if (!gedcomData) return;
  
  // Deep clone the current state using custom cloner
  const snapshot = {
    individuals: new Map(),
    families: new Map()
  };
  
  if (gedcomData.indviduals) {
    gedcomData.indviduals.forEach((value, key) => {
      snapshot.individuals.set(key, deepClone(value));
    });
  }
  
  if (gedcomData.families) {
    gedcomData.families.forEach((value, key) => {
      snapshot.families.set(key, deepClone(value));
    });
  }
  
  pushState(
    description,
    () => restoreSnapshot(snapshot),
    null // Redo will be set when undo is called
  );
}

/**
 * Restore a snapshot
 * @param {Object} snapshot - The snapshot to restore
 */
function restoreSnapshot(snapshot) {
  const gedcomData = document.dataParsed;
  if (!gedcomData) return;
  
  // Save current state for redo before restoring
  const currentSnapshot = {
    individuals: new Map(),
    families: new Map()
  };
  
  if (gedcomData.indviduals) {
    gedcomData.indviduals.forEach((value, key) => {
      currentSnapshot.individuals.set(key, deepClone(value));
    });
  }
  
  if (gedcomData.families) {
    gedcomData.families.forEach((value, key) => {
      currentSnapshot.families.set(key, deepClone(value));
    });
  }
  
  // Restore the snapshot
  gedcomData.indviduals.clear();
  gedcomData.families.clear();
  
  snapshot.individuals.forEach((value, key) => {
    gedcomData.indviduals.set(key, deepClone(value));
  });
  
  snapshot.families.forEach((value, key) => {
    gedcomData.families.set(key, deepClone(value));
  });
  
  return currentSnapshot;
}

/**
 * Undo the last action
 * @returns {boolean} Whether undo was successful
 */
function undo() {
  if (undoStack.length === 0) return false;
  
  const action = undoStack.pop();
  const redoSnapshot = action.undo();
  
  // Push to redo stack with the snapshot for redo
  redoStack.push({
    description: action.description,
    undo: () => restoreSnapshot(redoSnapshot),
    redo: action.redo,
    timestamp: action.timestamp
  });
  
  notifyListeners();
  return true;
}

/**
 * Redo the last undone action
 * @returns {boolean} Whether redo was successful
 */
function redo() {
  if (redoStack.length === 0) return false;
  
  const action = redoStack.pop();
  const undoSnapshot = action.undo();
  
  // Push back to undo stack
  undoStack.push({
    description: action.description,
    undo: () => restoreSnapshot(undoSnapshot),
    redo: action.redo,
    timestamp: Date.now()
  });
  
  notifyListeners();
  return true;
}

/**
 * Check if undo is available
 * @returns {boolean}
 */
function canUndo() {
  return undoStack.length > 0;
}

/**
 * Check if redo is available
 * @returns {boolean}
 */
function canRedo() {
  return redoStack.length > 0;
}

/**
 * Get undo stack info
 * @returns {Array}
 */
function getUndoStack() {
  return undoStack.map(a => ({
    description: a.description,
    timestamp: a.timestamp
  }));
}

/**
 * Get redo stack info
 * @returns {Array}
 */
function getRedoStack() {
  return redoStack.map(a => ({
    description: a.description,
    timestamp: a.timestamp
  }));
}

/**
 * Clear all history
 */
function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  notifyListeners();
}

/**
 * Add a listener for state changes
 * @param {Function} listener
 */
function addStateListener(listener) {
  listeners.push(listener);
}

/**
 * Remove a listener
 * @param {Function} listener
 */
function removeStateListener(listener) {
  const index = listeners.indexOf(listener);
  if (index > -1) {
    listeners.splice(index, 1);
  }
}

/**
 * Notify all listeners of state change
 */
function notifyListeners() {
  const state = {
    canUndo: canUndo(),
    canRedo: canRedo(),
    undoCount: undoStack.length,
    redoCount: redoStack.length
  };
  listeners.forEach(listener => listener(state));
}

export {
  saveSnapshot,
  pushState,
  undo,
  redo,
  canUndo,
  canRedo,
  getUndoStack,
  getRedoStack,
  clearHistory,
  addStateListener,
  removeStateListener
};
