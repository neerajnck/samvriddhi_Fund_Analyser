"""Builds the single-page app (one HTML file) from a data folder.
Usage: python3 scripts/build_site.py <payload_dir> <output.html>
"""
import re, sys, glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '..', 'parts')
rd = lambda n: open(os.path.join(P, n), encoding='utf-8').read()
payload, out = sys.argv[1:3]
build_name = sys.argv[3] if len(sys.argv) > 3 else 'web'

def between(s, a, b):
    i = s.index(a); j = s.index(b, i)
    return s[i:j]

t = rd('template.html')
t = t.replace('/*{{FONTS}}*/', rd('fonts.css')).replace('/*{{STYLE}}*/', rd('style.css'))
t = t.replace('/*{{CORE}}*/', rd('core.js')).replace('/*{{FMT}}*/', rd('fmt.js'))
t = t.replace('/*{{MAINUPD}}*/', rd('mainupd.js')).replace('/*{{CHARTETC}}*/', rd('chartetc.js'))
t = t.replace("var p={i:0},n=rv(b=bytes,p),b;", "var p={i:0},n=rv(bytes,p);")
meta = open(f'{payload}/meta.b64').read().strip()
files = sorted(glob.glob(f'{payload}/h*.txt'), key=lambda f: int(re.search(r'h(\d+)\.txt', f).group(1)))
chunks = ''.join(f'<script id="h{i}" type="text/plain">{open(f).read()}</script>\n' for i, f in enumerate(files))
t = t.replace('{{META}}', meta).replace('{{CHUNKS}}', chunks).replace('{{BUILD}}', build_name).replace('{{CHUNKSIZE}}', '400')
head = between(t, '<!--HEAD_START-->', '<!--HEAD_END-->').replace('<!--HEAD_START-->', '')
body = between(t, '<!--BODY_START-->', '<!--BODY_END-->').replace('<!--BODY_START-->', '')
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="color-scheme" content="light dark">\n' + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('built', out, round(len(html.encode()) / 1e6, 1), 'MB')
