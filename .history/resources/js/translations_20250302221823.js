// Translations for ContextLoom

const translations = {
    en: {
        // UI elements
        dropZoneText: "Drop files here or click to select",
        addedFiles: "Added Files",
        clearAll: "Clear All",
        outputFormat: "Output Format",
        outputFolder: "Output Folder",
        browse: "Browse",
        mergeFiles: "Merge Files",
        readyToMerge: "Ready to merge files",
        noFilesToMerge: "No files to merge",
        selectOutputFormat: "Please select at least one output format",
        mergingFiles: "Merging files...",
        mergeSuccess: "Files merged successfully!",
        defaultOutputPath: "Using documents folder as default output path",
        errorDefaultPath: "Error getting default output path: ",
        errorProcessingFiles: "Error processing dropped files: ",
        errorAddingFile: "Error adding file ",
        errorReadingFile: "Error reading file ",
        noFilesAdded: "No files added yet",
        filesAdded: " file(s) added to the list",
        filesReady: " file(s) ready to merge",
        allFilesCleared: "All files cleared",
        folderSelected: "Output folder selected: ",
        errorSelectingFolder: "Error selecting folder: ",
        errorMergingFiles: "Error merging files: ",

        // File markers
        fileMarker: "File: ",
        contentMarker: "File content:"
    },
    pl: {
        // UI elements
        dropZoneText: "Upuść pliki tutaj lub kliknij, aby wybrać",
        addedFiles: "Dodane pliki",
        clearAll: "Wyczyść wszystko",
        outputFormat: "Format wyjściowy",
        outputFolder: "Folder wyjściowy",
        browse: "Przeglądaj",
        mergeFiles: "Połącz pliki",
        readyToMerge: "Gotowy do połączenia plików",
        noFilesToMerge: "Brak plików do połączenia",
        selectOutputFormat: "Wybierz co najmniej jeden format wyjściowy",
        mergingFiles: "Łączenie plików...",
        mergeSuccess: "Pliki zostały pomyślnie połączone!",
        defaultOutputPath: "Używanie folderu dokumentów jako domyślnej ścieżki wyjściowej",
        errorDefaultPath: "Błąd podczas pobierania domyślnej ścieżki: ",
        errorProcessingFiles: "Błąd podczas przetwarzania plików: ",
        errorAddingFile: "Błąd podczas dodawania pliku ",
        errorReadingFile: "Błąd odczytu pliku ",
        noFilesAdded: "Nie dodano jeszcze plików",
        filesAdded: " plik(ów) dodano do listy",
        filesReady: " plik(ów) gotowych do połączenia",
        allFilesCleared: "Wszystkie pliki wyczyszczone",
        folderSelected: "Wybrano folder wyjściowy: ",
        errorSelectingFolder: "Błąd podczas wybierania folderu: ",
        errorMergingFiles: "Błąd podczas łączenia plików: ",

        // File markers
        fileMarker: "Plik: ",
        contentMarker: "Treść pliku:"
    },
    it: {
        // UI elements
        dropZoneText: "Trascina i file qui o clicca per selezionare",
        addedFiles: "File aggiunti",
        clearAll: "Cancella tutto",
        outputFormat: "Formato di output",
        outputFolder: "Cartella di output",
        browse: "Sfoglia",
        mergeFiles: "Unisci file",
        readyToMerge: "Pronto per unire i file",
        noFilesToMerge: "Nessun file da unire",
        selectOutputFormat: "Seleziona almeno un formato di output",
        mergingFiles: "Unione dei file in corso...",
        mergeSuccess: "File uniti con successo!",
        defaultOutputPath: "Utilizzo della cartella documenti come percorso di output predefinito",
        errorDefaultPath: "Errore durante il recupero del percorso predefinito: ",
        errorProcessingFiles: "Errore durante l'elaborazione dei file: ",
        errorAddingFile: "Errore durante l'aggiunta del file ",
        errorReadingFile: "Errore durante la lettura del file ",
        noFilesAdded: "Nessun file aggiunto",
        filesAdded: " file aggiunti all'elenco",
        filesReady: " file pronti per l'unione",
        allFilesCleared: "Tutti i file cancellati",
        folderSelected: "Cartella di output selezionata: ",
        errorSelectingFolder: "Errore durante la selezione della cartella: ",
        errorMergingFiles: "Errore durante l'unione dei file: ",

        // File markers
        fileMarker: "File: ",
        contentMarker: "Contenuto del file:"
    }
};

// Current language
let currentLanguage = 'en';

// Function to get translation
function getTranslation(key) {
    return translations[currentLanguage][key] || translations['en'][key];
}

// Function to change language
function changeLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        updateUITexts();
        // Update active flag styling
        document.querySelectorAll('.language-flags .flag').forEach(flag => {
            if (flag.getAttribute('data-lang') === lang) {
                flag.classList.add('active');
            } else {
                flag.classList.remove('active');
            }
        });
    }
}

// Function to update all UI texts
function updateUITexts() {
    // Update drop zone text
    document.querySelector('#dropZone p').textContent = getTranslation('dropZoneText');
    
    // Update headings
    document.querySelector('.file-list-header h2').textContent = getTranslation('addedFiles');
    document.querySelector('.output-format h3').textContent = getTranslation('outputFormat');
    document.querySelector('.output-folder h3').textContent = getTranslation('outputFolder');
    
    // Update buttons
    document.querySelector('#clearAll').innerHTML = `<i class="fas fa-trash"></i> ${getTranslation('clearAll')}`;
    document.querySelector('#selectFolder').innerHTML = `<i class="fas fa-folder-open"></i> ${getTranslation('browse')}`;
    document.querySelector('#mergeFiles').innerHTML = `<i class="fas fa-file-export"></i> ${getTranslation('mergeFiles')}`;
    
    // Update status if it's the default message
    const statusElement = document.getElementById('status');
    if (statusElement.textContent === 'Ready to merge files') {
        statusElement.textContent = getTranslation('readyToMerge');
    }
}

// Initialize language preference
function initLanguagePreference() {
    // Try to get language from localStorage or use browser language
    const savedLang = localStorage.getItem('preferredLanguage');
    const browserLang = navigator.language.split('-')[0];
    const defaultLang = savedLang || (translations[browserLang] ? browserLang : 'en');
    
    changeLanguage(defaultLang);
}