import os
import zipfile
import datetime

def package_system():
    # Configuration
    root_dir = os.path.abspath(os.path.join(os.getcwd(), ".."))
    backup_filename = "Balkanji_Ji_Bari_Full_System_7_April.zip"
    
    # Exclude patterns (exact matches or starts with)
    exclude_dirs = {
        'node_modules', '.next', '.git', '.venv', '__pycache__', 
        '.vercel', 'dist', 'build', 'tmp', '.gemini', '.agent', 
        'artifacts', 'backend_backup', 'logs'
    }
    
    exclude_files = {
        backup_filename, 'package-lock.json', 'yarn.lock', 
        'backup.zip', 'local_db_backup.json'
    }

    print(f"📦 Packaging System from: {root_dir}")
    print(f"🎯 Target Archive: {backup_filename}")

    count = 0
    try:
        with zipfile.ZipFile(backup_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(root_dir):
                # Filter directories in-place to stop recursion into excluded ones
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                
                for file in files:
                    if file in exclude_files:
                        continue
                    
                    # Also skip large binary/log files
                    if file.endswith(('.log', '.pyc', '.exe', '.dll')):
                        continue
                        
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, root_dir)
                    
                    # Safety check for very large files (> 50MB) unless it's a JSON backup
                    is_data = file.endswith('.json')
                    if os.path.getsize(file_path) > 50 * 1024 * 1024 and not is_data:
                        print(f"⚠️ Skipping large file: {arcname}")
                        continue
                        
                    zipf.write(file_path, arcname)
                    count += 1
        
        size_mb = os.path.getsize(backup_filename) / (1024 * 1024)
        print(f"✅ Successfully packaged {count} files into {backup_filename}")
        print(f"📊 Final Archive Size: {size_mb:.2f} MB")
        return True
    except Exception as e:
        print(f"❌ Packaging failed: {str(e)}")
        return False

if __name__ == "__main__":
    package_system()
