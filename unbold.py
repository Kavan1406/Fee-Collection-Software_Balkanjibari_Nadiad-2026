import os
import re

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('font-black', 'font-bold')
    new_content = new_content.replace('font-extrabold', 'font-bold')
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    target_dirs = ['app', 'components', 'lib', 'src']
    extensions = ('.tsx', '.ts', '.css', '.js', '.jsx')
    count = 0
    
    for d in target_dirs:
        if not os.path.exists(d):
            continue
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith(extensions):
                    file_path = os.path.join(root, file)
                    if replace_in_file(file_path):
                        print(f"Updated: {file_path}")
                        count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
