/**
 * GEDCOM Family Tree Editor
 * Copyright (c) 2024-2026 amalamalpm
 * Licensed under MIT License - see LICENSE.txt
 */

import {FamilyRow} from './gedcom.js';
import {escapeHtml, validateImageFile, sanitizeImportedValue} from './security.js';

const debugTrace = false; // SECURITY: Disabled for production

/**
 * Format a full name - just trim and clean up whitespace
 * @param {string} fullName - The full name to format
 * @returns {string} Cleaned name
 */
function formatGedcomName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return '';
    }
    return fullName.trim().replace(/\s+/g, ' ');
}

const partner = 'partner';
const sibling = 'sibling';
const child = 'child_fam';
const child_from_parent = 'child_from_parent';
const parent = 'parent';

const displayFileContent = function (familyRow) {
    if (debugTrace) console.log(familyRow)
    document.currentlySelectedFamilyRow = [];
    document.currentlySelectedFamilyRow.push(familyRow);
    document.getElementById('selected_data').innerHTML = showAllValuesAndChildValues(familyRow, 0);
    
    // Show the selected person card when a node is clicked
    const selectedCard = document.getElementById('selected-person-card');
    if (selectedCard) {
        selectedCard.classList.add('visible');
    }
    
    // Show the add relative card (only for individuals, not families)
    const addRelativeCard = document.getElementById('add-relative-card');
    if (addRelativeCard) {
        if (familyRow.tag === 'INDI') {
            addRelativeCard.classList.add('visible');
        } else {
            addRelativeCard.classList.remove('visible');
        }
    }
    
    // On mobile, auto-open the bottom sheet to show person details
    if (window.innerWidth < 768) {
        document.body.classList.add('sidebar-open');
    }
}

function findRoot(currentFamilyRow) {
    let maxStep = 100;
    let iterator = currentFamilyRow;
    while (iterator.level === -1) {
        iterator = iterator.parent;
        if (maxStep-- === 0) {
            return "ERROR";
        }
    }
    return iterator;
}

function nextIndividualID(rootFamilyRow) {
    let nextId = rootFamilyRow.indviduals.size + 1;
    while (rootFamilyRow.indviduals.has(getIndividualId(nextId))) {
        nextId++;
    }
    return getIndividualId(nextId);
}

function nextFamilyID(rootFamilyRow) {
    let nextId = rootFamilyRow.families.size + 1;
    while (rootFamilyRow.families.has(getFamilyId(nextId))) {
        nextId++;
    }
    return getFamilyId(nextId);
}

function getIndividualId(idNumber) {
    return "@I" + idNumber + "@";
}

function getFamilyId(idNumber) {
    return "@F" + idNumber + "@";
}

function createNewNode(rootFamilyRow, genderIp) {
    const newNode = new FamilyRow(0, nextIndividualID(rootFamilyRow), "INDI", undefined)

    let newNodeName = document.getElementById("newNodeNameValue").value;
    // Clean up the name
    const formattedName = formatGedcomName(newNodeName);
    newNode.NAME = new FamilyRow(1, undefined, "NAME", formattedName)

    // Get gender from parameter or from radio button
    let gender = genderIp;
    if (!gender) {
        const genderRadio = document.querySelector('input[name="newNodeGender"]:checked');
        gender = genderRadio ? genderRadio.value : null;
    }
    
    if (gender) {
        newNode.SEX = new FamilyRow(1, undefined, "SEX", gender)
    }
    addIndiToRoot(rootFamilyRow, newNode);
    return newNode;
}

function addIndiToRoot(rootFamilyRow, newNode) {
    if (rootFamilyRow.INDI) {
        if (!Array.isArray(rootFamilyRow.INDI)) {
            rootFamilyRow.INDI = [rootFamilyRow.INDI];
        }
        rootFamilyRow.INDI.push(newNode);
    } else {
        rootFamilyRow.INDI = [newNode];
    }
    if (!newNode.parent) {
        newNode.parent = rootFamilyRow;
    }
    rootFamilyRow.indviduals.set(newNode.id, newNode);
}

function addFamToRoot(rootFamilyRow, newFamily) {
    if (rootFamilyRow.FAM) {
        if (!Array.isArray(rootFamilyRow.FAM)) {
            rootFamilyRow.FAM = [rootFamilyRow.FAM];
        }
        rootFamilyRow.FAM.push(newFamily);
    } else {
        rootFamilyRow.FAM = [newFamily];
    }
    if (!newFamily.parent) {
        newFamily.parent = rootFamilyRow;
    }

    rootFamilyRow.families.set(newFamily.id, newFamily);
}

function createOrGetFamilyOfChild(childObject, rootFamilyRow) {
    let familyRow = null;
    if (!(childObject.FAMC && childObject.FAMC.length > 0)) {
        console.log("Creating a family for child");
        familyRow = new FamilyRow(0, nextFamilyID(rootFamilyRow), "FAM", undefined);
        addFamToRoot(rootFamilyRow, familyRow);
        childObject.FAMC = [new FamilyRow(1, familyRow.id, "FAMC", undefined)];
        familyRow.CHIL = [new FamilyRow(1, childObject.id, "CHIL", undefined)];
    } else {
        console.log("Already Child of a family");
        let familyId = childObject.FAMC[0].id
        familyRow = rootFamilyRow.families.get(familyId);
    }
    return familyRow
}

function createOrGetFamilyOfPartner(currentFamilyRow, rootFamilyRow) {
    let familyRow = null;
    if (!(currentFamilyRow.FAMS && currentFamilyRow.FAMS.length > 0)) {
        console.log("Creating a family for partner");
        familyRow = new FamilyRow(0, nextFamilyID(rootFamilyRow), "FAM", undefined);
        addFamToRoot(rootFamilyRow, familyRow);
        currentFamilyRow.FAMS = [new FamilyRow(1, familyRow.id, "FAMS", undefined)];
        if(currentFamilyRow.SEX && currentFamilyRow.SEX.value === 'M') {
            familyRow.HUSB = [new FamilyRow(1, currentFamilyRow.id, "HUSB", undefined)];
        } else {
            familyRow.WIFE = [new FamilyRow(1, currentFamilyRow.id, "WIFE", undefined)];
        }
    } else {
        console.log("Already Partner of a family");
        let familyId = currentFamilyRow.FAMS[0].id
        familyRow = rootFamilyRow.families.get(familyId);
    }
    return familyRow
}

function addParentsIfNotAvailable(currentFamilyRow, rootFamilyRow) {
    let familyRow = createOrGetFamilyOfChild(currentFamilyRow, rootFamilyRow);
    if(familyRow.HUSB && familyRow.HUSB.length > 0) {
        console.log("Family already has a husband");
    } else {
        const newFather = createNewNode(rootFamilyRow, 'M');
        newFather.FAMS = [new FamilyRow(1, familyRow.id, "FAMS", undefined)];
        familyRow.HUSB = [new FamilyRow(1, newFather.id, "HUSB", undefined)];
    }
    if(familyRow.WIFE && familyRow.WIFE.length > 0) {
        console.log("Family already has a wife");
    } else {
        const newMother = createNewNode(rootFamilyRow, 'F');
        newMother.FAMS = [new FamilyRow(1, familyRow.id, "FAMS", undefined)];
        familyRow.WIFE = [new FamilyRow(1, newMother.id, "WIFE", undefined)];
    }
}

function addSibling(currentFamilyRow, rootFamilyRow) {
    let familyRow = createOrGetFamilyOfChild(currentFamilyRow, rootFamilyRow);
    const newSibling = createNewNode(rootFamilyRow);
    familyRow.CHIL.push(new FamilyRow(1, newSibling.id, "CHIL", undefined));
    newSibling.FAMC = [new FamilyRow(1, familyRow.id, "FAMC", undefined)];
}

function addPartner(currentFamilyRow, rootFamilyRow) {
    let familyRow = createOrGetFamilyOfPartner(currentFamilyRow, rootFamilyRow);
    const newPartner = createNewNode(rootFamilyRow);
    newPartner.FAMS = [new FamilyRow(1, familyRow.id, "FAMS", undefined)];
    if(newPartner.SEX.value === 'M') {
        if(familyRow.HUSB && familyRow.HUSB.length > 0) {
            familyRow.HUSB.push(new FamilyRow(1, newPartner.id, "HUSB", undefined));
        } else {
            familyRow.HUSB = [new FamilyRow(1, newPartner.id, "HUSB", undefined)];
        }
    } else {
        if(familyRow.WIFE && familyRow.WIFE.length > 0) {
            familyRow.WIFE.push(new FamilyRow(1, newPartner.id, "WIFE", undefined));
        } else {
            familyRow.WIFE = [new FamilyRow(1, newPartner.id, "WIFE", undefined)];
        }
    }
}

function addChildToFamily(currentFamilyRow, rootFamilyRow) {
    const newNode = createNewNode(rootFamilyRow);
    newNode.FAMC = [new FamilyRow(1, currentFamilyRow.id, "FAMC", undefined)]

    if (currentFamilyRow.CHIL && currentFamilyRow.CHIL.length > 0) {
        currentFamilyRow.CHIL.push(new FamilyRow(1, newNode.id, "CHIL", undefined));
    } else {
        currentFamilyRow.CHIL = [new FamilyRow(1, newNode.id, "CHIL", undefined)];
    }
}

function getOptionsToAddNewNode(familyRow) {
    // create and return a form with input fields name, and save button
    let newNodeOptions = "";

    newNodeOptions = "<div class='form-group'>";
    newNodeOptions += "<label for='newNodeNameValue'>Name</label>";
    newNodeOptions += "<input type='text' id='newNodeNameValue' name='newNodeNameValue' placeholder='Enter name'>";
    newNodeOptions += "</div>";

    newNodeOptions += "<div class='form-group'>";
    newNodeOptions += "<label>Gender</label>";
    newNodeOptions += "<div class='radio-group'>";
    newNodeOptions += "<label><input type='radio' name='newNodeGender' value='M'> Male</label>";
    newNodeOptions += "<label><input type='radio' name='newNodeGender' value='F'> Female</label>";
    newNodeOptions += "<label><input type='radio' name='newNodeGender' value='O'> Other</label>";
    newNodeOptions += "</div></div>";

    newNodeOptions += "<div class='btn-group' style='margin-top:12px'>";
    if (familyRow.tag === 'INDI') {
        newNodeOptions += "<button class='btn-secondary btn-sm' onclick='addNewNode(\"" + partner + "\")'>+ Spouse</button>";
        newNodeOptions += "<button class='btn-secondary btn-sm' onclick='addNewNode(\"" + sibling + "\")'>+ Sibling</button>";
        newNodeOptions += "<button class='btn-secondary btn-sm' onclick='addNewNode(\"" + parent + "\")'>+ Parents</button>";
        newNodeOptions += "<button class='btn-secondary btn-sm' onclick='addNewNode(\"" + child_from_parent + "\")'>+ Child</button>";
    } else {
        newNodeOptions += "<button class='btn-secondary btn-sm' onclick='addNewNode(\"" + child + "\")'>+ Add Child</button>";
    }
    newNodeOptions += "</div>";
    return newNodeOptions;
}

function addNewNode(typeOfNewNode) {
    console.log(typeOfNewNode);
    const currentFamilyRow = document.currentlySelectedFamilyRow[0]
    const rootFamilyRow = findRoot(document.dataParsed);

    // Validate gender is selected (except for 'parent' which auto-creates both)
    if (typeOfNewNode !== parent) {
        const genderRadio = document.querySelector('input[name="newNodeGender"]:checked');
        if (!genderRadio) {
            alert('⚠️ Please select a gender (Male, Female, or Other) before adding a relative.');
            return;
        }
    }

    switch (typeOfNewNode) {
        case partner:
            console.log("Add as partner");
            addPartner(currentFamilyRow, rootFamilyRow);
            break;
        case sibling:
            console.log("Add as sibling");
            addSibling(currentFamilyRow, rootFamilyRow);
            break;
        case child_from_parent:
            console.log("Add as child from parent");
            let getFamilyRow = createOrGetFamilyOfPartner(currentFamilyRow, rootFamilyRow);
            addChildToFamily(getFamilyRow, rootFamilyRow);
            break;
        case child:
            console.log("Add as child in family");
            addChildToFamily(currentFamilyRow, rootFamilyRow);
            break;
        case parent:
            console.log("Add as parent");
            addParentsIfNotAvailable(currentFamilyRow, rootFamilyRow);
            break;
        default:
            console.log("Invalid option");
    }
}

let nonEditableFields = ['id', 'tag', 'level', 'order', 'parent', 'indviduals', 'families', 'FAMS', 'FAMC', 'CHIL', 'HUSB', 'WIFE', 'rowLevel', 'visited'];
let hiddenFields = ['tag', 'level', 'order', 'parent', 'indviduals', 'families', 'rowLevel', 'visited', '_CURRENT', '_PRIMARY'];

// Helper to safely get nested value
function getFieldValue(familyRow, ...path) {
    let current = familyRow;
    for (const key of path) {
        if (!current || !current[key]) return '';
        current = current[key];
    }
    return current.value || '';
}

// Convert GEDCOM date (e.g., "15 Jan 1990") to HTML date input format (YYYY-MM-DD)
function convertToDateInput(gedcomDate) {
    if (!gedcomDate) return '';
    
    const months = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    // Try to parse "DD MMM YYYY" format
    const match = gedcomDate.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = months[match[2].toUpperCase()] || '01';
        const year = match[3];
        return `${year}-${month}-${day}`;
    }
    
    // Try "MMM YYYY" format (no day)
    const matchMonthYear = gedcomDate.match(/([A-Z]{3})\s+(\d{4})/i);
    if (matchMonthYear) {
        const month = months[matchMonthYear[1].toUpperCase()] || '01';
        const year = matchMonthYear[2];
        return `${year}-${month}-01`;
    }
    
    // Try just year
    const matchYear = gedcomDate.match(/(\d{4})/);
    if (matchYear) {
        return `${matchYear[1]}-01-01`;
    }
    
    return '';
}

// Convert HTML date (YYYY-MM-DD) to GEDCOM format (DD MMM YYYY)
function convertFromDateInput(htmlDate) {
    if (!htmlDate) return '';
    
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const parts = htmlDate.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return `${day} ${months[monthIndex]} ${year}`;
    }
    return htmlDate;
}

// Open flexible date picker modal
function openDatePicker(targetInputId) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    // Get current value to pre-fill
    const targetInput = document.getElementById(targetInputId);
    const currentValue = targetInput ? targetInput.value : '';
    
    // Parse current value
    let currentYear = new Date().getFullYear();
    let currentMonth = '';
    let currentDay = '';
    
    if (currentValue) {
        // Try full date: DD MMM YYYY
        const fullMatch = currentValue.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
        if (fullMatch) {
            currentDay = fullMatch[1];
            currentMonth = fullMatch[2].toUpperCase();
            currentYear = fullMatch[3];
        } else {
            // Try MMM YYYY
            const monthYearMatch = currentValue.match(/([A-Z]{3})\s+(\d{4})/i);
            if (monthYearMatch) {
                currentMonth = monthYearMatch[1].toUpperCase();
                currentYear = monthYearMatch[2];
            } else {
                // Try just year
                const yearMatch = currentValue.match(/(\d{4})/);
                if (yearMatch) {
                    currentYear = yearMatch[1];
                }
            }
        }
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'datePickerModal';
    modal.innerHTML = `
        <div class="modal-content" style="width:340px;max-width:95%;">
            <div class="modal-header">
                <h2>📅 Select Date</h2>
                <button class="modal-close" onclick="closeDatePickerModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display:flex;flex-direction:column;gap:16px;">
                    <!-- Date Format Selection -->
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-weight:700;margin-bottom:8px;">Date Precision</label>
                        <div class="radio-group" style="flex-direction:column;gap:8px;">
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="radio" name="datePrecision" value="full" ${currentDay ? 'checked' : ''} onchange="toggleDateFields(this.value)">
                                <span>Full date (day, month, year)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="radio" name="datePrecision" value="monthYear" ${!currentDay && currentMonth ? 'checked' : ''} onchange="toggleDateFields(this.value)">
                                <span>Month & year only</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                                <input type="radio" name="datePrecision" value="yearOnly" ${!currentDay && !currentMonth ? 'checked' : ''} onchange="toggleDateFields(this.value)">
                                <span>Year only</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Date Fields -->
                    <div style="display:flex;gap:10px;align-items:flex-end;">
                        <div class="form-group" id="dayField" style="flex:1;margin-bottom:0;${currentDay ? '' : 'display:none;'}">
                            <label>Day</label>
                            <select id="datePickerDay" style="width:100%;">
                                <option value="">--</option>
                                ${Array.from({length: 31}, (_, i) => `<option value="${i+1}" ${currentDay == (i+1) ? 'selected' : ''}>${i+1}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" id="monthField" style="flex:1.5;margin-bottom:0;${currentMonth || currentDay ? '' : 'display:none;'}">
                            <label>Month</label>
                            <select id="datePickerMonth" style="width:100%;">
                                <option value="">--</option>
                                ${months.map((m, i) => `<option value="${m}" ${currentMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="flex:1.5;margin-bottom:0;">
                            <label>Year *</label>
                            <input type="number" id="datePickerYear" min="1" max="2100" value="${currentYear}" style="width:100%;" required>
                        </div>
                    </div>
                    
                    <!-- Prefix for approximate dates -->
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Date Qualifier (optional)</label>
                        <select id="datePickerPrefix" style="width:100%;">
                            <option value="">Exact date</option>
                            <option value="ABT">ABT - About/Approximately</option>
                            <option value="BEF">BEF - Before</option>
                            <option value="AFT">AFT - After</option>
                            <option value="EST">EST - Estimated</option>
                            <option value="CAL">CAL - Calculated</option>
                        </select>
                    </div>
                </div>
                
                <div style="display:flex;gap:12px;margin-top:20px;">
                    <button class="btn-outline" onclick="closeDatePickerModal()" style="flex:1;">Cancel</button>
                    <button class="btn-primary" onclick="applyDatePicker('${targetInputId}')" style="flex:1;">Apply</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set initial precision based on current value
    if (!currentDay && !currentMonth) {
        toggleDateFields('yearOnly');
    } else if (!currentDay && currentMonth) {
        toggleDateFields('monthYear');
    }
}

// Toggle date fields based on precision selection
function toggleDateFields(precision) {
    const dayField = document.getElementById('dayField');
    const monthField = document.getElementById('monthField');
    
    if (precision === 'full') {
        dayField.style.display = '';
        monthField.style.display = '';
    } else if (precision === 'monthYear') {
        dayField.style.display = 'none';
        monthField.style.display = '';
        document.getElementById('datePickerDay').value = '';
    } else { // yearOnly
        dayField.style.display = 'none';
        monthField.style.display = 'none';
        document.getElementById('datePickerDay').value = '';
        document.getElementById('datePickerMonth').value = '';
    }
}

// Apply selected date to target input
function applyDatePicker(targetInputId) {
    const year = document.getElementById('datePickerYear').value;
    const month = document.getElementById('datePickerMonth').value;
    const day = document.getElementById('datePickerDay').value;
    const prefix = document.getElementById('datePickerPrefix').value;
    
    if (!year) {
        alert('Please enter a year');
        return;
    }
    
    // Build date string based on what's provided
    let dateStr = '';
    
    if (day && month) {
        dateStr = `${day} ${month} ${year}`;
    } else if (month) {
        dateStr = `${month} ${year}`;
    } else {
        dateStr = year;
    }
    
    // Add prefix if selected
    if (prefix) {
        dateStr = `${prefix} ${dateStr}`;
    }
    
    // Apply to target input
    const targetInput = document.getElementById(targetInputId);
    if (targetInput) {
        targetInput.value = dateStr;
        targetInput.dispatchEvent(new Event('change'));
    }
    
    closeDatePickerModal();
}

// Close date picker modal
function closeDatePickerModal() {
    const modal = document.getElementById('datePickerModal');
    if (modal) {
        modal.remove();
    }
}

function showAllValuesAndChildValues(familyRow, cacheIndex) {
    if (familyRow.tag === 'INDI') {
        return generatePersonTabs(familyRow);
    } else {
        return generateFamilyView(familyRow);
    }
}

function generatePersonTabs(familyRow) {
    let displayName = escapeHtml(getFieldValue(familyRow, 'NAME').replace(/\//g, '') || familyRow.id || 'Unknown');
    const gender = getFieldValue(familyRow, 'SEX');
    const genderIcon = gender === 'M' ? '👨' : gender === 'F' ? '👩' : '🧑';
    let html = '';
    
    // Compact header with photo
    html += `<div class="person-header">`;
    // SECURITY: Validate image data URL before using
    if (familyRow.IMG && familyRow.IMG.value && familyRow.IMG.value.startsWith('data:image/')) {
        html += `<img src="${familyRow.IMG.value}" alt="Photo" class="person-photo" onclick="document.getElementById('fileInputForImg').click()">`;
    } else {
        html += `<div class="person-photo-placeholder" onclick="document.getElementById('fileInputForImg').click()">${genderIcon}</div>`;
    }
    html += `<input type="file" id="fileInputForImg" class="file-input-hidden" accept=".jpg,.jpeg,.png,.gif,.webp" onchange="handleImgFileSelect(event)">`;
    html += `<div class="person-info">`;
    html += `<h3 class="person-name">${displayName}</h3>`;
    html += `<p class="person-id">${escapeHtml(familyRow.id)}</p>`;
    html += `</div>`;
    html += `</div>`;
    
    // Tabs - General first, Family second
    html += `<div class="person-tabs">`;
    html += `<button class="person-tab active" onclick="switchTab('general', this)"><span class="person-tab-icon">👤</span>General</button>`;
    html += `<button class="person-tab" onclick="switchTab('family', this)"><span class="person-tab-icon">👨‍👩‍👧</span>Family</button>`;
    html += `<button class="person-tab" onclick="switchTab('contact', this)"><span class="person-tab-icon">📱</span>Contact</button>`;
    html += `<button class="person-tab" onclick="switchTab('social', this)"><span class="person-tab-icon">🌐</span>Social</button>`;
    html += `<button class="person-tab" onclick="switchTab('more', this)"><span class="person-tab-icon">⚙️</span>More</button>`;
    html += `</div>`;
    
    // Tab Contents - General first, Family second
    html += `<div id="tab-general" class="tab-content active">${generateGeneralTab(familyRow)}</div>`;
    html += `<div id="tab-family" class="tab-content">${generateFamilyTab(familyRow)}</div>`;
    html += `<div id="tab-contact" class="tab-content">${generateContactTab(familyRow)}</div>`;
    html += `<div id="tab-social" class="tab-content">${generateSocialTab(familyRow)}</div>`;
    html += `<div id="tab-more" class="tab-content">${generateMoreTab(familyRow)}</div>`;
    
    return html;
}

function generateGeneralTab(familyRow) {
    const isAlive = !(familyRow.DEAT && (familyRow.DEAT.DATE || familyRow.DEAT.PLAC));
    let html = '';
    
    // Full Name - SECURITY: escape user input for attribute
    html += `<div class="form-group">`;
    html += `<label>Full Name <small style="color:var(--text-muted);font-weight:normal;">(First Last)</small></label>`;
    html += `<input type="text" placeholder="John Smith" value="${escapeHtml(getFieldValue(familyRow, 'NAME').replace(/\//g, ' ').trim())}" onchange="updatePersonField(this, 'NAME')" autocomplete="name">`;
    html += `</div>`;
    
    // Nickname
    html += `<div class="form-group">`;
    html += `<label>Nickname <small style="color:var(--text-muted);font-weight:normal;">(Optional)</small></label>`;
    html += `<input type="text" placeholder="Johnny, JD, etc." value="${escapeHtml(getFieldValue(familyRow, '_NICK'))}" onchange="updatePersonField(this, '_NICK')">`;
    html += `</div>`;
    
    // Gender
    html += `<div class="form-group">`;
    html += `<label>Gender</label>`;
    html += `<div class="radio-group">`;
    const sex = getFieldValue(familyRow, 'SEX');
    html += `<label><input type="radio" name="personGender" value="M" ${sex === 'M' ? 'checked' : ''} onchange="updatePersonField(this, 'SEX')"> 👨 Male</label>`;
    html += `<label><input type="radio" name="personGender" value="F" ${sex === 'F' ? 'checked' : ''} onchange="updatePersonField(this, 'SEX')"> 👩 Female</label>`;
    html += `<label><input type="radio" name="personGender" value="O" ${sex === 'O' ? 'checked' : ''} onchange="updatePersonField(this, 'SEX')"> 🧑 Other</label>`;
    html += `</div></div>`;
    
    // Date of Birth - flexible input supporting partial dates
    html += `<div class="form-group">`;
    html += `<label>Date of Birth 📅</label>`;
    html += `<div style="display:flex;gap:8px;align-items:center;">`;
    html += `<input type="text" id="dobInput" placeholder="e.g., 1990, JAN 1990, 15 JAN 1990" value="${escapeHtml(getFieldValue(familyRow, 'BIRT', 'DATE'))}" onchange="updateNestedField(this, 'BIRT', 'DATE')" style="flex:1;">`;
    html += `<button type="button" class="btn-outline btn-sm" onclick="openDatePicker('dobInput')" title="Open date picker" style="padding:8px 12px;white-space:nowrap;">📅</button>`;
    html += `</div>`;
    html += `<small style="color:var(--text-muted);display:block;margin-top:4px;">Formats: 1990 | JAN 1990 | 15 JAN 1990 | ABT 1990</small>`;
    html += `</div>`;
    
    // Place of Birth
    html += `<div class="form-group">`;
    html += `<label>Place of Birth 📍</label>`;
    html += `<input type="text" placeholder="City, State, Country" value="${escapeHtml(getFieldValue(familyRow, 'BIRT', 'PLAC'))}" onchange="updateNestedField(this, 'BIRT', 'PLAC')">`;
    html += `</div>`;
    
    return html;
}

function generateContactTab(familyRow) {
    let html = '';
    
    // Mobile Phone - SECURITY: escape all user input values
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">📱</span>`;
    html += `<input type="tel" placeholder="+91 98765 43210" value="${escapeHtml(getFieldValue(familyRow, 'PHON'))}" onchange="updatePersonField(this, 'PHON')" autocomplete="tel" inputmode="tel">`;
    html += `</div>`;
    
    // Home/Work Phone
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">📞</span>`;
    html += `<input type="tel" placeholder="Home: 044-2345-6789" value="${escapeHtml(getFieldValue(familyRow, '_PHON2'))}" onchange="updatePersonField(this, '_PHON2')" inputmode="tel">`;
    html += `</div>`;
    
    // Email
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">✉️</span>`;
    html += `<input type="email" placeholder="name@gmail.com" value="${escapeHtml(getFieldValue(familyRow, 'EMAIL'))}" onchange="updatePersonField(this, 'EMAIL')" autocomplete="email" inputmode="email">`;
    html += `</div>`;
    
    // WhatsApp
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">💬</span>`;
    html += `<input type="tel" placeholder="WhatsApp: +91 98765 43210" value="${escapeHtml(getFieldValue(familyRow, '_WHATSAPP'))}" onchange="updatePersonField(this, '_WHATSAPP')" inputmode="tel">`;
    html += `</div>`;
    
    // Address (multi-line)
    html += `<div class="form-group" style="margin-top:12px;">`;
    html += `<label>🏠 Current Address</label>`;
    html += `<textarea placeholder="House No, Street Name&#10;Area, City - PIN&#10;State, Country" onchange="updatePersonField(this, 'ADDR')">${escapeHtml(getFieldValue(familyRow, 'ADDR'))}</textarea>`;
    html += `</div>`;
    
    return html;
}

function generateSocialTab(familyRow) {
    let html = '';
    
    // Facebook - SECURITY: escape all user input values
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">📘</span>`;
    html += `<input type="url" placeholder="https://facebook.com/john.smith" value="${escapeHtml(getFieldValue(familyRow, '_FACEBOOK'))}" onchange="updatePersonField(this, '_FACEBOOK')" inputmode="url">`;
    html += `</div>`;
    
    // Instagram
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">📸</span>`;
    html += `<input type="text" placeholder="@johnsmith or instagram.com/johnsmith" value="${escapeHtml(getFieldValue(familyRow, '_INSTAGRAM'))}" onchange="updatePersonField(this, '_INSTAGRAM')">`;
    html += `</div>`;
    
    // LinkedIn
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">💼</span>`;
    html += `<input type="url" placeholder="https://linkedin.com/in/johnsmith" value="${escapeHtml(getFieldValue(familyRow, '_LINKEDIN'))}" onchange="updatePersonField(this, '_LINKEDIN')" inputmode="url">`;
    html += `</div>`;
    
    // Twitter/X
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">🐦</span>`;
    html += `<input type="text" placeholder="@johnsmith or x.com/johnsmith" value="${escapeHtml(getFieldValue(familyRow, '_TWITTER'))}" onchange="updatePersonField(this, '_TWITTER')">`;
    html += `</div>`;
    
    // Website
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">🌐</span>`;
    html += `<input type="url" placeholder="https://www.example.com" value="${escapeHtml(getFieldValue(familyRow, '_WWW'))}" onchange="updatePersonField(this, '_WWW')" inputmode="url">`;
    html += `</div>`;
    
    // YouTube
    html += `<div class="contact-field">`;
    html += `<span class="contact-field-icon">📺</span>`;
    html += `<input type="url" placeholder="https://youtube.com/@channel" value="${escapeHtml(getFieldValue(familyRow, '_YOUTUBE'))}" onchange="updatePersonField(this, '_YOUTUBE')" inputmode="url">`;
    html += `</div>`;
    
    return html;
}

function generateFamilyTab(familyRow) {
    let html = '';
    
    // Current family members section only
    html += generateCurrentFamilyMembers(familyRow);
    
    return html;
}

// Generate the current family members expandable section
function generateCurrentFamilyMembers(familyRow) {
    const rootFamilyRow = findRoot(document.dataParsed);
    if (!rootFamilyRow) return '';
    
    let html = '';
    let hasMembers = false;
    
    // Collect family members
    const spouses = [];
    const children = [];
    const parents = [];
    const siblings = [];
    
    // Get spouses from FAMS (families where person is a spouse)
    if (familyRow.FAMS) {
        const famsList = Array.isArray(familyRow.FAMS) ? familyRow.FAMS : [familyRow.FAMS];
        famsList.forEach(famsRef => {
            const family = rootFamilyRow.families.get(famsRef.id);
            if (family) {
                // Get spouse
                if (family.HUSB) {
                    const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
                    husbList.forEach(h => {
                        if (h.id !== familyRow.id) {
                            const spouse = rootFamilyRow.indviduals.get(h.id);
                            if (spouse) spouses.push(spouse);
                        }
                    });
                }
                if (family.WIFE) {
                    const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
                    wifeList.forEach(w => {
                        if (w.id !== familyRow.id) {
                            const spouse = rootFamilyRow.indviduals.get(w.id);
                            if (spouse) spouses.push(spouse);
                        }
                    });
                }
                // Get children
                if (family.CHIL) {
                    const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
                    childList.forEach(c => {
                        const child = rootFamilyRow.indviduals.get(c.id);
                        if (child) children.push(child);
                    });
                }
            }
        });
    }
    
    // Get parents from FAMC (family where person is a child)
    if (familyRow.FAMC) {
        const famcList = Array.isArray(familyRow.FAMC) ? familyRow.FAMC : [familyRow.FAMC];
        famcList.forEach(famcRef => {
            const family = rootFamilyRow.families.get(famcRef.id);
            if (family) {
                // Get father
                if (family.HUSB) {
                    const husbList = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
                    husbList.forEach(h => {
                        const father = rootFamilyRow.indviduals.get(h.id);
                        if (father) parents.push({ person: father, relation: 'Father' });
                    });
                }
                // Get mother
                if (family.WIFE) {
                    const wifeList = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
                    wifeList.forEach(w => {
                        const mother = rootFamilyRow.indviduals.get(w.id);
                        if (mother) parents.push({ person: mother, relation: 'Mother' });
                    });
                }
                // Get siblings
                if (family.CHIL) {
                    const childList = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
                    childList.forEach(c => {
                        if (c.id !== familyRow.id) {
                            const sibling = rootFamilyRow.indviduals.get(c.id);
                            if (sibling) siblings.push(sibling);
                        }
                    });
                }
            }
        });
    }
    
    hasMembers = spouses.length > 0 || children.length > 0 || parents.length > 0 || siblings.length > 0;
    
    // Build the HTML
    html += `<div class="family-members-section${hasMembers ? ' open' : ''}" onclick="this.classList.toggle('open')">`;
    html += `<div class="family-members-header">`;
    html += `<span>👪 Current Family Members</span>`;
    html += `<span class="family-members-toggle">▼</span>`;
    html += `</div>`;
    html += `<div class="family-members-list" onclick="event.stopPropagation()">`;
    
    if (!hasMembers) {
        html += `<div class="no-family-members">No family members linked yet</div>`;
    } else {
        // Parents - SECURITY: escape names for display
        if (parents.length > 0) {
            html += `<div class="family-member-group">`;
            html += `<div class="family-member-group-title">👨‍👩‍👦 Parents</div>`;
            parents.forEach(p => {
                const name = escapeHtml(getFieldValue(p.person, 'NAME').replace(/\//g, ' ').trim() || p.person.id);
                html += `<div class="family-member-item" onclick="goToFamilyMember('${escapeHtml(p.person.id)}')">`;
                html += `<span class="family-member-icon">${p.relation === 'Father' ? '👨' : '👩'}</span>`;
                html += `<span class="family-member-name">${name}</span>`;
                html += `<small style="color:var(--text-muted)">${p.relation}</small>`;
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Spouses
        if (spouses.length > 0) {
            html += `<div class="family-member-group">`;
            html += `<div class="family-member-group-title">💑 Spouse(s)</div>`;
            spouses.forEach(s => {
                const name = escapeHtml(getFieldValue(s, 'NAME').replace(/\//g, ' ').trim() || s.id);
                const gender = getFieldValue(s, 'SEX');
                html += `<div class="family-member-item" onclick="goToFamilyMember('${escapeHtml(s.id)}')">`;
                html += `<span class="family-member-icon">${gender === 'M' ? '👨' : '👩'}</span>`;
                html += `<span class="family-member-name">${name}</span>`;
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Siblings
        if (siblings.length > 0) {
            html += `<div class="family-member-group">`;
            html += `<div class="family-member-group-title">👫 Siblings</div>`;
            siblings.forEach(s => {
                const name = escapeHtml(getFieldValue(s, 'NAME').replace(/\//g, ' ').trim() || s.id);
                const gender = getFieldValue(s, 'SEX');
                html += `<div class="family-member-item" onclick="goToFamilyMember('${escapeHtml(s.id)}')">`;
                html += `<span class="family-member-icon">${gender === 'M' ? '👦' : '👧'}</span>`;
                html += `<span class="family-member-name">${name}</span>`;
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Children
        if (children.length > 0) {
            html += `<div class="family-member-group">`;
            html += `<div class="family-member-group-title">👶 Children</div>`;
            children.forEach(c => {
                const name = escapeHtml(getFieldValue(c, 'NAME').replace(/\//g, ' ').trim() || c.id);
                const gender = getFieldValue(c, 'SEX');
                html += `<div class="family-member-item" onclick="goToFamilyMember('${escapeHtml(c.id)}')">`;
                html += `<span class="family-member-icon">${gender === 'M' ? '👦' : '👧'}</span>`;
                html += `<span class="family-member-name">${name}</span>`;
                html += `</div>`;
            });
            html += `</div>`;
        }
    }
    
    html += `</div>`;
    html += `</div>`;
    
    return html;
}

function generateMoreTab(familyRow) {
    const isAlive = !(familyRow.DEAT && (familyRow.DEAT.DATE || familyRow.DEAT.PLAC));
    let html = '';
    
    // Life Status section
    html += `<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">`;
    html += `<label style="font-weight:700; font-size:0.85rem; color:var(--text-dark); margin-bottom:8px; display:block;">🕯️ Life Status</label>`;
    
    // Alive toggle
    html += `<div class="alive-toggle ${isAlive ? '' : 'deceased'}">`;
    html += `<input type="checkbox" id="isAliveCheck" ${isAlive ? 'checked' : ''} onchange="toggleDeathFields(this)">`;
    html += `<label for="isAliveCheck">${isAlive ? '✅ Currently Living' : '⚫ Deceased'}</label>`;
    html += `</div>`;
    
    // Death fields (hidden by default if alive)
    html += `<div class="death-fields ${isAlive ? '' : 'visible'}" id="deathFields">`;
    html += `<div class="form-group">`;
    html += `<label>Date of Death 📅</label>`;
    html += `<div style="display:flex;gap:8px;align-items:center;">`;
    html += `<input type="text" id="dodInput" placeholder="e.g., 1616, APR 1616, 23 APR 1616" value="${escapeHtml(getFieldValue(familyRow, 'DEAT', 'DATE'))}" onchange="updateNestedField(this, 'DEAT', 'DATE')" style="flex:1;">`;
    html += `<button type="button" class="btn-outline btn-sm" onclick="openDatePicker('dodInput')" title="Open date picker" style="padding:8px 12px;white-space:nowrap;">📅</button>`;
    html += `</div>`;
    html += `</div>`;
    html += `<div class="form-group">`;
    html += `<label>Place of Death 📍</label>`;
    html += `<input type="text" placeholder="City, State, Country" value="${escapeHtml(getFieldValue(familyRow, 'DEAT', 'PLAC'))}" onchange="updateNestedField(this, 'DEAT', 'PLAC')">`;
    html += `</div>`;
    html += `</div>`;
    html += `</div>`;
    
    // Occupation - SECURITY: escape all user input values
    html += `<div class="form-group">`;
    html += `<label>Occupation</label>`;
    html += `<input type="text" placeholder="e.g., Software Engineer" value="${escapeHtml(getFieldValue(familyRow, 'OCCU'))}" onchange="updatePersonField(this, 'OCCU')">`;
    html += `</div>`;
    
    // Company
    html += `<div class="form-group">`;
    html += `<label>Company/Employer</label>`;
    html += `<input type="text" placeholder="Where they work" value="${escapeHtml(getFieldValue(familyRow, '_COMPANY'))}" onchange="updatePersonField(this, '_COMPANY')">`;
    html += `</div>`;
    
    // Education
    html += `<div class="form-group">`;
    html += `<label>Education</label>`;
    html += `<input type="text" placeholder="e.g., MBA, Harvard" value="${escapeHtml(getFieldValue(familyRow, 'EDUC'))}" onchange="updatePersonField(this, 'EDUC')">`;
    html += `</div>`;
    
    // Religion
    html += `<div class="form-group">`;
    html += `<label>Religion</label>`;
    html += `<input type="text" placeholder="e.g., Christian, Hindu" value="${escapeHtml(getFieldValue(familyRow, 'RELI'))}" onchange="updatePersonField(this, 'RELI')">`;
    html += `</div>`;
    
    // Blood Group
    html += `<div class="form-group">`;
    html += `<label>Blood Group</label>`;
    html += `<select onchange="updatePersonField(this, '_BLOODGRP')">`;
    html += `<option value="">-- Select --</option>`;
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const currentBlood = getFieldValue(familyRow, '_BLOODGRP');
    bloodGroups.forEach(bg => {
        html += `<option value="${bg}" ${currentBlood === bg ? 'selected' : ''}>${bg}</option>`;
    });
    html += `</select>`;
    html += `</div>`;
    
    // Notes
    html += `<div class="form-group">`;
    html += `<label>Notes</label>`;
    html += `<textarea placeholder="Any additional notes..." onchange="updatePersonField(this, 'NOTE')">${escapeHtml(getFieldValue(familyRow, 'NOTE'))}</textarea>`;
    html += `</div>`;
    
    // Custom field adder
    html += optionToAddNewNode();
    
    // Delete Person (danger zone)
    html += `<div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--danger);">`;
    html += `<label style="font-weight:700; font-size:0.85rem; color:var(--danger); margin-bottom:8px; display:block;">⚠️ Danger Zone</label>`;
    html += `<button class="btn-danger btn-sm" onclick="if(confirm('Are you sure you want to delete this person? This cannot be undone.')) deleteNode()" style="width:100%">🗑 Delete This Person</button>`;
    html += `</div>`;
    
    return html;
}

function generateFamilyView(familyRow) {
    const rootFamilyRow = findRoot(document.dataParsed);
    let html = '';
    
    html += `<div style="margin-bottom:16px;">`;
    html += `<h3 style="margin:0 0 4px 0; font-size:1.1rem;">👨‍👩‍👧 Family ${escapeHtml(familyRow.id)}</h3>`;
    html += `<p style="margin:0; color:#64748b; font-size:0.85rem;">Family Record</p>`;
    html += `</div>`;
    
    // Show Husband(s)
    html += `<div class="form-group">`;
    html += `<label>👨 Husband</label>`;
    if (familyRow.HUSB) {
        const husbList = Array.isArray(familyRow.HUSB) ? familyRow.HUSB : [familyRow.HUSB];
        husbList.forEach(h => {
            const person = rootFamilyRow?.indviduals?.get(h.id);
            const name = person ? escapeHtml(getFieldValue(person, 'NAME').replace(/\//g, ' ').trim()) : h.id;
            html += `<div class="family-member-item" style="margin-top:4px;" onclick="goToFamilyMember('${escapeHtml(h.id)}', false)">`;
            html += `<span class="family-member-icon">👨</span>`;
            html += `<span class="family-member-name">${name || h.id}</span>`;
            html += `</div>`;
        });
    } else {
        html += `<div style="color:var(--text-muted);font-style:italic;padding:8px 0;">No husband linked</div>`;
    }
    html += `</div>`;
    
    // Show Wife/Wives
    html += `<div class="form-group">`;
    html += `<label>👩 Wife</label>`;
    if (familyRow.WIFE) {
        const wifeList = Array.isArray(familyRow.WIFE) ? familyRow.WIFE : [familyRow.WIFE];
        wifeList.forEach(w => {
            const person = rootFamilyRow?.indviduals?.get(w.id);
            const name = person ? escapeHtml(getFieldValue(person, 'NAME').replace(/\//g, ' ').trim()) : w.id;
            html += `<div class="family-member-item" style="margin-top:4px;" onclick="goToFamilyMember('${escapeHtml(w.id)}', false)">`;
            html += `<span class="family-member-icon">👩</span>`;
            html += `<span class="family-member-name">${name || w.id}</span>`;
            html += `</div>`;
        });
    } else {
        html += `<div style="color:var(--text-muted);font-style:italic;padding:8px 0;">No wife linked</div>`;
    }
    html += `</div>`;
    
    // Marriage Date & Place
    html += `<div style="margin:16px 0; padding:12px; background:var(--bg-light); border-radius:8px; border:1px solid var(--border);">`;
    html += `<label style="font-weight:700; display:block; margin-bottom:10px;">💍 Marriage Details</label>`;
    
    html += `<div class="form-group" style="margin-bottom:10px;">`;
    html += `<label style="font-size:0.85rem;">Marriage Date</label>`;
    html += `<div style="display:flex;gap:8px;align-items:center;">`;
    html += `<input type="text" id="marrDateInput" placeholder="e.g., 1582, NOV 1582, 28 NOV 1582" value="${escapeHtml(getFieldValue(familyRow, 'MARR', 'DATE'))}" onchange="updateFamilyNestedField(this, 'MARR', 'DATE')" style="flex:1;">`;
    html += `<button type="button" class="btn-outline btn-sm" onclick="openDatePicker('marrDateInput')" title="Open date picker" style="padding:8px 12px;white-space:nowrap;">📅</button>`;
    html += `</div>`;
    html += `</div>`;
    
    html += `<div class="form-group" style="margin-bottom:0;">`;
    html += `<label style="font-size:0.85rem;">Marriage Place</label>`;
    html += `<input type="text" placeholder="City, State, Country" value="${escapeHtml(getFieldValue(familyRow, 'MARR', 'PLAC'))}" onchange="updateFamilyNestedField(this, 'MARR', 'PLAC')">`;
    html += `</div>`;
    html += `</div>`;
    
    // Show Children
    html += `<div class="form-group">`;
    html += `<label>👶 Children</label>`;
    if (familyRow.CHIL) {
        const childList = Array.isArray(familyRow.CHIL) ? familyRow.CHIL : [familyRow.CHIL];
        childList.forEach(c => {
            const person = rootFamilyRow?.indviduals?.get(c.id);
            const name = person ? escapeHtml(getFieldValue(person, 'NAME').replace(/\//g, ' ').trim()) : c.id;
            const gender = person ? getFieldValue(person, 'SEX') : '';
            html += `<div class="family-member-item" style="margin-top:4px;" onclick="goToFamilyMember('${escapeHtml(c.id)}', false)">`;
            html += `<span class="family-member-icon">${gender === 'M' ? '👦' : gender === 'F' ? '👧' : '👶'}</span>`;
            html += `<span class="family-member-name">${name || c.id}</span>`;
            html += `</div>`;
        });
    } else {
        html += `<div style="color:var(--text-muted);font-style:italic;padding:8px 0;">No children linked</div>`;
    }
    html += `</div>`;
    
    // Add child option
    html += `<hr style="margin:16px 0;">`;
    html += `<div style="padding:12px; background:var(--bg-light); border-radius:8px; border:1px solid var(--border);">`;
    html += `<label style="font-weight:700; display:block; margin-bottom:10px;">➕ Add New Child</label>`;
    html += `<div class="form-group" style="margin-bottom:10px;">`;
    html += `<label style="font-size:0.85rem;">Child's Name</label>`;
    html += `<input type="text" id="newNodeNameValue" placeholder="Enter name">`;
    html += `</div>`;
    html += `<div class="form-group" style="margin-bottom:10px;">`;
    html += `<label style="font-size:0.85rem;">Gender</label>`;
    html += `<div class="radio-group">`;
    html += `<label><input type="radio" name="newNodeGender" value="M"> 👦 Male</label>`;
    html += `<label><input type="radio" name="newNodeGender" value="F"> 👧 Female</label>`;
    html += `</div></div>`;
    html += `<button class="btn-secondary btn-sm" onclick="addNewNode('${child}')" style="width:100%;">👶 Add Child</button>`;
    html += `</div>`;
    
    html += `<hr style="margin:16px 0;"><button class="btn-danger btn-sm" onclick="deleteNode()" style="width:100%">🗑 Delete Family</button>`;
    
    return html;
}

function optionToAddNewNode() {
    let len = document.currentlySelectedFamilyRow.length;
    
    let formHtml = "<details style='margin-top:12px;'><summary style='cursor:pointer; font-weight:600; color:var(--text-muted); font-size:0.85rem;'>+ Add Custom Field</summary>";
    formHtml += "<div style='padding-top:12px;'>";
    
    formHtml += "<div class='form-group'>";
    formHtml += "<label for='parentNode'>Attach to</label>";
    formHtml += "<select id='parentNodeInCurrentlySelectedFamilyRow' name='parentNode'>";
    for (let i = 0; i < len; i++) {
        formHtml += `<option value="${i}">${document.currentlySelectedFamilyRow[i].tag}</option>`;
    }
    formHtml += "</select></div>";
    
    formHtml += "<div class='form-row'>";
    formHtml += "<div class='form-group'><label>Field</label>";
    formHtml += "<input type='text' id='newNodeName' placeholder='e.g. OCCU' oninput='this.value = this.value.toUpperCase()'></div>";
    formHtml += "<div class='form-group'><label>Value</label>";
    formHtml += "<input type='text' id='newNodeValue' placeholder='e.g. Farmer'></div>";
    formHtml += "</div>";

    formHtml += "<button class='btn-primary btn-sm' onclick='handleNodeValueWithNewNode(document.getElementById(\"parentNodeInCurrentlySelectedFamilyRow\").value, document.getElementById(\"newNodeName\").value, document.getElementById(\"newNodeValue\").value)'>Add Field</button>";
    formHtml += "</div></details>";
    return formHtml;
}

function handleFamilyRow(nestedRow, key) {
    let result = "";
    let valueForInput = nestedRow.value ? nestedRow.value : (nestedRow.id ? nestedRow.id : "");
    let onChangeOrDisable;
    let fieldLabel = formatFieldLabel(key);
    
    if (nonEditableFields.includes(key)) {
        onChangeOrDisable = "disabled style='background:#f1f5f9;'";
    } else {
        let newCacheIndex = document.currentlySelectedFamilyRow.length;
        document.currentlySelectedFamilyRow.push(nestedRow);
        onChangeOrDisable = `onchange="handleNodeValueChange('${key}', event, ${newCacheIndex})"`;
    }
    
    result += `<div class="form-group">`;
    result += `<label for="${key}">${fieldLabel}</label>`;
    result += `<input ${onChangeOrDisable} type="text" id="${key}" name="${key}" value="${valueForInput}">`;
    result += showAllValuesAndChildValues1(nestedRow);
    result += `</div>`;
    return result;
}

function formatFieldLabel(key) {
    const labels = {
        'NAME': 'Full Name',
        'GIVN': 'Given Name',
        'SURN': 'Surname',
        'SEX': 'Gender',
        'BIRT': 'Birth',
        'DEAT': 'Death',
        'DATE': 'Date',
        'PLAC': 'Place',
        'OCCU': 'Occupation',
        'MARR': 'Marriage',
        'DIV': 'Divorce',
        'NOTE': 'Notes',
        'IMG': 'Photo',
        'RESI': 'Residence',
        'EDUC': 'Education',
        'GRAD': 'Graduation',
        'EMIG': 'Emigration',
        'IMMI': 'Immigration',
        'NATU': 'Naturalization',
        'MILI': 'Military Service',
        'RELI': 'Religion',
        'BURI': 'Burial',
        'CREM': 'Cremation',
        'CHR': 'Christening',
        'BAPM': 'Baptism',
        'CONF': 'Confirmation',
        'ORDN': 'Ordination',
        'CENS': 'Census',
        'WILL': 'Will',
        'PROB': 'Probate',
        'TITL': 'Title',
        'SOUR': 'Source'
    };
    return labels[key] || key;
}

// Available event types for quick adding
const eventTypes = [
    { tag: 'BIRT', label: 'Birth', hasDatePlace: true },
    { tag: 'DEAT', label: 'Death', hasDatePlace: true },
    { tag: 'BURI', label: 'Burial', hasDatePlace: true },
    { tag: 'CHR', label: 'Christening', hasDatePlace: true },
    { tag: 'BAPM', label: 'Baptism', hasDatePlace: true },
    { tag: 'MARR', label: 'Marriage', hasDatePlace: true },
    { tag: 'DIV', label: 'Divorce', hasDatePlace: true },
    { tag: 'RESI', label: 'Residence', hasDatePlace: true },
    { tag: 'OCCU', label: 'Occupation', hasValue: true },
    { tag: 'EDUC', label: 'Education', hasValue: true },
    { tag: 'GRAD', label: 'Graduation', hasDatePlace: true },
    { tag: 'EMIG', label: 'Emigration', hasDatePlace: true },
    { tag: 'IMMI', label: 'Immigration', hasDatePlace: true },
    { tag: 'NATU', label: 'Naturalization', hasDatePlace: true },
    { tag: 'MILI', label: 'Military', hasDatePlace: true },
    { tag: 'CENS', label: 'Census', hasDatePlace: true },
    { tag: 'NOTE', label: 'Note', hasValue: true },
    { tag: 'SOUR', label: 'Source', hasValue: true }
];

function getEventTypesList() {
    return eventTypes;
}

/**
 * Calculate age at a given date
 * @param {string} birthDate - Birth date string
 * @param {string} eventDate - Event date string
 * @returns {number|null} Age in years or null if cannot calculate
 */
function calculateAge(birthDate, eventDate) {
    const birthYear = extractYearFromDate(birthDate);
    const eventYear = extractYearFromDate(eventDate);
    
    if (!birthYear || !eventYear) return null;
    return eventYear - birthYear;
}

/**
 * Extract year from GEDCOM date string
 * @param {string} dateStr - Date string like "23 APR 1564" or "ABT 1850"
 * @returns {number|null} Year or null
 */
function extractYearFromDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/\b(\d{4})\b/);
    return match ? parseInt(match[1]) : null;
}

/**
 * Format GEDCOM date for display with age calculation
 * @param {Object} familyRow - Person object
 * @param {string} eventDate - Event date
 * @returns {string} Date with optional age
 */
function formatDateWithAge(familyRow, eventDate) {
    if (!familyRow || !familyRow.BIRT?.DATE?.value) return eventDate;
    const age = calculateAge(familyRow.BIRT.DATE.value, eventDate);
    if (age !== null && age >= 0 && age < 120) {
        return `${eventDate} (age ${age})`;
    }
    return eventDate;
}

function showAllValuesAndChildValues1(familyRow) {
    let result = "<div class='familyNodeDetails'>";
    for (let key in familyRow) {
        let value = familyRow[key];
        if (familyRow.hasOwnProperty(key) && !hiddenFields.includes(key)) {
            if (Array.isArray(value)) {
                value.forEach(nestedRow => {
                    if (nestedRow.constructor.name === 'FamilyRow') {
                        result += handleFamilyRow(nestedRow, key);
                    }
                });
            } else if (value.constructor.name === 'FamilyRow') {
                result += handleFamilyRow(value, key);
            }
        }
    }
    result += "</div>";
    return result;
}

function handleNodeValueChange(key, event, familyRowNum) {
    let familyRow = document.currentlySelectedFamilyRow[familyRowNum];
    let newValue = event.target.value;
    console.log(`Change on ${key} - ${newValue} with familyRow1: ${familyRowNum} with familyRow:`, familyRow);
    familyRow.value = newValue;
}

function handleNodeValueWithNewNode(familyRowNum, tag, newValue) {
    let familyRow = document.currentlySelectedFamilyRow[familyRowNum];
    familyRow[tag] = new FamilyRow(parseInt(familyRow.level) + 1, null, tag, newValue);
    familyRow[tag].parent = familyRow;
    console.log(`Adding new node ${tag} - ${newValue} with row num: ${familyRowNum} with familyRow:`, familyRow);
    displayFileContent(document.currentlySelectedFamilyRow[0]);
}

function handleImgFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // SECURITY: Validate image file before processing
    const validation = validateImageFile(file);
    if (!validation.valid) {
        alert('Image Upload Error: ' + validation.error);
        event.target.value = ''; // Clear the file input
        return;
    }
    
    // Open crop modal instead of directly saving
    if (window.openCropModal) {
        window.openCropModal(file);
    } else {
        // Fallback if crop modal not available
        saveImageDirectly(file);
    }
    
    // Clear the input so the same file can be selected again
    event.target.value = '';
}

// Fallback function to save image without cropping
function saveImageDirectly(file) {
    const reader = new FileReader();
    reader.onload = function (loadEvent) {
        const base64String = loadEvent.target.result;
        
        // SECURITY: Double-check the data URL format
        const allowedPrefixes = [
            'data:image/jpeg;base64,',
            'data:image/jpg;base64,',
            'data:image/png;base64,',
            'data:image/gif;base64,',
            'data:image/webp;base64,'
        ];
        
        const isValidDataUrl = allowedPrefixes.some(prefix => 
            base64String.toLowerCase().startsWith(prefix)
        );
        
        if (!isValidDataUrl) {
            alert('Invalid image format detected. Please use JPEG, PNG, GIF, or WebP.');
            return;
        }
        
        applyImageToCurrentPerson(base64String);
    };
    
    reader.onerror = function() {
        alert('Failed to read image file.');
    };
    
    reader.readAsDataURL(file);
}

// Apply the final image (cropped or original) to the current person
function applyImageToCurrentPerson(base64String) {
    const currentFamilyRow = document.currentlySelectedFamilyRow[0];
    if (!currentFamilyRow) return;
    
    let imgTag = currentFamilyRow['IMG'];
    if (!imgTag) {
        imgTag = new FamilyRow(1, undefined, "IMG", base64String);
        currentFamilyRow['IMG'] = imgTag;
    } else {
        imgTag.value = base64String;
    }
    
    // Refresh the display
    displayFileContent(currentFamilyRow);
    
    // Update the diagram node if available
    if (window.updateAllNodesData) {
        window.updateAllNodesData();
    }
}

// Export for use by crop modal
window.applyImageToCurrentPerson = applyImageToCurrentPerson;

function deleteFromMap(families, id) {
    return families.delete(id);
}

function findIndexFromArray(arrayWithId, id) {
    return arrayWithId.findIndex((element) => element.id === id);
}

function deleteIDFromArray(arrayWithId, id) {
    let index = findIndexFromArray(arrayWithId, id);
    if (index > -1) {
        return arrayWithId.splice(index, 1);
    }
    return []
}

function isEmptyFamily(familyRow) {
    if (familyRow.CHIL && familyRow.CHIL.length > 0) {
        return false;
    }
    if (familyRow.HUSB && familyRow.HUSB.length > 0) {
        return false;
    }
    if (familyRow.WIFE && familyRow.WIFE.length > 0) {
        return false;
    }
    return true;
}

function clearFromFam(id, rootFamilyRow) {
    rootFamilyRow.FAM.forEach((familyRow) => {
        let updated = false;
        if (familyRow.CHIL && Array.isArray(familyRow.CHIL)) {
            if(deleteIDFromArray(familyRow.CHIL, id).length > 0) {
                updated = true;
            }
        } else if (familyRow.CHIL && familyRow.CHIL.id === id) {
            delete familyRow.CHIL;
            updated = true;
        }
        if (familyRow.HUSB && Array.isArray(familyRow.HUSB)) {
            if(deleteIDFromArray(familyRow.HUSB, id).length > 0) {
                updated = true;
            }
        } else if (familyRow.HUSB && familyRow.HUSB.id === id) {
            delete familyRow.HUSB;
            updated = true;
        }
        if (familyRow.WIFE && Array.isArray(familyRow.WIFE)) {
            if(deleteIDFromArray(familyRow.WIFE, id).length > 0) {
                updated = true;
            }
        } else if (familyRow.WIFE && familyRow.WIFE.id === id) {
            delete familyRow.WIFE;
            updated = true;
        }
        if (updated) {
            console.log("Updated familyRow: ", familyRow);
            if(isEmptyFamily(familyRow)) {
                deleteFam(familyRow, rootFamilyRow);
            }
        }
    });
}

function clearFromIndi(id, rootFamilyRow) {
    rootFamilyRow.INDI.forEach((indiRow) => {
        let updated = false;
        if (indiRow.FAMC && Array.isArray(indiRow.FAMC)) {
            if (deleteIDFromArray(indiRow.FAMC, id).length > 0) {
                updated = true;
            }
        } else if (indiRow.FAMC && indiRow.FAMC.id === id) {
            delete indiRow.FAMC;
            updated = true;
        }
        if (indiRow.FAMS && Array.isArray(indiRow.FAMS)) {
            if(deleteIDFromArray(indiRow.FAMS, id).length > 0) {
                updated = true;
            }
        } else if (indiRow.FAMS && indiRow.FAMS.id === id) {
            delete indiRow.FAMS;
            updated = true;
        }
        if (updated) {
            console.log("Updated indiRow: ", indiRow);
            // if(isOrphan(indiRow)) {
            //     deleteIndi(indiRow, rootFamilyRow);
            // }
        }
    });
}

function deleteIndi(indiRow, rootFamilyRow) {
    deleteFromMap(rootFamilyRow.indviduals, indiRow.id);
    deleteIDFromArray(rootFamilyRow.INDI, indiRow.id);
    clearFromFam(indiRow.id, rootFamilyRow);
}

function deleteFam(familyRow, rootFamilyRow) {

    deleteFromMap(rootFamilyRow.families, familyRow.id);
    deleteIDFromArray(rootFamilyRow.FAM, familyRow.id);
    clearFromIndi(familyRow.id, rootFamilyRow);

}

function deleteNode() {
    if (confirm("Are you sure you want to delete this node? Please ensure leaf nodes are deleted first.")) {
        let familyRow = document.currentlySelectedFamilyRow[0];
        const rootFamilyRow = findRoot(document.dataParsed);
        if (familyRow.tag === 'INDI') {
            deleteIndi(familyRow, rootFamilyRow);
        } else if (familyRow.tag === 'FAM') {
            deleteFam(familyRow, rootFamilyRow);
        }
    } else {
        console.log("Deletion cancelled");
    }
}

// Update a simple field on the current person
function updatePersonField(input, tag, valueSuffix = '') {
    const familyRow = document.currentlySelectedFamilyRow[0];
    if (!familyRow) return;
    
    let newValue = input.value;
    if (tag === 'NAME') {
        // Clean up the name
        newValue = formatGedcomName(newValue);
    }
    
    if (familyRow[tag]) {
        familyRow[tag].value = newValue;
    } else {
        familyRow[tag] = new FamilyRow(1, null, tag, newValue);
        familyRow[tag].parent = familyRow;
    }
    
    console.log(`Updated ${tag} to: ${newValue}`);
    
    // If gender changed, update family relationships (HUSB <-> WIFE)
    if (tag === 'SEX' && familyRow.FAMS) {
        updateFamilyRolesOnGenderChange(familyRow, newValue);
    }
    
    // Update graph node immediately
    if (window.updateAllNodesData) {
        window.updateAllNodesData();
    }
    
    // Trigger auto-save
    if (window.triggerAutoSave) {
        window.triggerAutoSave();
    }
}

// Update HUSB/WIFE roles in families when person's gender changes
function updateFamilyRolesOnGenderChange(person, newGender) {
    const rootFamilyRow = findRoot(document.dataParsed);
    if (!rootFamilyRow) return;
    
    const personId = person.id;
    const famsList = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
    
    famsList.forEach(famsRef => {
        if (!famsRef || !famsRef.id) return;
        
        const family = rootFamilyRow.families.get(famsRef.id);
        if (!family) return;
        
        if (newGender === 'M') {
            // Changing to Male: remove from WIFE, add to HUSB
            removePersonFromRole(family, 'WIFE', personId);
            addPersonToRole(family, 'HUSB', personId);
            console.log(`Moved ${personId} from WIFE to HUSB in family ${family.id}`);
        } else if (newGender === 'F') {
            // Changing to Female: remove from HUSB, add to WIFE
            removePersonFromRole(family, 'HUSB', personId);
            addPersonToRole(family, 'WIFE', personId);
            console.log(`Moved ${personId} from HUSB to WIFE in family ${family.id}`);
        }
        // For 'O' (Other) gender, we leave the relationship as-is
    });
}

// Remove a person from a family role (HUSB or WIFE)
function removePersonFromRole(family, role, personId) {
    if (!family[role]) return;
    
    if (Array.isArray(family[role])) {
        const index = family[role].findIndex(r => r.id === personId);
        if (index > -1) {
            family[role].splice(index, 1);
            // If array is now empty, remove the property
            if (family[role].length === 0) {
                delete family[role];
            }
        }
    } else if (family[role].id === personId) {
        delete family[role];
    }
}

// Add a person to a family role (HUSB or WIFE)
function addPersonToRole(family, role, personId) {
    // Check if already in this role
    if (family[role]) {
        const existing = Array.isArray(family[role]) ? family[role] : [family[role]];
        if (existing.some(r => r.id === personId)) {
            return; // Already in this role
        }
        // Add to existing array
        if (Array.isArray(family[role])) {
            family[role].push(new FamilyRow(1, personId, role, undefined));
        } else {
            family[role] = [family[role], new FamilyRow(1, personId, role, undefined)];
        }
    } else {
        // Create new role entry
        family[role] = [new FamilyRow(1, personId, role, undefined)];
    }
}

// Update a nested field (e.g., BIRT/DATE, DEAT/PLAC)
function updateNestedField(input, parentTag, childTag, isDateField = false) {
    const familyRow = document.currentlySelectedFamilyRow[0];
    if (!familyRow) return;
    
    // Convert date from HTML format to GEDCOM format if needed
    let newValue = input.value;
    if (isDateField && input.type === 'date' && newValue) {
        newValue = convertFromDateInput(newValue);
    }
    
    // Ensure parent tag exists
    if (!familyRow[parentTag]) {
        familyRow[parentTag] = new FamilyRow(1, null, parentTag, null);
        familyRow[parentTag].parent = familyRow;
    }
    
    // Update or create child tag
    if (familyRow[parentTag][childTag]) {
        familyRow[parentTag][childTag].value = newValue;
    } else {
        familyRow[parentTag][childTag] = new FamilyRow(2, null, childTag, newValue);
        familyRow[parentTag][childTag].parent = familyRow[parentTag];
    }
    
    console.log(`Updated ${parentTag}/${childTag} to: ${newValue}`);
    
    // Update graph node immediately
    if (window.updateAllNodesData) {
        window.updateAllNodesData();
    }
    
    // Trigger auto-save
    if (window.triggerAutoSave) {
        window.triggerAutoSave();
    }
}

// Update a nested field on a Family record (e.g., MARR/DATE, MARR/PLAC)
function updateFamilyNestedField(input, parentTag, childTag) {
    const familyRow = document.currentlySelectedFamilyRow[0];
    if (!familyRow || familyRow.tag !== 'FAM') return;
    
    let newValue = input.value;
    
    // Ensure parent tag exists (e.g., MARR)
    if (!familyRow[parentTag]) {
        familyRow[parentTag] = new FamilyRow(1, null, parentTag, null);
        familyRow[parentTag].parent = familyRow;
    }
    
    // Update or create child tag (e.g., DATE, PLAC)
    if (familyRow[parentTag][childTag]) {
        familyRow[parentTag][childTag].value = newValue;
    } else {
        familyRow[parentTag][childTag] = new FamilyRow(2, null, childTag, newValue);
        familyRow[parentTag][childTag].parent = familyRow[parentTag];
    }
    
    console.log(`Updated Family ${parentTag}/${childTag} to: ${newValue}`);
    
    // Trigger auto-save
    if (window.triggerAutoSave) {
        window.triggerAutoSave();
    }
}

// Navigate to a family member (used when clicking on family member items)
// keepTab parameter: if true, keeps the Family tab open for the new person
function goToFamilyMember(personId, keepTab = true) {
    const rootFamilyRow = findRoot(document.dataParsed);
    if (!rootFamilyRow) return;
    
    const person = rootFamilyRow.indviduals.get(personId);
    if (person) {
        // First center on this person in the graph (so user sees it)
        if (window.centerOnSearchResult) {
            window.centerOnSearchResult(personId);
        }
        
        // Also update the focus person dropdown (hidden input and search display)
        const focusPersonSelect = document.getElementById('focusPerson');
        const focusPersonSearch = document.getElementById('focusPersonSearch');
        if (focusPersonSelect) {
            focusPersonSelect.value = personId;
        }
        if (focusPersonSearch && person.NAME) {
            const name = person.NAME.value ? person.NAME.value.replace(/\//g, '') : personId;
            focusPersonSearch.value = name;
        }
        
        // Then display their details (slight delay to let animation start)
        setTimeout(() => {
            displayFileContent(person);
            
            // If keepTab is true, switch to Family tab after content loads
            if (keepTab && window.switchTab) {
                const familyTabBtn = document.querySelector('.person-tab:nth-child(2)'); // Family is now 2nd tab
                if (familyTabBtn) {
                    window.switchTab('family', familyTabBtn);
                }
            }
        }, 50);
    }
}

// Expose functions to window for onclick handlers
if (typeof window !== 'undefined') {
    window.updatePersonField = updatePersonField;
    window.updateNestedField = updateNestedField;
    window.updateFamilyNestedField = updateFamilyNestedField;
    window.convertFromDateInput = convertFromDateInput;
    window.convertToDateInput = convertToDateInput;
    window.goToFamilyMember = goToFamilyMember;
    window.openDatePicker = openDatePicker;
    window.toggleDateFields = toggleDateFields;
    window.applyDatePicker = applyDatePicker;
    window.closeDatePickerModal = closeDatePickerModal;
}

export { 
    displayFileContent, 
    addNewNode, 
    handleNodeValueChange, 
    handleNodeValueWithNewNode, 
    deleteNode, 
    handleImgFileSelect,
    getEventTypesList,
    calculateAge,
    formatDateWithAge,
    updatePersonField,
    updateNestedField,
    updateFamilyNestedField
};