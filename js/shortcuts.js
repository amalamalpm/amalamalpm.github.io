/**
 * GEDCOM Family Tree Editor
 * Copyright (c) 2024-2026 amalamalpm
 * Licensed under MIT License - see LICENSE.txt
 * 
 * Keyboard Shortcuts & Help System
 * Handles global keyboard shortcuts and provides comprehensive help
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
  '?': { action: 'help', description: 'Show help' },
  'shift+?': { action: 'help', description: 'Show help' }
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
 * Generate comprehensive help content
 */
function generateHelpContent() {
  const shortcutsList = getShortcutsList();
  
  return `
    <div class="help-content">
      <!-- Getting Started -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">🚀</span>
          Getting Started
        </summary>
        <div class="help-section-content">
          <p class="help-intro">Welcome to the Family Tree Editor! Follow these simple steps to create your family tree:</p>
          <ol class="help-steps">
            <li>
              <strong>📥 Import or Create</strong>
              <p>Click <kbd>Import ▼</kbd> to load an existing GEDCOM, CSV, or JSON file. Or start fresh with the default person.</p>
            </li>
            <li>
              <strong>👤 Select a Person</strong>
              <p>Click on any person node in the diagram to view and edit their details in the sidebar.</p>
            </li>
            <li>
              <strong>➕ Add Family Members</strong>
              <p>With a person selected, go to the <em>Family</em> tab and click buttons to add Spouse, Child, Parents, or Siblings.</p>
            </li>
            <li>
              <strong>✏️ Edit Details</strong>
              <p>Fill in personal information across the tabs: General (name, birth, death), Contact, Social, and More.</p>
            </li>
            <li>
              <strong>💾 Save Your Work</strong>
              <p>Click <kbd>Export / Share ▼</kbd> → <em>GEDCOM File</em> to save your tree in the universal genealogy format.</p>
            </li>
          </ol>
        </div>
      </details>

      <!-- File Operations -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">📁</span>
          File Operations
        </summary>
        <div class="help-section-content">
          <h4>📥 Importing Data</h4>
          <ul class="help-list">
            <li>
              <strong>GEDCOM (★ Recommended)</strong> — The universal genealogy format. Supported by all major family tree software.
              <ol class="help-substeps">
                <li>Click <kbd>Import ▼</kbd></li>
                <li>Select "GEDCOM (★ Recommended)"</li>
                <li>Choose your .ged or .gedcom file</li>
                <li>Select storage preference (Auto-save, Session only, or Export only)</li>
              </ol>
            </li>
            <li>
              <strong>CSV Spreadsheet</strong> — Import from Excel or Google Sheets.
              <ol class="help-substeps">
                <li>Prepare CSV with columns: Name, Gender, BirthDate, DeathDate, FatherName, MotherName, SpouseName</li>
                <li>Click <kbd>Import ▼</kbd> → "CSV Spreadsheet"</li>
                <li>Select your .csv file</li>
              </ol>
            </li>
            <li>
              <strong>JSON</strong> — Import structured JSON data (for developers).
            </li>
          </ul>
          
          <h4>📤 Exporting Data</h4>
          <ul class="help-list">
            <li><strong>GEDCOM File</strong> — Standard format, works with Ancestry, FamilySearch, MyHeritage, etc.</li>
            <li><strong>JSON File</strong> — Full data export for developers or backup.</li>
            <li><strong>PNG Image</strong> — High-resolution image of your tree diagram.</li>
            <li><strong>SVG Image</strong> — Scalable vector image for printing.</li>
            <li><strong>Print</strong> — Print the current view directly.</li>
            <li><strong>Share Link</strong> — Generate a shareable link with your tree data encoded.</li>
          </ul>

          <h4>💾 Storage Options</h4>
          <ul class="help-list">
            <li><strong>💾 Auto-save</strong> — Data persists in browser, survives closing. Most convenient.</li>
            <li><strong>🔒 Session only</strong> — Data cleared when browser closes. Better for shared computers.</li>
            <li><strong>📤 Export only</strong> — No automatic saving. Must export manually. Most secure.</li>
          </ul>
          <p class="help-tip">💡 <strong>Tip:</strong> Change storage settings anytime from "More Tools" → "Storage Settings".</p>
        </div>
      </details>

      <!-- Navigation & View -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">🔍</span>
          Navigation & View
        </summary>
        <div class="help-section-content">
          <h4>🖱️ Mouse Controls</h4>
          <ul class="help-list">
            <li><strong>Click node</strong> — Select person and show details</li>
            <li><strong>Click + drag background</strong> — Pan the diagram</li>
            <li><strong>Scroll wheel</strong> — Zoom in/out</li>
            <li><strong>Click + drag node</strong> — Move individual nodes (when drag mode is ON)</li>
          </ul>

          <h4>🔘 Toolbar Controls (Top-Left)</h4>
          <ul class="help-list">
            <li><strong>➕ / ➖</strong> — Zoom in/out</li>
            <li><strong>⬜</strong> — Fit entire tree to screen</li>
            <li><strong>🔄</strong> — Reset view and filters</li>
            <li><strong>↔️</strong> — Arrange nodes (fix overlapping)</li>
            <li><strong>✋</strong> — Toggle drag mode (move nodes by hand)</li>
            <li><strong>📊</strong> — Show statistics dashboard</li>
            <li><strong>📅</strong> — Show timeline view</li>
            <li><strong>🔗</strong> — Calculate relationship between two people</li>
          </ul>

          <h4>🔎 Search</h4>
          <ol class="help-substeps">
            <li>Type in the search box or press <kbd>Ctrl+F</kbd></li>
            <li>Enter name, date, or place</li>
            <li>Matching nodes are highlighted in amber</li>
            <li>Click a result to center on that person</li>
            <li>Click ✕ to clear search</li>
          </ol>

          <h4>🎯 Filter by Generations</h4>
          <ol class="help-substeps">
            <li>In "Filter & Navigate", select a person from the dropdown</li>
            <li>Set number of generations to show (1-10)</li>
            <li>Click ✓ to apply filter</li>
            <li>Nodes with hidden relatives show a dashed orange border</li>
            <li>Click a hidden-connection node to expand and reveal more relatives</li>
            <li>Click 🔄 to reset and show all</li>
          </ol>
        </div>
      </details>

      <!-- Editing Person Details -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">✏️</span>
          Editing Person Details
        </summary>
        <div class="help-section-content">
          <p>Click any person node to select them. Their details appear in the sidebar with these tabs:</p>

          <h4>👤 General Tab</h4>
          <ul class="help-list">
            <li><strong>Full Name</strong> — Enter "First Last" format</li>
            <li><strong>Nickname</strong> — Optional informal name</li>
            <li><strong>Gender</strong> — Male 👨, Female 👩, or Other 🧑</li>
            <li><strong>Date of Birth</strong> — Use date picker or type DD/MM/YYYY</li>
            <li><strong>Place of Birth</strong> — City, Country format recommended</li>
            <li><strong>Currently Living</strong> — Uncheck to show death fields</li>
            <li><strong>Death Date/Place</strong> — Only visible if "Currently Living" is unchecked</li>
          </ul>

          <h4>📞 Contact Tab</h4>
          <ul class="help-list">
            <li><strong>Mobile</strong> — Phone number with country code</li>
            <li><strong>Home Phone</strong> — Landline number</li>
            <li><strong>Email</strong> — Primary email address</li>
            <li><strong>WhatsApp</strong> — WhatsApp number</li>
            <li><strong>Address</strong> — Full postal address</li>
          </ul>

          <h4>🌐 Social Tab</h4>
          <p>Enter social media profile URLs:</p>
          <ul class="help-list">
            <li>Facebook, Instagram, LinkedIn, Twitter/X, Website, YouTube</li>
          </ul>

          <h4>👨‍👩‍👧‍👦 Family Tab</h4>
          <ul class="help-list">
            <li><strong>Add Spouse</strong> — Creates a new person linked as spouse</li>
            <li><strong>Add Child</strong> — Creates a child (requires spouse family)</li>
            <li><strong>Add Parents</strong> — Creates father and mother</li>
            <li><strong>Add Sibling</strong> — Creates a sibling (requires parents)</li>
          </ul>
          <p>Expand "Current Family Members" to see and navigate to existing relatives.</p>

          <h4>📋 More Tab</h4>
          <ul class="help-list">
            <li><strong>Occupation</strong> — Job title or profession</li>
            <li><strong>Company</strong> — Employer name</li>
            <li><strong>Education</strong> — Schools, degrees</li>
            <li><strong>Religion</strong> — Religious affiliation</li>
            <li><strong>Blood Group</strong> — Select from dropdown</li>
            <li><strong>Notes</strong> — Any additional information</li>
            <li><strong>Custom Fields</strong> — Add your own fields</li>
          </ul>

          <h4>📷 Adding a Photo</h4>
          <ol class="help-substeps">
            <li>Click the camera icon 📷 on the person's avatar</li>
            <li>Select an image file (JPEG, PNG, GIF, WebP)</li>
            <li>Crop the image by dragging the selection box</li>
            <li>Click "Apply & Save"</li>
            <li>Photo appears in the diagram node and details panel</li>
          </ol>
          <p class="help-tip">💡 <strong>Tip:</strong> Images are automatically compressed to save space.</p>
        </div>
      </details>

      <!-- Tools & Features -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">🛠️</span>
          Tools & Features
        </summary>
        <div class="help-section-content">
          <h4>📊 Statistics Dashboard</h4>
          <p>Click the 📊 button to see:</p>
          <ul class="help-list">
            <li>Total persons, males, females</li>
            <li>Living vs deceased count</li>
            <li>Average lifespan</li>
            <li>Oldest person, most children</li>
            <li>Common surnames and first names</li>
            <li>Birth trends by decade</li>
          </ul>

          <h4>📅 Timeline View</h4>
          <p>Click the 📅 button to see events chronologically:</p>
          <ul class="help-list">
            <li>Births, deaths, marriages displayed on timeline</li>
            <li>Scroll through family history</li>
            <li>Click an event to select that person</li>
          </ul>

          <h4>🔗 Relationship Calculator</h4>
          <ol class="help-substeps">
            <li>Click the 🔗 button</li>
            <li>Select Person 1 from dropdown</li>
            <li>Select Person 2 from dropdown</li>
            <li>Click "Calculate"</li>
            <li>See relationship (e.g., "First Cousin", "Grandparent")</li>
          </ol>

          <h4>🔍 Find Duplicates</h4>
          <p>From "More Tools":</p>
          <ol class="help-substeps">
            <li>Click "Find Duplicates"</li>
            <li>Review potential duplicate persons</li>
            <li>Similarity score shows match confidence</li>
            <li>Manually merge if needed</li>
          </ol>

          <h4>🌙 Dark Mode</h4>
          <p>Click the 🌙 button in the header or press <kbd>D</kbd> to toggle dark/light theme.</p>
        </div>
      </details>

      <!-- Keyboard Shortcuts -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">⌨️</span>
          Keyboard Shortcuts
        </summary>
        <div class="help-section-content">
          <div class="shortcuts-list">
            ${shortcutsList.map(s => `
              <div class="shortcut-item">
                <kbd>${s.key}</kbd>
                <span>${s.description}</span>
              </div>
            `).join('')}
          </div>
          <p class="help-tip">💡 <strong>Tip:</strong> Shortcuts work when focus is not in an input field. Press <kbd>Escape</kbd> to close any dialog.</p>
        </div>
      </details>

      <!-- Tips & Tricks -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">💡</span>
          Tips & Tricks
        </summary>
        <div class="help-section-content">
          <ul class="help-list tips-list">
            <li><strong>🔒 Privacy First</strong> — All data stays in your browser. Nothing is sent to any server.</li>
            <li><strong>📱 Works Offline</strong> — Once loaded, the app works without internet.</li>
            <li><strong>🔄 Auto-save</strong> — Data saves automatically every 5 seconds (if enabled).</li>
            <li><strong>↩️ Undo Mistakes</strong> — Press <kbd>Ctrl+Z</kbd> to undo any change.</li>
            <li><strong>🎯 Quick Navigation</strong> — Click a person in the diagram, then click their relatives in the Family tab to navigate quickly.</li>
            <li><strong>📸 Small Photos</strong> — Photos are automatically cropped and compressed to 200×200px JPEG.</li>
            <li><strong>🔍 Filter Large Trees</strong> — Use generation filter to focus on one branch at a time.</li>
            <li><strong>📤 Regular Backups</strong> — Export to GEDCOM regularly. Browser data can be cleared!</li>
            <li><strong>🌐 Share Safely</strong> — Use "Share Link" only for non-sensitive trees. Data is encoded in URL.</li>
            <li><strong>⚡ Arrange Overlaps</strong> — If nodes overlap after expanding, click the ↔️ arrange button.</li>
          </ul>
        </div>
      </details>

      <!-- About -->
      <details class="help-section">
        <summary class="help-section-title">
          <span class="help-icon">ℹ️</span>
          About
        </summary>
        <div class="help-section-content">
          <p><strong>GEDCOM Family Tree Editor</strong></p>
          <p>Version 1.0.0</p>
          <p>A privacy-focused, offline-first family tree editor that works entirely in your browser.</p>
          <ul class="help-list">
            <li>Built with Cytoscape.js for graph visualization</li>
            <li>Supports GEDCOM 5.5.1 format</li>
            <li>Progressive Web App (installable)</li>
            <li>Open source — MIT License</li>
          </ul>
          <p class="help-tip">💡 <strong>Feedback?</strong> Report issues or suggest features on GitHub.</p>
        </div>
      </details>
    </div>
  `;
}

/**
 * Show comprehensive help modal
 */
function showHelpModal() {
  // Check if modal already exists
  let modal = document.getElementById('help-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content help-modal">
        <div class="modal-header">
          <h2>📖 Help & Documentation</h2>
          <button class="modal-close" onclick="closeHelpModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${generateHelpContent()}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.classList.add('active');
}

/**
 * Close help modal
 */
function closeHelpModal() {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Keep old function for backwards compatibility
function showShortcutsHelp() {
  showHelpModal();
}

function closeShortcutsModal() {
  closeHelpModal();
}

/**
 * Initialize keyboard shortcuts
 */
function initShortcuts() {
  document.addEventListener('keydown', handleKeyDown);
  
  // Register help action
  registerAction('help', showHelpModal);
  registerAction('closeModal', () => {
    closeHelpModal();
    // Close any other modals
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  });
  
  // Expose close function globally
  window.closeHelpModal = closeHelpModal;
  window.closeShortcutsModal = closeShortcutsModal;
}

export {
  initShortcuts,
  registerAction,
  setShortcutsEnabled,
  getShortcutsList,
  showShortcutsHelp,
  showHelpModal,
  closeShortcutsModal,
  closeHelpModal
};
