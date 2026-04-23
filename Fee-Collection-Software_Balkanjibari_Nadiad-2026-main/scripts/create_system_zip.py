import os
import zipfile
import shutil
from datetime import datetime

def create_system_zip():
    # Configuration
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    timestamp = datetime.now().strftime("%Y_%m_%d_%H%M")
    zip_filename = f"Balkanji_Ji_Bari_Full_System_Final_{timestamp}.zip"
    
    # Folders and files to strictly exclude
    exclude_dirs = {
        '.git', 
        'node_modules', 
        '.next', 
        '.venv', 
        'venv', 
        '__pycache__', 
        '.vercel', 
        'tmp', 
        '.gemini',
        'media' # Typically excluded from code-only zips to save space
    }
    
    exclude_files = {
        '.DS_Store',
        'package-lock.json' # Optional, but often omitted for cleaner code-only zips
    }

    print(f"--- Creating System Backup: {zip_filename} ---")
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(root_dir):
            
            # Filter directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                # Skip excluded files or existing ZIPs
                if file in exclude_files or file.endswith('.zip') or file.endswith('.sqlite3'):
                    continue
                
                file_path = os.path.join(root, file)
                # Calculate relative path for the zip structure
                rel_path = os.path.relpath(file_path, root_dir)
                
                zip_file.write(file_path, rel_path)
                print(f"  + Adding: {rel_path}")

    print(f"\n[OK] Backup Complete: {zip_filename}")
    print(f"Size: {os.path.getsize(zip_filename) // 1024} KB")

if __name__ == "__main__":
    create_system_zip()
