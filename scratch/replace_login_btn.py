import os

css_path = r"c:\Users\pwetz\Downloads\mume app\src\index.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# Target style block to replace
target = """.login-btn {
    background: var(--accent);
    border: none;
    border-radius: 8px;
    padding: 0 18px;
    height: 34px;
    color: #000;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    flex-shrink: 0;
    margin-right: 10px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

.login-btn:active {
    transform: scale(0.95);
}"""

replacement = """.login-btn {
    background: #b8860b;
    border: none;
    border-radius: 9999px;
    padding: 0 20px;
    height: 34px;
    color: #fff;
    font-family: 'Aniron', sans-serif;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    flex-shrink: 0;
    margin-right: 10px;
    box-shadow: 0 0 12px rgba(184, 134, 11, 0.65);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
    box-shadow: 0 0 18px rgba(184, 134, 11, 0.85);
}

.login-btn:active {
    transform: scale(0.95);
    box-shadow: 0 0 8px rgba(184, 134, 11, 0.5);
}"""

# Normalize newlines to match whatever is in the file (try both LF and CRLF)
if target in content:
    content = content.replace(target, replacement)
    print("Replaced successfully (LF style).")
else:
    # Try with CRLF
    target_crlf = target.replace("\n", "\r\n")
    replacement_crlf = replacement.replace("\n", "\r\n")
    if target_crlf in content:
        content = content.replace(target_crlf, replacement_crlf)
        print("Replaced successfully (CRLF style).")
    else:
        print("Target style block not found in index.css!")

with open(css_path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
