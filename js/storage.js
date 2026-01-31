/**
 * IndexedDB Storage Module
 * Provides persistent storage for GEDCOM data and app settings
 */

const DB_NAME = 'GedcomEditorDB';
const DB_VERSION = 1;
const STORE_TREES = 'trees';
const STORE_SETTINGS = 'settings';
const STORE_RECENT = 'recent';

let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Trees store
      if (!database.objectStoreNames.contains(STORE_TREES)) {
        const treeStore = database.createObjectStore(STORE_TREES, { keyPath: 'id' });
        treeStore.createIndex('name', 'name', { unique: false });
        treeStore.createIndex('modified', 'modified', { unique: false });
      }
      
      // Settings store
      if (!database.objectStoreNames.contains(STORE_SETTINGS)) {
        database.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      
      // Recent files store
      if (!database.objectStoreNames.contains(STORE_RECENT)) {
        const recentStore = database.createObjectStore(STORE_RECENT, { keyPath: 'id' });
        recentStore.createIndex('opened', 'opened', { unique: false });
      }
    };
  });
}

/**
 * Save a family tree
 * @param {string} id - Tree ID
 * @param {string} name - Tree name
 * @param {string} data - GEDCOM text data
 * @returns {Promise}
 */
async function saveTree(id, name, data) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TREES], 'readwrite');
    const store = transaction.objectStore(STORE_TREES);
    
    const tree = {
      id: id || `tree_${Date.now()}`,
      name: name || 'Untitled Tree',
      data: data,
      modified: new Date().toISOString(),
      created: new Date().toISOString()
    };
    
    const request = store.put(tree);
    request.onsuccess = () => resolve(tree.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load a family tree
 * @param {string} id - Tree ID
 * @returns {Promise<Object>}
 */
async function loadTree(id) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TREES], 'readonly');
    const store = transaction.objectStore(STORE_TREES);
    
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all saved trees
 * @returns {Promise<Array>}
 */
async function getAllTrees() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TREES], 'readonly');
    const store = transaction.objectStore(STORE_TREES);
    
    const request = store.getAll();
    request.onsuccess = () => {
      const trees = request.result.map(t => ({
        id: t.id,
        name: t.name,
        modified: t.modified,
        created: t.created
      }));
      // Sort by modified date (newest first)
      trees.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      resolve(trees);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a family tree
 * @param {string} id - Tree ID
 * @returns {Promise}
 */
async function deleteTree(id) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_TREES], 'readwrite');
    const store = transaction.objectStore(STORE_TREES);
    
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a setting
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise}
 */
async function saveSetting(key, value) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a setting
 * @param {string} key - Setting key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>}
 */
async function getSetting(key, defaultValue = null) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    
    const request = store.get(key);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : defaultValue);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add to recent files
 * @param {string} id - File/tree ID
 * @param {string} name - File name
 * @returns {Promise}
 */
async function addToRecent(id, name) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECENT], 'readwrite');
    const store = transaction.objectStore(STORE_RECENT);
    
    const recent = {
      id: id,
      name: name,
      opened: new Date().toISOString()
    };
    
    const request = store.put(recent);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get recent files
 * @param {number} limit - Max number of recent files
 * @returns {Promise<Array>}
 */
async function getRecentFiles(limit = 10) {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECENT], 'readonly');
    const store = transaction.objectStore(STORE_RECENT);
    const index = store.index('opened');
    
    const request = index.getAll(null, limit);
    request.onsuccess = () => {
      const files = request.result;
      files.sort((a, b) => new Date(b.opened) - new Date(a.opened));
      resolve(files.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear recent files
 * @returns {Promise}
 */
async function clearRecentFiles() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_RECENT], 'readwrite');
    const store = transaction.objectStore(STORE_RECENT);
    
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Migrate data from localStorage (one-time)
 * @returns {Promise}
 */
async function migrateFromLocalStorage() {
  const migrated = await getSetting('localStorageMigrated', false);
  if (migrated) return;
  
  const storedData = localStorage.getItem('DataTillNow');
  if (storedData) {
    await saveTree('default', 'My Family Tree', storedData);
  }
  
  await saveSetting('localStorageMigrated', true);
}

export {
  initDB,
  saveTree,
  loadTree,
  getAllTrees,
  deleteTree,
  saveSetting,
  getSetting,
  addToRecent,
  getRecentFiles,
  clearRecentFiles,
  migrateFromLocalStorage
};
