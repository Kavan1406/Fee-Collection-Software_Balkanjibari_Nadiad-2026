
import os
import zipfile
import datetime

def backup_project():
    # Configuration
    root_dir = os.path.abspath(os.path.join(os.getcwd(), ".."))
    backup_filename = "backup.zip"
    
    # Exclude patterns
    exclude_dirs = {'.venv', 'node_modules', '.next', '.git', '__pycache__', '.vercel'}
    exclude_files = {backup_filename}

    print(f"Starting backup of: {root_dir}")
    print(f"Target file: {backup_filename}")

    try:
        with zipfile.ZipFile(backup_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(root_dir):
                # Filter directories in-place
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                
                for file in files:
                    if file in exclude_files:
                        continue
                        
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, root_dir)
                    
                    # Also skip large compiled/binary files if any (safety check)
                    if os.path.getsize(file_path) > 50 * 1024 * 1024: # Skip files > 50MB
                        print(f"Skipping large file: {arcname}")
                        continue
                        
                    zipf.write(file_path, arcname)
        
        print(f"Successfully created {backup_filename}")
        return True
    except Exception as e:
        print(f"Backup failed: {str(e)}")
        return False

if __name__ == "__main__":
    backup_project()
