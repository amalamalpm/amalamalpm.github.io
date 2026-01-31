
const NOT_SET = -1;
const INIT_LEVEL = -10;

class FamilyRow {
    constructor(level, id, tag, value) {
        if (level !== undefined && level !== null) this.level = level;
        if (id !== undefined && id !== null) this.id = id;
        if (tag !== undefined && tag !== null) this.tag = tag;
        if (value !== undefined && value !== null) this.value = value;
        this.indviduals = new Map();
        this.families = new Map();
        this.visited = false;
        this.rowLevel = NOT_SET;
    }
    //override function to String
    toString() {
        return (this.level !== undefined ? this.level : "") +
            ((this.level == 0 && this.id !== undefined) ? " " + this.id : "") +
            (this.tag !== undefined ? " " + this.tag : "") +
            ((this.level != 0 && this.id !== undefined) ? " " + this.id : "") +
            (this.value !== undefined ? " " + this.value : "");
    }

}

class RowInGraph {
    constructor() {
        this.length = 0;
        this.order = [];
    }
    /// add a new element to the row
    addAfter(newElement, existingElementInOrder) {
        let index = this.order.indexOf(existingElementInOrder);
        if (index > -1) {
            this.order.splice(index + 1, 0, newElement);
        } else {
            this.order.push(newElement);
        }
        this.length++;
    }
    addBefore(newElement, existingElementInOrder) {
        let index = this.order.indexOf(existingElementInOrder);
        if (index > -1) {
            this.order.splice(index, 0, newElement);
        } else {
            this.order.push(newElement);
        }
        this.length++;
    }
}
var orderInLevel = new Map();
var queueForNext = [];

const resetAll = function () {
    document.dataParsed = null;
    document.dataUnparsed = null;
}

function getIdFromNode(currentNode, tagName) {
    if (currentNode[tagName]) {
        let famId
        if (Array.isArray(currentNode[tagName])) {
            famId = currentNode[tagName][0].id;
        } else {
            famId = currentNode[tagName].id;
        }
        return famId
    }
    return null;
}

function findParentOfParent(gedcomParsedObject, currentNode) {
    let currentNodeParent = null;
    if (currentNode && currentNode.tag === 'INDI') {
        let parentFamily = getIdFromNode(currentNode, 'FAMC')
        if (parentFamily) {
            let fam = gedcomParsedObject.families.get(parentFamily)
            let parentId = getIdFromNode(fam, 'HUSB')
            if (parentId) {
                currentNodeParent = gedcomParsedObject.indviduals.get(parentId);
            }
            // if (!currentNodeParent) {
            //     parentId = getIdFromNode(fam, 'WIFE')
            // }
            // if (parentId) {
            //     currentNodeParent = gedcomParsedObject.indviduals.get(parentId);
            // }
        }
        if (currentNodeParent) {
            return findParentOfParent(gedcomParsedObject, currentNodeParent)
        } else {
            return currentNode;
        }
    } else {
        return null;
    }
}

const display = function () {
    const gedcomParsedObject = document.dataParsed ? document.dataParsed : parse();
    updateMapsForDisplay(gedcomParsedObject);

    document.dataParsed = gedcomParsedObject


    const firstOne = findParentOfParent(gedcomParsedObject, gedcomParsedObject.indviduals.values().next().value)

    if (firstOne) {
        firstOne.rowLevel = INIT_LEVEL;
        queueForNext.push(firstOne);
    } else {
        let errMsg = "Nothing to display";
        console.log(errMsg)
        alert(errMsg);
    }
    return calculateDisplayPositions(gedcomParsedObject);
};

function addNextElements(element, top) {
    let level = element.rowLevel;
    if (element.tag === 'FAM') {
        addElementsToQueue(element.HUSB, level, 'INDI', top);
        addElementsToQueue(element.WIFE, level, 'INDI', top);
        addElementsToQueue(element.CHIL, level + 1, 'INDI', top);
    } else if (element.tag === 'INDI') {
        addElementsToQueue(element.FAMS, level, 'FAM', top);
        addElementsToQueue(element.FAMC, level - 1, 'FAM', top);
    }
}

function addElementsToQueue(elements, level, tagType, top) {
    if (elements) {
        if (!Array.isArray(elements)) {
            elements = [elements];
        }

        let elementsToAdd = [];

        for (let element of elements) {
            if (element) {
                if (tagType === 'FAM') element =  top.families.get(element.id);
                else if (tagType === 'INDI') element =  top.indviduals.get(element.id);
                if (element && !element.visited) {
                    element.rowLevel = level;
                    elementsToAdd.push(element);
                }
            }
        }
        elementsToAdd.sort(function (a, b) {
            if (a.ORDER && b.ORDER) {
                return a.ORDER.value - b.ORDER.value;
            }
            return 0;
        });
        queueForNext.push(...elementsToAdd);
    }
}

function resetRowLevel() {
    // set minimum row number to zero and subtract the minimum from all row numbers
    let list = orderInLevel.keys();
    // find min from list
    let min = Math.min(...list);
    // subtract min from all
    let newMap = new Map();
    list = orderInLevel.keys();
    for (let key of list) {
        let orderList = orderInLevel.get(key);
        orderList.order.forEach(function (element) {
            element.rowLevel -= min
        })
        newMap.set(key - min, orderList);
    }
    orderInLevel = newMap;
}

function getVisitedElement(elementList, top) {
    if (elementList && elementList.length > 0) {
        for (const elem of elementList) {
            if (top.indviduals.get(elem.id).visited) {
                return top.indviduals.get(elem.id);
            }
        }
    }
    return null;
}

function idInList(id, elemList) {
    if (elemList && elemList.length > 0) {
        for (const elem of elemList) {
            if (elem.id === id) {
                return true;
            }
        }
    }
    return false;
}

function resetAndInitAll(top) {
    orderInLevel = new Map();
    top.visited = false;
    top.indviduals.forEach(function (indi) {
        indi.visited = false;
    });
    top.families.forEach(function (fam) {
        fam.visited = false;
    });
}

function calculateDisplayPositions(top) {
    resetAndInitAll(top)
    while (queueForNext.length > 0) {
        let element = queueForNext.shift();

        if (element.visited) continue;
        element.visited = true;
        let level = element.rowLevel;

        addNextElements(element, top);

        let prevElement = null;
        let nextElement = null;
        if (element.tag === 'FAM') {
            prevElement = getVisitedElement(element.HUSB, top)
            nextElement = getVisitedElement(element.WIFE, top)
        } else if (element.tag === 'INDI') {
            if (element.FAMS) {
                for(const elem of element.FAMS) {
                    let originalElem = top.families.get(elem.id)
                    if (originalElem) {
                        if (originalElem.visited) {
                            if (idInList(element.id, originalElem.HUSB)) {
                                nextElement = originalElem;
                            } else if (idInList(element.id, originalElem.WIFE)) {
                                prevElement = originalElem;
                            }
                            if (nextElement || prevElement) break;
                        }
                    } else {
                        let errorMsg = "Error in loaded data: No family node found in level 0 with id" + elem.id;
                        console.log(errorMsg);
                        alert(errorMsg);
                    }
                }
            }
        }
        let row = orderInLevel.get(level);
        if (!row) {
            row = new RowInGraph();
            orderInLevel.set(level, row);
        }
        if (prevElement) {
            row.addAfter(element, prevElement);
        } else {
            row.addBefore(element, nextElement);
        }
    }
    resetRowLevel();
    // orderInLevel = moveFamilyToNextRow(orderInLevel)
    console.log("result");
    console.log(orderInLevel);
    return orderInLevel;
}

function updateMapsForDisplay (top) {
    top.indviduals = new Map();
    if (Array.isArray(top.INDI)) {
        top.INDI.forEach(function (indi) {
            top.indviduals.set(indi.id, indi);
        });
    } else {
        top.INDI && top.indviduals.set(top.INDI.id, top.INDI);
    }

    top.families = new Map();
    if (Array.isArray(top.FAM)) {
        top.FAM && top.FAM.forEach(function (fam) {
            top.families.set(fam.id, fam);
        });
    } else {
        top.FAM && top.families.set(top.FAM.id, top.FAM);
    }
    return top;
}

var parse = function () {
    let element_top = formatLine("-1 TOP"),
        lastElement = element_top;
    let lines = document.dataUnparsed;
    if (!lines || lines.length === 0) {
        lines = ["0 HEAD","1 SOUR Amal's gedcom editor JS","2 WWW ","1 FILE Family Init","1 DATE 08 Mar 2025","1 DEST ANSTFILE","1 GEDC","2 VERS 5.5.1","2 FORM LINEAGE-LINKED","0 @I1@ INDI","1 NAME ","0 TRLR"];
        // lines = [ "0 HEAD","1 SOUR w1ebtreeprint.com","2 VERS 1.0","2 NAME w1ebtreeprint","1 DATE 25 OCT 2012","1 FILE bronte.ged","1 GEDC","2 VERS 5.5","2 FORM LINEAGE-LINKED","1 CHAR UTF-8","1 SUBM @SUB1@","0 @SUB1@ SUBM","1 NAME webTreePrint","0 @I0001@ INDI","1 NAME Patrick /Brontë/","2 GIVN Patrick","2 SURN Brontë","1 SEX M","1 BIRT","2 DATE 17 MAR 1777","2 PLAC County Down, Ireland","1 DEAT","2 DATE 7 JUN 1861","2 PLAC Haworth, Yorks.","1 ALIA Brunty","1 FAMC @F003@","1 FAMS @F001@","0 @I0002@ INDI","1 NAME Maria /Branwell/","2 GIVN Maria","2 SURN Branwell","1 SEX F","1 BIRT","2 DATE 15 APR 1783","2 PLAC Penzance, Cornwall","1 DEAT","2 DATE 15 SEP 1821","1 FAMC @F004@","1 FAMS @F001@","0 @I0003@ INDI","1 NAME Maria /Brontë/","2 GIVN Maria","2 SURN Brontë","1 SEX F","1 BIRT","2 DATE 23 APR 1814","2 PLAC Clough House, High Town","1 DEAT","2 DATE 6 MAY 1825","2 PLAC Howarth","1 FAMC @F001@","0 @I0004@ INDI","1 NAME Elizabeth /Brontë/","2 GIVN Elizabeth","2 SURN Brontë","1 SEX F","1 BIRT","2 DATE 8 FEB 1815","1 DEAT","2 DATE 15 JUN 1825","2 PLAC Howarth","1 FAMC @F001@","0 @I0005@ INDI","1 NAME Charlotte /Brontë/","2 GIVN Charlotte","2 SURN Brontë","1 SEX F","1 BIRT","2 DATE 21 APR 1816","2 PLAC Thornton, Nr. Bradford","1 DEAT","2 DATE 31 MAR 1855","2 PLAC Howarth","1 FAMC @F001@","1 FAMS @F002@","0 @I0006@ INDI","1 NAME Patrick Branwell /Brontë/","2 GIVN Patrick Branwell","2 SURN Brontë","1 SEX M","1 BIRT","2 DATE 26 JUN 1817","2 PLAC Thornton, Nr. Bradford","1 DEAT","2 DATE 24 SEP 1848","2 PLAC Howarth","1 FAMC @F001@","0 @I0007@ INDI","1 NAME Emily Jane /Brontë/","2 GIVN Emily Jane","2 SURN Brontë","1 SEX F","1 BIRT","2 DATE 30 JUL 1818","2 PLAC Thornton, Nr. Bradford","1 DEAT","2 DATE 19 DEC 1848","2 PLAC Howarth","1 FAMC @F001@","0 @I0008@ INDI","1 NAME Anne /Brontë/","2 GIVN Anne","2 SURN Brontë","1 SEX F","1 BIRT","2 DATE 17 JAN 1820","2 PLAC Thornton, Nr. Bradford","1 DEAT","2 DATE 28 MAY 1849","2 PLAC Scarborough","1 FAMC @F001@","0 @I0009@ INDI","1 NAME Arthur Bell /Nicholls/","2 GIVN Arthur Bell","2 SURN Nicholls","1 SEX M","1 FAMS @F002@","0 @I0010@ INDI","1 NAME Eleanor /McClory/","2 GIVN Eleanor","2 SURN McClory","1 SEX F","1 FAMS @F003@","0 @I0011@ INDI","1 NAME Hugh /Brunty/","2 GIVN Hugh","2 SURN Brunty","1 SEX M","1 BIRT","2 DATE 1755","1 DEAT","2 DATE abt 1808","1 FAMS @F003@","0 @I0012@ INDI","1 NAME Anne /Carne/","2 GIVN Anne","2 SURN Carne","1 SEX F","1 BIRT","2 DATE APR 1744","1 DEAT","2 DATE 19 DEC 1809","1 FAMS @F004@","0 @I0013@ INDI","1 NAME Thomas /Branwell/","2 GIVN Thomas","2 SURN Branwell","1 SEX M","1 BIRT","2 DATE 1746","1 DEAT","2 DATE 5 APR 1808","1 FAMS @F004@","0 @I0014@ INDI","1 NAME Elizabeth /Branwell/","2 GIVN Elizabeth","2 SURN Branwell","2 NICK Aunt","1 SEX F","1 BIRT","2 DATE 1776","1 DEAT","2 DATE 29 OCT 1842","1 FAMC @F004@","0 @F001@ FAM","1 HUSB @I0001@","1 WIFE @I0002@","1 MARR","2 DATE 29 December 1812","1 CHIL @I0003@","1 CHIL @I0004@","1 CHIL @I0005@","1 CHIL @I0006@","1 CHIL @I0007@","1 CHIL @I0008@","0 @F002@ FAM","1 HUSB @I0009@","1 WIFE @I0005@","1 MARR","2 DATE 29 JUN 1854","0 @F003@ FAM","1 HUSB @I0011@","1 WIFE @I0010@","1 MARR","2 DATE 1776","1 CHIL @I0001@","0 @F004@ FAM","1 HUSB @I0013@","1 WIFE @I0012@","1 MARR","2 DATE 1768","1 CHIL @I0002@","1 CHIL @I0014@","0 TRLR" ];
        document.dataUnparsed = lines;
    }

    lines.map(String)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .forEach(function (line) {
            const element = formatLine(line.trim());
            lastElement = parseLine(element, lastElement, element_top);
        });
    return element_top;
}

/*************************************
/* Private Functions
/*************************************/
function parseLine(element, lastElement) {
    var parent_elem = lastElement;
    while (parent_elem.level > element.level - 1) {
        parent_elem = parent_elem.parent;
    }

    var tag = parent_elem[element.tag];
    if (tag instanceof Array) {
        tag.push(element);
    } else if (tag) {
        parent_elem[element.tag] = [tag, element];
    } else if (element.tag === 'FAMS' || element.tag === 'FAMC' || element.tag === 'CHIL' || element.tag === 'HUSB' || element.tag === 'WIFE') {
        parent_elem[element.tag] = [element];
    } else {
        parent_elem[element.tag] = element;
    }
    // parent_elem.children.push(element);
    element.parent = parent_elem;
    return element;
}



function formatLine(line) {
    try {
        var split = line.split(' '),
            level = split.shift(),
            tmp = split.shift(),
            id = null,
            tag = null,
            value = null;

        if (tmp.charAt(0) === '@') {
            // line contains an id
            id = tmp;
            tmp = split.shift();
        }

        tag = tmp;
        if (split.length > 0) {
            value = split.join(' ');
            if (value.match(/@[^@]+@/)) {
                // contains a reference...
                // Family Tree Legends seems to put id in value some times, other times it will put it in id location...
                id = value;
                value = null;
            }
        }
    } catch (e) {
        console.log("Error while pasring line ->" + line + "<-");
    }
    return new FamilyRow(level, id, tag, value);
}

function insertToMapIfNotExists(map, id, value) {
    if (!map[id]) {
        map[id] = value;
    }
    return map[id];
}

// To print the object as string
let printObj = function (obj, i) {
    if (i>5) return '{"more":"..."}';
    let string = '';
    for (let prop in obj) {
        if (typeof obj[prop] == 'string') {
            string += prop + ': ' + obj[prop] + '; \n';
        }
        else {
            string += prop + ': { \n' + printObj(obj[prop], i+1) + '}';
        }
    }
    return string;
}

export { display as default, FamilyRow };
