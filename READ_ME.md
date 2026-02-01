# GEDCOM Family Tree Editor

A browser-based family tree viewer and editor that works entirely offline. No data is sent to any server - everything runs locally in your browser.

---

## ✨ Features

### 📊 Visualization
- Interactive family tree diagram using Cytoscape.js
- Gender-based color coding (blue/pink/gray)
- Photo support within person nodes
- Hierarchical layout with edge labels (H/W/C)
- Timeline view, statistics dashboard, relationship calculator

### 🔍 Navigation & Filtering
- Focus on person with generation filtering
- Hidden connection indicators (dashed orange border)
- Click to expand hidden connections
- Zoom, arrange, search, and drag controls

### ✏️ Editing
- Add relatives (child, spouse, parent, sibling)
- Edit name, dates, photos, and 18+ GEDCOM event types
- Undo/Redo support
- Notes and source citations

### 💾 Data Management
- **Import:** GEDCOM, CSV, JSON
- **Export:** GEDCOM, JSON, PNG, SVG
- **Storage modes:**
  - 💾 Auto-save (convenient)
  - 🔒 Session only (more secure)
  - 📤 Export only (most secure)
- Duplicate detection
- Offline-first, privacy-focused

### 🎨 User Interface
- Modern responsive design (desktop & mobile)
- Dark mode
- Comprehensive help system (press `?`)
- PWA support (installable)

---

## 🚀 Getting Started

### Quick Start (5 Steps)

1. **📥 Import or Create**  
   Click `Import ▼` to load an existing GEDCOM, CSV, or JSON file. Or start fresh with the default person.

2. **👤 Select a Person**  
   Click on any person node in the diagram to view and edit their details in the sidebar.

3. **➕ Add Family Members**  
   With a person selected, go to the *Family* tab and click buttons to add Spouse, Child, Parents, or Siblings.

4. **✏️ Edit Details**  
   Fill in personal information across the tabs: General (name, birth, death), Contact, Social, and More.

5. **💾 Save Your Work**  
   Click `Export / Share ▼` → *GEDCOM File* to save your tree in the universal genealogy format.

### Running Locally

```bash
cd /path/to/ged
python3 -m http.server 8080
```

Open: `http://localhost:8080`

---

## 📁 File Operations

### Importing Data

| Format | Description |
|--------|-------------|
| **GEDCOM** ★ | Universal genealogy format. Works with Ancestry, FamilySearch, MyHeritage, etc. |
| **CSV** | Import from Excel/Google Sheets. Columns: Name, Gender, BirthDate, DeathDate, FatherName, MotherName, SpouseName |
| **JSON** | Structured JSON data for developers |

**Steps:**
1. Click `Import ▼`
2. Select format (GEDCOM recommended)
3. Choose your file
4. Select storage preference

### Exporting Data

| Format | Description |
|--------|-------------|
| **GEDCOM** | Standard format for all genealogy software |
| **JSON** | Full data export for backup or development |
| **PNG** | High-resolution image of diagram |
| **SVG** | Scalable vector for printing |
| **Print** | Direct browser print |
| **Share Link** | URL-encoded shareable link |

### Storage Options

| Option | Description |
|--------|-------------|
| 💾 **Auto-save** | Data persists in browser. Most convenient. |
| 🔒 **Session only** | Cleared when browser closes. Better for shared computers. |
| 📤 **Export only** | No auto-save. Must export manually. Most secure. |

> 💡 Change storage settings anytime from "More Tools" → "Storage Settings"

---

## 🔍 Navigation & View

### Mouse Controls

| Action | Result |
|--------|--------|
| Click node | Select person, show details |
| Drag background | Pan the diagram |
| Scroll wheel | Zoom in/out |
| Drag node | Move node (when drag mode ON) |

### Toolbar Controls (Top-Left)

| Icon | Action |
|------|--------|
| ➕ / ➖ | Zoom in/out |
| ⬜ | Fit tree to screen |
| 🔄 | Reset view and filters |
| ↔️ | Arrange nodes (fix overlapping) |
| ✋ | Toggle drag mode |
| 📊 | Statistics dashboard |
| 📅 | Timeline view |
| 🔗 | Relationship calculator |

### Search

1. Type in search box or press `Ctrl+F`
2. Enter name, date, or place
3. Matching nodes highlight in amber
4. Click result to center on person
5. Click ✕ to clear

### Filter by Generations

1. In "Filter & Navigate", select a person
2. Set number of generations (1-10)
3. Click ✓ to apply
4. Nodes with hidden relatives show dashed orange border
5. Click hidden-connection node to expand
6. Click 🔄 to reset

---

## ✏️ Editing Person Details

### Tabs Overview

| Tab | Fields |
|-----|--------|
| **General** | Name, Nickname, Gender, Birth date/place, Death date/place |
| **Contact** | Mobile, Home phone, Email, WhatsApp, Address |
| **Social** | Facebook, Instagram, LinkedIn, Twitter/X, Website, YouTube |
| **Family** | Add Spouse/Child/Parents/Sibling, View current relatives |
| **More** | Occupation, Company, Education, Religion, Blood group, Notes |

### Adding a Photo

1. Click the 📷 icon on person's avatar
2. Select an image (JPEG, PNG, GIF, WebP)
3. Crop by dragging selection box
4. Click "Apply & Save"

> 💡 Images are automatically compressed to 200×200px JPEG

### Adding Relatives

| Button | Creates |
|--------|---------|
| **+ Spouse** | New person linked as spouse |
| **+ Child** | Child of current person (needs spouse family) |
| **+ Parents** | Father and mother |
| **+ Sibling** | Sibling (needs parents) |

---

## 🛠️ Tools & Features

### Statistics Dashboard (📊)

- Total persons, males, females
- Living vs deceased
- Average lifespan
- Oldest person
- Family with most children
- Common surnames and names
- Birth trends by decade

### Timeline View (📅)

- Events displayed chronologically
- Births, deaths, marriages
- Click event to select person

### Relationship Calculator (🔗)

1. Click 🔗 button
2. Select Person 1
3. Select Person 2
4. Click "Calculate"
5. Shows relationship (e.g., "First Cousin", "Grandparent")

### Find Duplicates

1. Go to "More Tools"
2. Click "Find Duplicates"
3. Review potential duplicates
4. Similarity score shows confidence

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `?` | Show help |
| `D` | Toggle dark mode |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Export/Save |
| `Ctrl+O` | Import/Open |
| `Ctrl+F` | Search |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `F` | Fit to screen |
| `R` | Refresh diagram |
| `A` | Arrange nodes |
| `Escape` | Close modal |
| `Delete` | Delete selected node |

---

## 💡 Tips & Tricks

- **🔒 Privacy First** — All data stays in your browser. Nothing is sent to servers.
- **📱 Works Offline** — Once loaded, the app works without internet.
- **🔄 Auto-save** — Data saves every 5 seconds (if enabled).
- **↩️ Undo Mistakes** — Press `Ctrl+Z` to undo any change.
- **🎯 Quick Navigation** — Click relatives in Family tab to navigate quickly.
- **📸 Small Photos** — Photos auto-compress to 200×200px JPEG.
- **🔍 Filter Large Trees** — Use generation filter to focus on branches.
- **📤 Regular Backups** — Export to GEDCOM regularly!
- **⚡ Fix Overlaps** — Click ↔️ arrange button if nodes overlap.

---

## 📁 Project Structure

| File | Purpose |
|------|---------|
| `index.html` | Main UI and event handling |
| `js/diagram.js` | Cytoscape.js graph rendering |
| `js/gedcom.js` | GEDCOM parsing |
| `js/gedcom_edit.js` | Node editing |
| `js/gedcom_import.js` | File import |
| `js/gedcom_export.js` | File export |
| `js/security.js` | Security utilities |
| `js/shortcuts.js` | Keyboard shortcuts & help system |
| `js/state2.js` | Undo/redo |
| `js/timeline.js` | Timeline view |
| `service-worker.js` | PWA caching |

---

## 🔮 Future Ideas

- Multiple file tabs
- Pedigree/descendant/fan charts
- GEDCOM 7.0 support
- Map view for locations
- Cloud sync (Google Drive/Dropbox)
- Multi-language support

---

## 📄 License

MIT License. See [LICENSE.txt](LICENSE.txt) for details.

Third-party: Cytoscape.js (MIT), Google Fonts (SIL OFL)
