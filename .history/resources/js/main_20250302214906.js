// txt4GPT File Merger - Main JavaScript

// Global variables
let fileList = [];
let outputPath = '';
let defaultOutputPath = '';

// Initialize the application
async function init() {
    // Initialize Neutralino
    await Neutralino.init();

    // Set up event listeners
    setupEventListeners();
    
    // Set up drag and drop functionality
    setupDragAndDrop();
    
    // Set up sortable file list
    setupSortableList();
    
    // Initialize language preference
    initLanguagePreference();
    
    // Get default output path (app directory)
    try {
        const appInfo = await Neutralino.app.getConfig();
        // Try to get the current directory path
        try {
            defaultOutputPath = await Neutralino.os.getPath('current');
        } catch (pathError) {
            // Fallback to documents directory if current path fails
            defaultOutputPath = await Neutralino.os.getPath('documents');
            updateStatus('Using documents folder as default output path', 'warning');
        }
        outputPath = defaultOutputPath;
        document.getElementById('outputPath').value = outputPath;
    } catch (error) {
        updateStatus('Error getting default output path: ' + error.message, 'error');
    }
    
    // Register window close event
    Neutralino.events.on('windowClose', () => {
        Neutralino.app.exit();
    });
}

// Set up event listeners
function setupEventListeners() {
    // File input change event
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // Drop zone click event
    document.getElementById('dropZone').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    // Clear all button click event
    document.getElementById('clearAll').addEventListener('click', clearAllFiles);
    
    // Select folder button click event
    document.getElementById('selectFolder').addEventListener('click', selectOutputFolder);
    
    // Merge files button click event
    document.getElementById('mergeFiles').addEventListener('click', mergeFiles);
    
    // Language flag click events
    document.querySelectorAll('.language-flags .flag').forEach(flag => {
        flag.addEventListener('click', () => {
            const lang = flag.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
}

// Set up drag and drop functionality
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    // Remove highlight when dragging leaves drop zone
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('active');
    }
    
    function unhighlight() {
        dropZone.classList.remove('active');
    }
}

// Set up sortable file list
function setupSortableList() {
    const fileListElement = document.getElementById('fileList');
    new Sortable(fileListElement, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            // Update the fileList array based on the new order
            const items = fileListElement.querySelectorAll('li');
            const newFileList = [];
            
            items.forEach(item => {
                const index = parseInt(item.dataset.index);
                newFileList.push(fileList[index]);
            });
            
            fileList = newFileList;
            renderFileList(); // Re-render to update indices
        }
    });
}

// Handle file selection from input
async function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        await processFiles(files);
    }
}

// Handle dropped files
async function handleDrop(e) {
    const dt = e.dataTransfer;
    
    if (dt.files.length > 0) {
        try {
            // Pass the actual File objects directly to processFiles
            // instead of trying to extract paths that might not exist
            await processFiles(dt.files);
        } catch (error) {
            console.error('Error processing dropped files:', error);
            updateStatus('Error processing dropped files: ' + error.message, 'error');
        }
    }
}

// Process files from input or drop
async function processFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            // For browser-dropped files, file.path might not be a valid path that Neutralino can resolve
            // We'll handle this differently based on whether it's a File object or our custom object
            let filePath;
            let fileSize = file.size || 0;
            
            if (file instanceof File) {
                // This is a browser File object from drag and drop
                // We need to read the file content and save it temporarily
                const reader = new FileReader();
                const fileContent = await new Promise((resolve, reject) => {
                    reader.onload = (event) => resolve(event.target.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsText(file);
                });
                
                // Create a temporary file in the documents directory
                const tempFileName = `temp_${Date.now()}_${file.name}`;
                let appDir;
                try {
                    appDir = await Neutralino.os.getPath('documents');
                } catch (pathError) {
                    // Fallback to downloads directory if documents fails
                    try {
                        appDir = await Neutralino.os.getPath('downloads');
                    } catch (downloadError) {
                        throw new Error('Could not access documents or downloads directory');
                    }
                }
                const tempFilePath = `${appDir}/${tempFileName}`;
                
                // Write the content to the temporary file
                await Neutralino.filesystem.writeFile(tempFilePath, fileContent);
                filePath = tempFilePath;
            } else {
                // This is our custom object, likely from file input
                try {
                    // Try to get the absolute path
                    filePath = await Neutralino.filesystem.getPath(file.path);
                } catch (pathError) {
                    // If that fails, use the path as is
                    filePath = file.path;
                    console.warn(`Could not resolve absolute path for ${file.name}, using provided path`);
                }
            }
            
            fileList.push({
                name: file.name,
                path: filePath,
                size: formatFileSize(fileSize),
                type: getFileType(file.name)
            });
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            updateStatus(`Error adding file ${file.name}: ${error.message}`, 'error');
        }
    }
    
    renderFileList();
    updateStatus(`Added ${files.length} file(s) to the list`);
}

// Render the file list
function renderFileList() {
    const fileListElement = document.getElementById('fileList');
    fileListElement.innerHTML = '';
    
    if (fileList.length === 0) {
        updateStatus('No files added yet');
        return;
    }
    
    fileList.forEach((file, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        // Choose icon based on file type
        let iconClass = 'fa-file';
        if (file.type === 'pdf') iconClass = 'fa-file-pdf';
        else if (file.type === 'txt') iconClass = 'fa-file-alt';
        else if (file.type === 'html') iconClass = 'fa-file-code';
        
        fileInfo.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${file.name}</span>
            <small>(${file.size})</small>
        `;
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.className = 'danger-btn';
        deleteButton.addEventListener('click', () => removeFile(index));
        
        fileActions.appendChild(deleteButton);
        li.appendChild(fileInfo);
        li.appendChild(fileActions);
        fileListElement.appendChild(li);
    });
    
    updateStatus(`${fileList.length} file(s) ready to merge`);
}

// Remove a file from the list
function removeFile(index) {
    fileList.splice(index, 1);
    renderFileList();
}

// Clear all files from the list
function clearAllFiles() {
    fileList = [];
    renderFileList();
    updateStatus('All files cleared');
}

// Select output folder
async function selectOutputFolder() {
    try {
        const selection = await Neutralino.os.showFolderDialog('Select output folder');
        if (selection) {
            outputPath = selection;
            document.getElementById('outputPath').value = outputPath;
            updateStatus('Output folder selected: ' + outputPath);
        }
    } catch (error) {
        updateStatus('Error selecting folder: ' + error.message, 'error');
    }
}

// Merge files
async function mergeFiles() {
    if (fileList.length === 0) {
        updateStatus('No files to merge', 'error');
        return;
    }
    
    // Check which output formats are selected
    const formatCheckboxes = document.querySelectorAll('.format-options input[type="checkbox"]:checked');
    const selectedFormats = Array.from(formatCheckboxes).map(cb => cb.value);
    
    if (selectedFormats.length === 0) {
        updateStatus('Please select at least one output format', 'error');
        return;
    }
    
    updateStatus('Merging files...');
    
    try {
        // Create output folder if it doesn't exist
        const combinedFolderPath = `${outputPath}/połączone`;
        await createFolderIfNotExists(combinedFolderPath);
        
        // Generate output file names with sequential numbering
        const fileNumber = await getNextFileNumber(combinedFolderPath, selectedFormats);
        
        // Create output files
        if (selectedFormats.includes('txt')) {
            await createTxtOutputFile(combinedFolderPath, fileNumber);
        }
        
        if (selectedFormats.includes('html')) {
            await createHtmlOutputFile(combinedFolderPath, fileNumber);
        }
        
        updateStatus('Files merged successfully!', 'success');
        
        // Show success message
        await Neutralino.os.showMessageBox('Success', 'Files merged successfully!');
        
    } catch (error) {
        updateStatus('Error merging files: ' + error.message, 'error');
        await Neutralino.os.showMessageBox('Error', 'Error merging files: ' + error.message);
    }
}

// Create folder if it doesn't exist
async function createFolderIfNotExists(folderPath) {
    try {
        await Neutralino.filesystem.readDirectory(folderPath);
    } catch (error) {
        // Folder doesn't exist, create it
        await Neutralino.filesystem.createDirectory(folderPath);
    }
}

// Get the next available file number
async function getNextFileNumber(folderPath, formats) {
    let fileNumber = 1;
    let fileExists = true;
    
    while (fileExists) {
        fileExists = false;
        const paddedNumber = String(fileNumber).padStart(3, '0');
        
        for (const format of formats) {
            const filePath = `${folderPath}/your_files_${paddedNumber}.${format}`;
            try {
                await Neutralino.filesystem.readFile(filePath);
                fileExists = true;
                break;
            } catch (error) {
                // File doesn't exist, continue checking other formats
            }
        }
        
        if (fileExists) {
            fileNumber++;
        }
    }
    
    return fileNumber;
}

// Create TXT output file
async function createTxtOutputFile(folderPath, fileNumber) {
    const paddedNumber = String(fileNumber).padStart(3, '0');
    const outputFilePath = `${folderPath}/your_files_${paddedNumber}.txt`;
    let content = '';
    
    for (const file of fileList) {
        try {
            // Ensure we have a valid file path
            if (!file.path) {
                throw new Error('Invalid file path');
            }
            
            // Use readBinaryFile instead of readFile for better compatibility
            let fileData = await Neutralino.filesystem.readBinaryFile(file.path);
            // Convert binary data to text
            let fileContent = new TextDecoder().decode(fileData);
            
            // Add file content to the output
            content += `# Plik: "${file.name}"
### Treść pliku:

${fileContent}

`;
            
            // Log success for debugging
            console.log(`Successfully read file: ${file.name}`);
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            updateStatus(`Error reading file ${file.name}: ${error.message}`, 'warning');
            content += `# Plik: "${file.name}"
### Treść pliku:

Error reading file: ${error.message}

`;
        }
    }
    
    await Neutralino.filesystem.writeFile(outputFilePath, content);
}

// Create HTML output file
async function createHtmlOutputFile(folderPath, fileNumber) {
    const paddedNumber = String(fileNumber).padStart(3, '0');
    const outputFilePath = `${folderPath}/your_files_${paddedNumber}.html`;
    
    let content = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Your Files</title>\n</head>\n<body>\n';
    
    for (const file of fileList) {
        try {
            // Ensure we have a valid file path
            if (!file.path) {
                throw new Error('Invalid file path');
            }
            
            // Use readBinaryFile instead of readFile for better compatibility
            let fileData = await Neutralino.filesystem.readBinaryFile(file.path);
            // Convert binary data to text
            let fileContent = new TextDecoder().decode(fileData);
            // Escape HTML special characters to prevent rendering issues
            fileContent = escapeHtml(fileContent);
            content += `<h1>Plik: "${file.name}"</h1>\n<h3>Treść pliku:</h3>\n<pre>${fileContent}</pre>\n`;
            
            // Log success for debugging
            console.log(`Successfully read file: ${file.name}`);
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            updateStatus(`Error reading file ${file.name}: ${error.message}`, 'warning');
            content += `<h1>Plik: "${file.name}"</h1>\n<h3>Treść pliku:</h3>\n<pre>Error reading file: ${error.message}</pre>\n`;
        }
    }
    
    content += '</body>\n</html>';
    await Neutralino.filesystem.writeFile(outputFilePath, content);
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper function to get file type from file name
function getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    return extension;
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update status message
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    
    // Reset classes
    statusElement.className = 'status-bar';
    
    // Add class based on message type
    if (type === 'error') {
        statusElement.style.color = 'var(--danger)';
    } else if (type === 'success') {
        statusElement.style.color = 'var(--success)';
    } else if (type === 'warning') {
        statusElement.style.color = 'orange';
    } else {
        statusElement.style.color = 'var(--text-secondary)';
    }
}

// Call init function when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Language switching functionality
function changeLanguage(lang) {
    // Highlight the selected language flag
    document.querySelectorAll('.language-flags .flag').forEach(flag => {
        if (flag.getAttribute('data-lang') === lang) {
            flag.classList.add('active');
        } else {
            flag.classList.remove('active');
        }
    });
    
    // Store the selected language preference
    localStorage.setItem('preferredLanguage', lang);
    
    // Update UI text based on selected language
    updateUILanguage(lang);
    
    updateStatus(`Language changed to ${lang.toUpperCase()}`, 'success');
}

// Update UI text based on selected language
function updateUILanguage(lang) {
    const translations = {
        'en': {
            'dropZoneText': 'Drop files here or click to select',
            'addedFiles': 'Added Files',
            'clearAll': 'Clear All',
            'outputFormat': 'Output Format',
            'textFormat': 'Text (.txt)',
            'htmlFormat': 'HTML (.html)',
            'outputFolder': 'Output Folder',
            'browse': 'Browse',
            'mergeFiles': 'Merge Files',
            'readyStatus': 'Ready to merge files'
        },
        'pl': {
            'dropZoneText': 'Upuść pliki tutaj lub kliknij, aby wybrać',
            'addedFiles': 'Dodane pliki',
            'clearAll': 'Wyczyść wszystko',
            'outputFormat': 'Format wyjściowy',
            'textFormat': 'Tekst (.txt)',
            'htmlFormat': 'HTML (.html)',
            'outputFolder': 'Folder wyjściowy',
            'browse': 'Przeglądaj',
            'mergeFiles': 'Połącz pliki',
            'readyStatus': 'Gotowy do łączenia plików'
        },
        'it': {
            'dropZoneText': 'Trascina i file qui o clicca per selezionare',
            'addedFiles': 'File aggiunti',
            'clearAll': 'Cancella tutto',
            'outputFormat': 'Formato di output',
            'textFormat': 'Testo (.txt)',
            'htmlFormat': 'HTML (.html)',
            'outputFolder': 'Cartella di output',
            'browse': 'Sfoglia',
            'mergeFiles': 'Unisci file',
            'readyStatus': 'Pronto per unire i file'
        }
    };
    
    // Default to English if the language is not supported
    const texts = translations[lang] || translations['en'];
    
    // Update text elements
    document.querySelector('#dropZone p').textContent = texts.dropZoneText;
    document.querySelector('.file-list-header h2').textContent = texts.addedFiles;
    document.querySelector('#clearAll').innerHTML = `<i class="fas fa-trash"></i> ${texts.clearAll}`;
    document.querySelector('.output-format h3').textContent = texts.outputFormat;
    
    // Fix checkbox labels
    const txtLabel = document.querySelector('label:has(#txtFormat)');
    if (txtLabel) {
        const txtCheckbox = txtLabel.querySelector('input');
        txtLabel.innerHTML = '';
        txtLabel.appendChild(txtCheckbox);
        txtLabel.appendChild(document.createTextNode(' ' + texts.textFormat));
    }
    
    const htmlLabel = document.querySelector('label:has(#htmlFormat)');
    if (htmlLabel) {
        const htmlCheckbox = htmlLabel.querySelector('input');
        htmlLabel.innerHTML = '';
        htmlLabel.appendChild(htmlCheckbox);
        htmlLabel.appendChild(document.createTextNode(' ' + texts.htmlFormat));
    }
    
    document.querySelector('.output-folder h3').textContent = texts.outputFolder;
    document.querySelector('#selectFolder').innerHTML = `<i class="fas fa-folder-open"></i> ${texts.browse}`;
    document.querySelector('#mergeFiles').innerHTML = `<i class="fas fa-file-export"></i> ${texts.mergeFiles}`;
    document.querySelector('#status').textContent = texts.readyStatus;
}

// Check for saved language preference on init
function initLanguagePreference() {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
        changeLanguage(savedLang);
    }
}

// Call init function when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
