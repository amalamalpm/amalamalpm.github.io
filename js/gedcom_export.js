import display from './gedcom.js';
const debugTrace = false; // SECURITY: Disabled for production
function exportToFile(content, fileName) {
    const link = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    link.href = URL.createObjectURL(file);
    link.download = fileName ? fileName : "sample.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}

function sanitizeFileName(fileName) {
    fileName = fileName ? fileName : "sample.gedcom";
    if (!fileName.endsWith(".gedcom")) {
        fileName += ".gedcom";
    }
    return fileName;
}

function createFileContent(familyRowHead) {

    familyRowHead = familyRowHead ? familyRowHead : document.dataParsed;
    familyRowHead = familyRowHead ? familyRowHead : display();

    // Process familyRowHead to create a gedcom file
    let first = "";
    let middle = "";
    let last = "";

    for (const key in familyRowHead) {
        if (key === 'parent') continue;
        if (debugTrace) console.log("Processing " + key);
        const value = familyRowHead[key];
        if (typeof value === 'object' && value !== null) {
            let valueTypeName = value.constructor.name
            if (valueTypeName === 'FamilyRow') {
                let valueString = createFileContentOne(value);
                if (key === 'HEAD') {
                    first += valueString;
                } else if (key === 'TRLR') {
                    last += valueString;
                } else {
                    middle += valueString;
                }
            } else if (valueTypeName === 'Array') {
                middle += createFileContentOne(value);
            } else {
                if (debugTrace) console.log("skipping" + valueTypeName);
            }
        } else {
            if (debugTrace) console.log(typeof value);
        }
    }

    return first + middle + last;
}

function createFileContentOne(familyRow) {
    let result = "";
    if (typeof familyRow === 'object' && familyRow !== null) {
        let valueTypeName = familyRow.constructor.name
        if (valueTypeName === 'FamilyRow') {
            result += familyRow.toString() + "\n";
            for (const key in familyRow) {
                if (key === 'parent') continue;
                if (debugTrace) console.log("Processing " + key);
                const value = familyRow[key];
                if (typeof value === 'object' && value !== null) {
                    let valueTypeName = value.constructor.name
                    if (valueTypeName === 'FamilyRow') {
                        result += createFileContentOne(value);
                    } else if (valueTypeName === 'Array') {
                        result += createFileContentOne(value);
                    } else {
                        if (debugTrace) console.log("skipping " + valueTypeName);
                    }
                } else {
                    if (debugTrace) console.log(typeof value);
                }
            }
        } else if (valueTypeName === 'Array') {
            familyRow.forEach(function (element) {
                result += createFileContentOne(element);
            });
        }
    }
    return result
}

const gedcomExport = function (familyRowHead, fileName) {
    if (debugTrace) console.log("here")
    const gedcomFile = createFileContent();
    if (debugTrace) console.log(gedcomFile);
    if (debugTrace) console.log("conversion completed")
    exportToFile(gedcomFile, sanitizeFileName(fileName));
}

/**
 * Export data as JSON
 */
function exportToJSON(fileName) {
    const gedcomData = document.dataParsed;
    if (!gedcomData) {
        alert('No data to export');
        return;
    }
    
    const jsonData = {
        exported: new Date().toISOString(),
        format: 'GEDCOM-JSON',
        version: '1.0',
        individuals: [],
        families: []
    };
    
    // Export individuals
    if (gedcomData.indviduals) {
        gedcomData.indviduals.forEach((person, id) => {
            const individual = {
                id: id,
                name: person.NAME?.value || null,
                givenName: person.NAME?.GIVN?.value || null,
                surname: person.NAME?.SURN?.value || null,
                sex: person.SEX?.value || null,
                birth: null,
                death: null,
                familyAsSpouse: [],
                familyAsChild: []
            };
            
            // Birth info
            if (person.BIRT) {
                individual.birth = {
                    date: person.BIRT.DATE?.value || null,
                    place: person.BIRT.PLAC?.value || null
                };
            }
            
            // Death info
            if (person.DEAT) {
                individual.death = {
                    date: person.DEAT.DATE?.value || null,
                    place: person.DEAT.PLAC?.value || null
                };
            }
            
            // Family references
            if (person.FAMS) {
                const fams = Array.isArray(person.FAMS) ? person.FAMS : [person.FAMS];
                individual.familyAsSpouse = fams.map(f => f.id);
            }
            if (person.FAMC) {
                const famc = Array.isArray(person.FAMC) ? person.FAMC : [person.FAMC];
                individual.familyAsChild = famc.map(f => f.id);
            }
            
            // Image
            if (person.IMG?.value) {
                individual.image = person.IMG.value;
            }
            
            jsonData.individuals.push(individual);
        });
    }
    
    // Export families
    if (gedcomData.families) {
        gedcomData.families.forEach((family, id) => {
            const fam = {
                id: id,
                husband: null,
                wife: null,
                children: [],
                marriage: null
            };
            
            if (family.HUSB) {
                const husb = Array.isArray(family.HUSB) ? family.HUSB : [family.HUSB];
                fam.husband = husb.map(h => h.id);
            }
            
            if (family.WIFE) {
                const wife = Array.isArray(family.WIFE) ? family.WIFE : [family.WIFE];
                fam.wife = wife.map(w => w.id);
            }
            
            if (family.CHIL) {
                const children = Array.isArray(family.CHIL) ? family.CHIL : [family.CHIL];
                fam.children = children.map(c => c.id);
            }
            
            if (family.MARR) {
                fam.marriage = {
                    date: family.MARR.DATE?.value || null,
                    place: family.MARR.PLAC?.value || null
                };
            }
            
            jsonData.families.push(fam);
        });
    }
    
    // Download
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `family-tree-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export { gedcomExport, createFileContent, exportToJSON };