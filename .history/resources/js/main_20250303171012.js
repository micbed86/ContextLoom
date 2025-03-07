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
            updateStatus(getTranslation('defaultOutputPath'), 'warning');
        }
        outputPath = defaultOutputPath;
        document.getElementById('outputPath').value = outputPath;
    } catch (error) {
        updateStatus(getTranslation('errorDefaultPath') + error.message, 'error');
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
            // Save language preference
            localStorage.setItem('preferredLanguage', lang);
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
            updateStatus(getTranslation('errorProcessingFiles') + error.message, 'error');
        }
    }
}

// Extract text from PDF and Word documents
async function extractTextFromFile(file) {
    const fileType = getFileType(file.name);
    const reader = new FileReader();

    if (fileType === 'pdf') {
        try {
            const arrayBuffer = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            });

            const typedArray = new Uint8Array(arrayBuffer);
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
            return text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error(`Error extracting text from PDF: ${error.message}`);
        }
    } else if (fileType === 'docx' || fileType === 'doc') {
        try {
            const arrayBuffer = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsArrayBuffer(file);
            });

            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (error) {
            console.error('Error extracting text from Word document:', error);
            throw new Error(`Error extracting text from Word document: ${error.message}`);
        }
    }

    // For other file types, return null to use default text processing
    return null;
}

// Process files from input or drop
async function processFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            let filePath;
            let fileSize = file.size || 0;
            let fileContent;
            
            if (file instanceof File) {
                // Try to extract text from PDF or Word documents
                const extractedText = await extractTextFromFile(file);
                
                if (extractedText !== null) {
                    fileContent = extractedText;
                } else {
                    // For other file types, read as text
                    fileContent = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target.result);
                        reader.onerror = (error) => reject(error);
                        reader.readAsText(file);
                    });
                }
                
                // Create a temporary file in the documents directory
                const tempFileName = `temp_${Date.now()}_${file.name}`;
                let appDir;
                try {
                    appDir = await Neutralino.os.getPath('documents');
                } catch (pathError) {
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
                try {
                    filePath = await Neutralino.filesystem.getPath(file.path);
                } catch (pathError) {
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
            updateStatus(`${getTranslation('errorAddingFile')}${file.name}: ${error.message}`, 'error');
        }
    }
    
    renderFileList();
    updateStatus(`${files.length}${getTranslation('filesAdded')}`);
}

// Render the file list
function renderFileList() {
    const fileListElement = document.getElementById('fileList');
    fileListElement.innerHTML = '';
    
    if (fileList.length === 0) {
        updateStatus(getTranslation('noFilesAdded'));
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
    
    updateStatus(`${fileList.length}${getTranslation('filesReady')}`);
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
    updateStatus(getTranslation('allFilesCleared'));
}

// Select output folder
async function selectOutputFolder() {
    try {
        const selection = await Neutralino.os.showFolderDialog('Select output folder');
        if (selection) {
            outputPath = selection;
            document.getElementById('outputPath').value = outputPath;
            updateStatus(getTranslation('folderSelected') + outputPath);
        }
    } catch (error) {
        updateStatus(getTranslation('errorSelectingFolder') + error.message, 'error');
    }
}

// Merge files
async function mergeFiles() {
    if (fileList.length === 0) {
        updateStatus(getTranslation('noFilesToMerge'), 'error');
        return;
    }
    
    // Check which output formats are selected
    const formatCheckboxes = document.querySelectorAll('.format-options input[type="checkbox"]:checked');
    const selectedFormats = Array.from(formatCheckboxes).map(cb => cb.value);
    
    if (selectedFormats.length === 0) {
        updateStatus(getTranslation('selectOutputFormat'), 'error');
        return;
    }
    
    updateStatus(getTranslation('mergingFiles'));
    
    try {
        // Ensure output folder exists
        await createFolderIfNotExists(outputPath);
        
        // Generate output file names with sequential numbering
        const fileNumber = await getNextFileNumber(outputPath, selectedFormats);
        
        // Create output files
        if (selectedFormats.includes('txt')) {
            await createTxtOutputFile(outputPath, fileNumber);
        }
        
        if (selectedFormats.includes('html')) {
            await createHtmlOutputFile(outputPath, fileNumber);
        }
        
        updateStatus(getTranslation('mergeSuccess'), 'success');
        
        // Show success message
        await Neutralino.os.showMessageBox('Success', getTranslation('mergeSuccess'));
        
    } catch (error) {
        updateStatus(getTranslation('errorMergingFiles') + error.message, 'error');
        await Neutralino.os.showMessageBox('Error', getTranslation('errorMergingFiles') + error.message);
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
            const filePath = `${folderPath}/context_${paddedNumber}.${format}`;
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
    const outputFilePath = `${folderPath}/context_${paddedNumber}.txt`;
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
            content += `# ${getTranslation('fileMarker')}"${file.name}"
### ${getTranslation('contentMarker')}

${fileContent}

`;
            
            // Log success for debugging
            console.log(`Successfully read file: ${file.name}`);
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            updateStatus(`${getTranslation('errorReadingFile')}${file.name}: ${error.message}`, 'warning');
            content += `# ${getTranslation('fileMarker')}"${file.name}"
### ${getTranslation('contentMarker')}

Error reading file: ${error.message}

`;
        }
    }
    
    await Neutralino.filesystem.writeFile(outputFilePath, content);
}

// Create HTML output file
async function createHtmlOutputFile(folderPath, fileNumber) {
    const paddedNumber = String(fileNumber).padStart(3, '0');
    const outputFilePath = `${folderPath}/context_${paddedNumber}.html`;
    
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
            content += `<h1>${getTranslation('fileMarker')}"${file.name}"</h1>\n<h3>${getTranslation('contentMarker')}</h3>\n<pre>${fileContent}</pre>\n`;
            
            // Log success for debugging
            console.log(`Successfully read file: ${file.name}`);
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            updateStatus(`${getTranslation('errorReadingFile')}${file.name}: ${error.message}`, 'warning');
            content += `<h1>${getTranslation('fileMarker')}"${file.name}"</h1>\n<h3>${getTranslation('contentMarker')}</h3>\n<pre>Error reading file: ${error.message}</pre>\n`;
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to update status message
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    
    // Reset classes
    statusElement.classList.remove('error', 'warning', 'success');
    
    // Add appropriate class based on message type
    if (type === 'error') {
        statusElement.classList.add('error');
    } else if (type === 'warning') {
        statusElement.classList.add('warning');
    } else if (type === 'success') {
        statusElement.classList.add('success');
    }
}

// Initialize the application when the DOM is loaded
window.addEventListener('DOMContentLoaded', init);
