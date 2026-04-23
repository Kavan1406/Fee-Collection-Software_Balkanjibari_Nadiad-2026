import subprocess

def check_syntax(file_path):
    try:
        # We can't really check TSX syntax easily without node/tsc
        # But we can check if it's broadly valid or just look for obvious issues
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        open_braces = content.count('{')
        close_braces = content.count('}')
        open_parens = content.count('(')
        close_parens = content.count(')')
        
        print(f"Braces: {open_braces} / {close_braces}")
        print(f"Parens: {open_parens} / {close_parens}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_syntax(r"c:\Users\darsh\Downloads\Fee-Collection-Software latest 22 april\Fee-Collection-Software_Balkanjibari_Nadiad-2026-main\components\pages\StudentsPage.tsx")
鼓
