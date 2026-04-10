import os
import zipfile
import datetime

def create_backup():
    source_dir = r"c:\Users\darsh\Downloads\admin-student-dashboard-ui"
    
    # Create backup filename with timestamp in the Downloads folder (parent of project)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    parent_dir = os.path.dirname(source_dir)
    zip_filename = os.path.join(parent_dir, f"BalkanJi_Ni_Bari_Full_Backup_{timestamp}.zip")
    
    # Exclude heavy dependencies and generated build/cache directories.
    # The source code, configuration, db.sqlite3, and uploaded media are all kept.
    exclude_dirs = {'.next', 'node_modules', '.venv', '.git', '__pycache__'}
    
    print(f"Creating backup at: {zip_filename} ...")
    
    count = 0
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file == "backup_project.py":
                    continue
                    
                file_path = os.path.join(root, file)
                # Make the zip paths relative to the project root folder name itself
                arcname = os.path.relpath(file_path, parent_dir)
                
                try:
                    zipf.write(file_path, arcname)
                    count += 1
                except Exception as e:
                    print(f"Skipping {file_path}: {e}")

    print(f"Backup completed successfully! Included {count} files.")
    print(f"Saved to: {zip_filename}")

if __name__ == '__main__':
    create_backup()
