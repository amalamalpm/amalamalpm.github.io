/**
 * GEDCOM Family Tree Editor
 * Copyright (c) 2024-2026 amalamalpm
 * Licensed under MIT License - see LICENSE.txt
 */

function handleGedComFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Return the promise so caller can await
        return importFile(file);
    }
    return Promise.resolve();
}

function importFile(file) {
    // Return a Promise that resolves when file is fully loaded
    return new Promise((resolve, reject) => {
        console.log("File selected:", file.name);
        const reader = new FileReader();
        reader.onload = function (e) {
            importGedComText(e.target.result);
            resolve();
        };
        reader.onerror = function(e) {
            reject(new Error('Failed to read file'));
        };
        reader.readAsText(file);
    });
}

function importGedComText(text) {
    // Your file handling logic here
    console.log("Text selected:", text);
    document.dataUnparsed = text.split('\n');
    document.dataParsed = false;
}


export { handleGedComFileSelect, importGedComText };
