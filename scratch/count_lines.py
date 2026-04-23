import os

def count_lines(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return len(f.readlines())
    except Exception:
        return 0

files = []
for root, dirs, filenames in os.walk('src'):
    for filename in filenames:
        if filename.endswith(('.ts', '.tsx')):
            path = os.path.join(root, filename)
            lines = count_lines(path)
            files.append((lines, path))

files.sort(key=lambda x: x[0], reverse=True)
for lines, path in files[:25]:
    print(f"{lines}\t{path}")
