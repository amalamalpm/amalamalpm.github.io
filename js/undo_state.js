/**
 * GEDCOM Family Tree Editor
 * Copyright (c) 2024-2026 amalamalpm
 * Licensed under MIT License - see LICENSE.txt
 * 
 * State Management with Undo/Redo (v3.0)
 * Uses GEDCOM text serialization for reliable state restoration
 */

// History stacks - stores GEDCOM text
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 30;

// State change listeners
const listeners = [];

// Functions to get/set GEDCOM text (set by index.html)
let getGedcomTextFn = null;
let importGedcomTextFn = null;

/**
 * Initialize state management with GEDCOM functions
 * @param {Function} getTextFn - Function that returns current GEDCOM text
 * @param {Function} importTextFn - Function that imports GEDCOM text
 */
function initStateManager(getTextFn, importTextFn) {
  getGedcomTextFn = getTextFn;
  importGedcomTextFn = importTextFn;
}

/**
 * Save a snapshot of the current GEDCOM data for undo
 * @param {string} description - Description of the action
 */
function saveSnapshot(description) {
  if (!getGedcomTextFn) {
    console.warn('State manager not initialized - call initStateManager first');
    return;
  }
  
  try {
    const gedcomText = getGedcomTextFn();
    if (!gedcomText || gedcomText.length < 10) {
      console.warn('No valid GEDCOM data to save');
      return;
    }
    
    // Don't save duplicate states
    if (undoStack.length > 0 && undoStack[undoStack.length - 1].text === gedcomText) {
      return;
    }
    
    undoStack.push({
      description,
      text: gedcomText,
      timestamp: Date.now()
    });
    
    // Limit history size
    while (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    
    // Clear redo stack on new action
    redoStack.length = 0;
    
    notifyListeners();
  } catch (e) {
    console.error('Failed to save snapshot:', e);
  }
}

/**
 * Undo the last action
 * @returns {boolean} Whether undo was successful
 */
function undo() {
  if (undoStack.length === 0 || !importGedcomTextFn || !getGedcomTextFn) {
    return false;
  }
  
  try {
    // Save current state for redo
    const currentText = getGedcomTextFn();
    const action = undoStack.pop();
    
    // Push current state to redo stack
    redoStack.push({
      description: action.description,
      text: currentText,
      timestamp: Date.now()
    });
    
    // Restore the previous state
    importGedcomTextFn(action.text);
    
    notifyListeners();
    return true;
  } catch (e) {
    console.error('Failed to undo:', e);
    return false;
  }
}

/**
 * Redo the last undone action
 * @returns {boolean} Whether redo was successful
 */
function redo() {
  if (redoStack.length === 0 || !importGedcomTextFn || !getGedcomTextFn) {
    return false;
  }
  
  try {
    // Save current state for undo
    const currentText = getGedcomTextFn();
    const action = redoStack.pop();
    
    // Push current state back to undo stack
    undoStack.push({
      description: action.description,
      text: currentText,
      timestamp: Date.now()
    });
    
    // Restore the redo state
    importGedcomTextFn(action.text);
    
    notifyListeners();
    return true;
  } catch (e) {
    console.error('Failed to redo:', e);
    return false;
  }
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
  initStateManager,
  saveSnapshot,
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
