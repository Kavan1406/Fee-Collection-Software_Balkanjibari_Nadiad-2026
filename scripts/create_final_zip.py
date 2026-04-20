import os
import zipfile
from datetime import datetime

def create_zip(source_dir, output_filename):
    exclude_dirs = {'.git', 'node_modules', '.next', '.venv', '__pycache__', '.vercel'}
    exclude_files = {output_filename, 'D_balkanji.zip', 'backup.zip', 'updated webapp 6 april.zip'}

    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune exclude_dirs
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files:
                    continue
                
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    timestamp = datetime.now().strftime("%Y_%m_%d_%H%M")
    filename = f"Balkanji_Summer_Camp_2026_Final_{timestamp}.zip"
    print(f"Creating zip: {filename}...")
    create_zip('.', filename)
    print(f"Successfully created zip: {filename}")
