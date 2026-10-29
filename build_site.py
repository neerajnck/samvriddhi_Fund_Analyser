"""Builds the website folder (small page + data files) from the data folder.
Usage: python3 scripts/build_site.py <payload_dir> <site_dir>
Output: site/index.html (about 300 KB), site/data/meta.bin, site/data/version.json, site/data/f/<code>.bin (one small file per fund),
        plus the service worker, manifest and icons that let the page be installed on a phone.
"""
import re, sys, os, json, zlib, base64, hashlib, shutil, glob
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, '..', 'parts')
rd = lambda n: open(os.path.join(P, n), encoding='utf-8').read()
payload, site = sys.argv[1:3]

def between(s, a, b):
    i = s.index(a); j = s.index(b, i)
    return s[i:j]

meta_b64 = open(f'{payload}/meta.b64').read().strip()
meta = json.loads(zlib.decompress(base64.b64decode(meta_b64), -15))
rows = meta['rows']
version = '%s-%s' % (meta['dataEnd'], hashlib.sha1(meta_b64.encode()).hexdigest()[:8])

t = rd('template.html')
t = t.replace('/*{{FONTS}}*/', rd('fonts.css')).replace('/*{{STYLE}}*/', rd('style.css'))
t = t.replace('/*{{CORE}}*/', rd('core.js')).replace('/*{{FMT}}*/', rd('fmt.js'))
t = t.replace('/*{{MAINUPD}}*/', rd('mainupd.js')).replace('/*{{CHARTETC}}*/', rd('chartetc.js'))
t = t.replace("var p={i:0},n=rv(b=bytes,p),b;", "var p={i:0},n=rv(bytes,p);")
t = t.replace('{{META}}', '').replace('{{CHUNKS}}', '').replace('{{BUILD}}', 'web').replace('{{CHUNKSIZE}}', '400')
head = between(t, '<!--HEAD_START-->', '<!--HEAD_END-->').replace('<!--HEAD_START-->', '')
body = between(t, '<!--BODY_START-->', '<!--BODY_END-->').replace('<!--BODY_START-->', '')
html = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="color-scheme" content="light dark">\n<meta name="theme-color" content="#4A0D22">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Samvriddhi">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
        + head + '\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')

if os.path.exists(site): shutil.rmtree(site)
os.makedirs(f'{site}/data/f')
open(f'{site}/index.html', 'w', encoding='utf-8').write(html)
shutil.copy(os.path.join(P, 'pwa', 'sw.js'), f'{site}/sw.js')
shutil.copy(os.path.join(P, 'pwa', 'manifest.webmanifest'), f'{site}/manifest.webmanifest')
shutil.copytree(os.path.join(P, 'pwa', 'icons'), f'{site}/icons')
open(f'{site}/data/meta.bin', 'wb').write(base64.b64decode(meta_b64))
lines = []
for f in sorted(glob.glob(f'{payload}/h*.txt'), key=lambda f: int(re.search(r'h(\d+)\.txt', f).group(1))):
    lines += open(f).read().split('\n')
assert len(lines) >= len(rows), 'data folder is inconsistent'
for r, line in zip(rows, lines):
    open(f'{site}/data/f/{r[0]}.bin', 'wb').write(base64.b64decode(line.strip()))
json.dump({'v': version, 'dataEnd': meta['dataEnd'], 'funds': len(rows)}, open(f'{site}/data/version.json', 'w'))
open(f'{site}/.nojekyll', 'w').write('')
size = sum(os.path.getsize(os.path.join(d, x)) for d, _, fs in os.walk(site) for x in fs)
print('built', site, '| page', round(len(html.encode()) / 1e3), 'KB | funds', len(rows), '| total', round(size / 1e6, 1), 'MB | version', version)
