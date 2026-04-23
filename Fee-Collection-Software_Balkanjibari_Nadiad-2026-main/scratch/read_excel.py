import pandas as pd
import os

file_path = r'c:\Users\darsh\Downloads\Fee-Collection-Software latest 22 april\Fee-Collection-Software_Balkanjibari_Nadiad-2026-main\Enrollment_Payment_Report_20-04-2026.xlsx'

if os.path.exists(file_path):
    df = pd.read_excel(file_path)
    print("Columns:", df.columns.tolist())
    print("Total Rows:", len(df))
    print("\nFirst 5 rows:")
    print(df.head())
else:
    print("File not found")
