/**
 * Keyboard Shortcuts System
 * Handles global keyboard shortcuts for the GEDCOM editor
 */

// Shortcut registry
const shortcuts = new Map();
let shortcutsEnabled = true;

// Shortcut definitions with descriptions
const shortcutDefinitions = {
  'ctrl+z': { action: 'undo', description: 'Undo last action' },
  'ctrl+shift+z': { action: 'redo', description: 'Redo last action' },
  'ctrl+y': { action: 'redo', description: 'Redo last action' },
  'ctrl+s': { action: 'save', description: 'Export/Save file' },
  'ctrl+o': { action: 'open', description: 'Import file' },
  'ctrl+f': { action: 'search', description: 'Search persons' },
  'escape': { action: 'closeModal', description: 'Close modal/dialog' },
  'delete': { action: 'delete', description: 'Delete selected node' },
  '+': { action: 'zoomIn', description: 'Zoom in' },
  '=': { action: 'zoomIn', description: 'Zoom in' },
  '-': { action: 'zoomOut', description: 'Zoom out' },
  'f': { action: 'fit', description: 'Fit to screen' },
  'r': { action: 'refresh', description: 'Refresh diagram' },
  'a': { action: 'arrange', description: 'Arrange nodes' },
  'd': { action: 'darkMode', description: 'Toggle dark mode' },
  '?': { action: 'help', description: 'Show keyboard shortcuts' },
  'shift+?': { action: 'help', description: 'Show keyboard shortcuts' }
};

// Action handlers
const actionHandlers = {};

/**
 * Register an action handler
 * @param {string} action - Action name
 * @param {Function} handler - Handler function
 */
function registerAction(action, handler) {
  actionHandlers[action] = handler;
}

/**
 * Normalize key event to shortcut string
 * @param {KeyboardEvent} e - Keyboard event
 * @returns {string} Normalized shortcut string
 */
function normalizeKey(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  
  // Guard against undefined e.key (can happen with some browser events)
  if (!e.key) return parts.join('+');
  
  let key = e.key.toLowerCase();
  // Handle special keys
  if (key === ' ') key = 'space';
  if (key === 'escape') key = 'escape';
  if (key === 'delete' || key === 'backspace') key = 'delete';
  
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    parts.push(key);
  }
  
  return parts.join('+');
}

/**
 * Handle keyboard event
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyDown(e) {
  // Don't handle shortcuts when typing in input fields
  if (!shortcutsEnabled) return;
  
  const target = e.target;
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.tagName === 'SELECT' ||
                  target.isContentEditable;
  
  // Allow escape and some ctrl shortcuts even in inputs
  const shortcut = normalizeKey(e);
  const def = shortcutDefinitions[shortcut];
  
  if (!def) return;
  
  // Skip most shortcuts when in input, except escape and ctrl combos
  if (isInput && !shortcut.includes('ctrl') && shortcut !== 'escape') {
    return;
  }
  
  const handler = actionHandlers[def.action];
  if (handler) {
    e.preventDefault();
    handler(e);
  }
}

/**
 * Enable/disable shortcuts
 * @param {boolean} enabled - Whether shortcuts should be enabled
 */
function setShortcutsEnabled(enabled) {
  shortcutsEnabled = enabled;
}

/**
 * Get all shortcut definitions for help display
 * @returns {Array} Array of shortcut info objects
 */
function getShortcutsList() {
  const list = [];
  const seen = new Set();
  
  for (const [key, def] of Object.entries(shortcutDefinitions)) {
    if (seen.has(def.action)) continue;
    seen.add(def.action);
    
    list.push({
      key: key.replace('ctrl', '⌘/Ctrl').replace('shift', '⇧').replace('+', ' + '),
      action: def.action,
      description: def.description
    });
  }
  
  return list;
}

/**
 * Show keyboard shortcuts help modal
 */
function showShortcutsHelp() {
  // Check if modal already exists
  let modal = document.getElementById('shortcuts-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content shortcuts-modal">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="modal-close" onclick="closeShortcutsModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            ${getShortcutsList().map(s => `
              <div class="shortcut-item">
                <kbd>${s.key}</kbd>
                <span>${s.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.classList.add('active');
}

/**
 * Close shortcuts modal
 */
function closeShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Initialize keyboard shortcuts
 */
function initShortcuts() {
  document.addEventListener('keydown', handleKeyDown);
  
  // Register help action
  registerAction('help', showShortcutsHelp);
  registerAction('closeModal', () => {
    closeShortcutsModal();
    // Close any other modals
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  });
  
  // Expose close function globally
  window.closeShortcutsModal = closeShortcutsModal;
}

export {
  initShortcuts,
  registerAction,
  setShortcutsEnabled,
  getShortcutsList,
  showShortcutsHelp,
  closeShortcutsModal
};
