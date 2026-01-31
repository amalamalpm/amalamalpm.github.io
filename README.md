# [https://amalamalpm.github.io/](https://amalamalpm.github.io)

---

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
- Keyboard shortcuts (press `?`)
- PWA support (installable)

---

## 🚀 How to Run

```bash
cd /path/to/ged
python3 -m http.server 8080
```

Open: `http://localhost:8080`

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `?` | Show shortcuts |
| `D` | Dark mode |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Export |
| `+` / `-` / `0` | Zoom in / out / fit |
| `A` | Arrange nodes |
| `R` | Reset filter |

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
| `js/shortcuts.js` | Keyboard shortcuts |
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

---

## 📄 License

MIT License. See [LICENSE.txt](LICENSE.txt) for details.

Third-party: Cytoscape.js (MIT), Google Fonts (SIL OFL)
