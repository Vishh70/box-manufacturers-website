import glob
import re

for file in glob.glob('*.html'):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    def replacer(match):
        img = match.group(0)
        if 'loading=' in img or 'hero' in img.lower() or 'about-factory' in img.lower():
            return img
        return img.replace('<img', '<img loading="lazy"', 1)

    new_content = re.sub(r'<img[^>]+>', replacer, content)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("success")
