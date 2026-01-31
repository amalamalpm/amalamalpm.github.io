/**
 * CSV Import Module
 * Parses CSV files and converts to GEDCOM format
 */

/**
 * Parse CSV text to array of objects
 * @param {string} csvText - CSV content
 * @returns {Array} Array of row objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header.toLowerCase().trim()] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse a single CSV line handling quotes
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  return values;
}

/**
 * Convert CSV rows to GEDCOM text
 * @param {Array} rows - Parsed CSV rows
 * @returns {string} GEDCOM format text
 */
function convertToGedcom(rows) {
  let gedcom = '';
  
  // Header
  gedcom += '0 HEAD\n';
  gedcom += '1 SOUR CSV Import\n';
  gedcom += '1 GEDC\n';
  gedcom += '2 VERS 5.5.1\n';
  gedcom += '2 FORM LINEAGE-LINKED\n';
  gedcom += '1 CHAR UTF-8\n';
  
  const individuals = new Map();
  const families = new Map();
  let indiCounter = 1;
  let famCounter = 1;
  
  // First pass: create individuals
  rows.forEach(row => {
    const name = row.name || row.fullname || '';
    if (!name) return;
    
    const id = `@I${String(indiCounter++).padStart(4, '0')}@`;
    individuals.set(name.toLowerCase(), {
      id,
      name,
      sex: (row.sex || row.gender || '').toUpperCase().charAt(0) || '',
      birthDate: row.birthdate || row.birth_date || row['birth date'] || '',
      birthPlace: row.birthplace || row.birth_place || row['birth place'] || '',
      deathDate: row.deathdate || row.death_date || row['death date'] || '',
      deathPlace: row.deathplace || row.death_place || row['death place'] || '',
      father: row.father || row.fathername || row['father name'] || '',
      mother: row.mother || row.mothername || row['mother name'] || '',
      spouse: row.spouse || row.spousename || row['spouse name'] || ''
    });
  });
  
  // Second pass: create family connections
  individuals.forEach((person, key) => {
    // Check if parents exist
    if (person.father || person.mother) {
      const fatherKey = person.father.toLowerCase();
      const motherKey = person.mother.toLowerCase();
      const famKey = `${fatherKey}|${motherKey}`;
      
      if (!families.has(famKey)) {
        const famId = `@F${String(famCounter++).padStart(3, '0')}@`;
        families.set(famKey, {
          id: famId,
          husband: individuals.get(fatherKey)?.id || null,
          wife: individuals.get(motherKey)?.id || null,
          children: []
        });
      }
      
      families.get(famKey).children.push(person.id);
      person.famc = families.get(famKey).id;
    }
    
    // Check if spouse exists
    if (person.spouse) {
      const spouseKey = person.spouse.toLowerCase();
      const spouse = individuals.get(spouseKey);
      if (spouse) {
        // Create or find family
        const famKey = person.sex === 'M' ? `${key}|${spouseKey}` : `${spouseKey}|${key}`;
        
        if (!families.has(famKey)) {
          const famId = `@F${String(famCounter++).padStart(3, '0')}@`;
          const husband = person.sex === 'M' ? person : spouse;
          const wife = person.sex === 'M' ? spouse : person;
          
          families.set(famKey, {
            id: famId,
            husband: husband.id,
            wife: wife.id,
            children: []
          });
        }
        
        person.fams = families.get(famKey).id;
      }
    }
  });
  
  // Output individuals
  individuals.forEach(person => {
    gedcom += `0 ${person.id} INDI\n`;
    gedcom += `1 NAME ${person.name}\n`;
    
    if (person.sex) {
      gedcom += `1 SEX ${person.sex}\n`;
    }
    
    if (person.birthDate || person.birthPlace) {
      gedcom += '1 BIRT\n';
      if (person.birthDate) gedcom += `2 DATE ${person.birthDate}\n`;
      if (person.birthPlace) gedcom += `2 PLAC ${person.birthPlace}\n`;
    }
    
    if (person.deathDate || person.deathPlace) {
      gedcom += '1 DEAT\n';
      if (person.deathDate) gedcom += `2 DATE ${person.deathDate}\n`;
      if (person.deathPlace) gedcom += `2 PLAC ${person.deathPlace}\n`;
    }
    
    if (person.famc) {
      gedcom += `1 FAMC ${person.famc}\n`;
    }
    
    if (person.fams) {
      gedcom += `1 FAMS ${person.fams}\n`;
    }
  });
  
  // Output families
  families.forEach(family => {
    gedcom += `0 ${family.id} FAM\n`;
    if (family.husband) gedcom += `1 HUSB ${family.husband}\n`;
    if (family.wife) gedcom += `1 WIFE ${family.wife}\n`;
    family.children.forEach(childId => {
      gedcom += `1 CHIL ${childId}\n`;
    });
  });
  
  // Trailer
  gedcom += '0 TRLR\n';
  
  return gedcom;
}

/**
 * Import CSV file
 * @param {File} file - CSV file object
 * @returns {Promise<string>} GEDCOM text
 */
async function importCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const rows = parseCSV(csvText);
        if (rows.length === 0) {
          reject(new Error('No data found in CSV file'));
          return;
        }
        const gedcom = convertToGedcom(rows);
        resolve(gedcom);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Get expected CSV columns
 * @returns {Array} Column definitions
 */
function getExpectedColumns() {
  return [
    { name: 'Name', required: true, description: 'Full name' },
    { name: 'Sex', required: false, description: 'M or F' },
    { name: 'BirthDate', required: false, description: 'Birth date' },
    { name: 'BirthPlace', required: false, description: 'Birth place' },
    { name: 'DeathDate', required: false, description: 'Death date' },
    { name: 'DeathPlace', required: false, description: 'Death place' },
    { name: 'Father', required: false, description: 'Father\'s name' },
    { name: 'Mother', required: false, description: 'Mother\'s name' },
    { name: 'Spouse', required: false, description: 'Spouse\'s name' }
  ];
}

export { parseCSV, convertToGedcom, importCSVFile, getExpectedColumns };
