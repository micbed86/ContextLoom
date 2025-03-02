import os
import datetime
import tkinter as tk
from tkinter import filedialog, messagebox, Text, Scrollbar
import PyPDF2
import keyboard
import time

# Function to handle PDF files
def handle_pdf(file_path):
    pdf_text = ""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            pdf_text += page.extract_text()
    return pdf_text

# Function to merge files
def merge_files():
    source_folder = './pliki_do_połączenia'
    output_folder = './połączone'
    txt_output_name = 'your_files'
    html_output_name = 'your_files'
    txt_extension = '.txt'
    html_extension = '.html'

    # Create output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Create source folder if it doesn't exist
    if not os.path.exists(source_folder):
        os.makedirs(source_folder)

    # Check if the source folder contains any files
    while not any(os.path.isfile(os.path.join(source_folder, f)) for f in os.listdir(source_folder)):
        print(f'Katalog źródłowy [{source_folder}] nie zawiera plików. Brak plików do połączenia w dokument tekstowy. Dodaj pliki do połączenia i wciśnik Enter, aby sprawdzić zawartość katalogu ponownie. Wciśnij Spację, aby zamknąć program.')
        while True:
            if keyboard.is_pressed('enter'):
                time.sleep(0.5)
                break
            elif keyboard.is_pressed('space'):
                time.sleep(0.5)
                exit()

    # Find the next available file number for the output files
    file_number = 1
    while True:
        txt_output_file = f'{txt_output_name}_{str(file_number).zfill(3)}{txt_extension}'
        html_output_file = f'{html_output_name}_{str(file_number).zfill(3)}{html_extension}'
        if not os.path.exists(os.path.join(output_folder, txt_output_file)) and not os.path.exists(os.path.join(output_folder, html_output_file)):
            break
        file_number += 1

    # Open the output files for writing
    with open(os.path.join(output_folder, txt_output_file), 'w', encoding='utf-8') as txt_output, open(os.path.join(output_folder, html_output_file), 'w', encoding='utf-8') as html_output:
        # Write the HTML header
        html_output.write('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Your Files</title>\n</head>\n<body>\n')

        # Loop through the files in the source folder
        for file_name in os.listdir(source_folder):
            file_path = os.path.join(source_folder, file_name)

            # Skip directories
            if os.path.isdir(file_path):
                continue

            # Read the contents of the file
            if file_name.endswith('.pdf'):
                try:
                    file_contents = handle_pdf(file_path)
                except Exception as e:
                    print(f'Błąd podczas odczytu pliku {file_name}: {e}')
                    continue
            else:
                try:
                    with open(file_path, 'r', encoding='utf-8') as input_file:
                        file_contents = input_file.read()
                except Exception as e:
                    print(f'Błąd podczas odczytu pliku {file_name}: {e}')
                    continue

            # Write the file name and contents to the output files
            txt_output.write(f'# Plik: "{file_name}"\n### Treść pliku:\n\n{file_contents}\n\n')
            html_output.write(f'<h1>Plik: "{file_name}"</h1>\n<h3>Treść pliku:</h3>\n<pre>{file_contents}</pre>\n')

        # Write the HTML footer
        html_output.write('</body>\n</html>')

    print(f'Program wykonał połączenie plików źródłowych do {os.path.abspath(txt_output_file)} i {os.path.abspath(html_output_file)}')

# Function to toggle text input area
def toggle_text_input():
    if text_input.winfo_ismapped():
        text_input.grid_remove()
    else:
        text_input.grid()

# Function to start the merging process
def start_merge():
    merge_files()
    messagebox.showinfo("Sukces", "Pliki zostały połączone pomyślnie!")

# Initialize the main window
root = tk.Tk()
root.title("File Merging App")
root.geometry("800x600")
root.configure(bg="#2E2E2E")

# Centering elements by using an outer frame
outer_frame = tk.Frame(root, bg="#2E2E2E")
outer_frame.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

# GUI components
# Language Flags (Placeholder, functionality to be implemented)
flags_frame = tk.Frame(outer_frame, bg="#2E2E2E")
flags_frame.grid(row=0, column=1, sticky="E")

# Adding placeholders for flags
flag_urls = {
    "PL": "polish_flag_placeholder",
    "UK": "english_flag_placeholder",
    "IT": "italian_flag_placeholder"
}
for flag, url in flag_urls.items():
    tk.Label(flags_frame, text=flag, bg="#2E2E2E", fg="#FFFFFF").pack(side=tk.LEFT)

# Source Folder Area
source_folder_label = tk.Label(outer_frame, text="Source Folder: ", bg="#2E2E2E", fg="#FFFFFF")
source_folder_label.grid(row=1, column=0, sticky="W", padx=10, pady=5)

# File Drop Area (Using standard tk.Label for height support)
file_drop_label = tk.Label(outer_frame, text="Drop Files Here", bg="#555555", fg="#FFFFFF", width=50, height=5)
file_drop_label.grid(row=2, column=0, columnspan=2, sticky="WE", padx=10, pady=20)
file_drop_label.bind("<Button-1>", lambda e: open_folder())

# Text Input Toggle Button
text_input_button = tk.Button(outer_frame, text="Paste Text", bg="#555555", fg="#FFFFFF", command=toggle_text_input)
text_input_button.grid(row=3, column=0, sticky="W", padx=10, pady=5)

# Text Input Field (Initially Hidden)
text_input = Text(outer_frame, wrap="word", width=50, height=10, bg="#333333", fg="#FFFFFF")
text_input.grid(row=4, column=0, columnspan=2, sticky="WE", padx=10, pady=5)
text_input.grid_remove()

# Merge Button
merge_button = tk.Button(outer_frame, text="Merge into a Single File", bg="#555555", fg="#FFFFFF", command=start_merge)
merge_button.grid(row=5, column=0, sticky="W", padx=10, pady=20)

# Output Folder Area
output_folder_label = tk.Label(outer_frame, text="Output Folder: ", bg="#2E2E2E", fg="#FFFFFF")
output_folder_label.grid(row=6, column=0, sticky="W", padx=10, pady=5)

# Status Area
status_label = tk.Label(outer_frame, text="Status:", bg="#2E2E2E", fg="#FFFFFF")
status_label.grid(row=7, column=0, sticky="W", padx=10, pady=5)

# Post-Merge Actions (Initially Disabled)
post_merge_label = tk.Label(outer_frame, text="Post-Merge Actions:", bg="#2E2E2E", fg="#FFFFFF", state=tk.DISABLED)
post_merge_label.grid(row=8, column=0, sticky="W", padx=10, pady=5)

# Main loop to run the application
root.mainloop()
