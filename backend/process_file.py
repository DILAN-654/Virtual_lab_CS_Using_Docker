# backend/process_file.py
import sys
import pandas as pd
import os

def main():
    # Accept file path via argv
    if len(sys.argv) < 2:
        print("ERROR: No file path provided.\nUsage: python process_file.py <path-to-csv>", file=sys.stderr)
        sys.exit(2)

    file_path = sys.argv[1]

    if not os.path.isfile(file_path):
        print(f"ERROR: File not found: {file_path}", file=sys.stderr)
        sys.exit(3)

    try:
        df = pd.read_csv(file_path)
        # Do whatever processing you need here. For now print 5 rows.
        print(df.head().to_csv(index=False))
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: Failed to read/process CSV: {e}", file=sys.stderr)
        sys.exit(4)

if __name__ == "__main__":
    main()
