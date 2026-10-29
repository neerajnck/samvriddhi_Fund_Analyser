"""Adds the newest NAVs (and newly launched schemes) from AMFI India to the packed data folder.
Usage: python3 scripts/update_data.py <payload_dir> [--local-navall FILE] [--local-history FILE ...] [--today YYYY-MM-DD]
Only the Python standard library is used. The data folder holds meta.b64, h0.txt, h1.txt ...
(the same format the app reads). Existing history is never rewritten, only extended.
"""
import sys, os, re, json, zlib, base64, datetime, time, urllib.request, urllib.parse

CHUNK = 400
EPOCH = datetime.date(1970, 1, 1)
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
NAVALL_URLS = ['https://portal.amfiindia.com/spages/NAVAll.txt', 'https://www.amfiindia.com/spages/NAVAll.txt', 'http://portal.amfiindia.com/spages/NAVAll.txt', 'https://www.amfiindia.com/spages/NAVAll.txt?t=1']
HIST_URL = 'https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx'
HIST_VARIANTS = [{}, {'mf': '-1'}, {'mf': '-1', 'tp': '1'}, {'mf': '0'}]

# ---------- packing (mirrors the app) ----------
def enc(n):
    out = bytearray()
    while n >= 128:
        out.append((n & 127) | 128); n >>= 7
    out.append(n); return bytes(out)

def rv(b, p):
    x = 0; m = 1
    while True:
        c = b[p[0]]; p[0] += 1
        x += (c & 127) * m; m *= 128
        if not (c & 128): return x

def deflate(b):
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    return c.compress(b) + c.flush()

def decode_blob(line):
    b = zlib.decompress(base64.b64decode(line.strip()), -15); p = [0]
    n = rv(b, p); d = [0] * n; v = [0] * n
    d[0] = rv(b, p)
    for i in range(1, n): d[i] = d[i - 1] + rv(b, p)
    acc = rv(b, p); v[0] = acc
    for i in range(1, n):
        z = rv(b, p); acc += (z >> 1) if z % 2 == 0 else -((z + 1) >> 1); v[i] = acc
    return d, v

def encode_blob(d, v):
    out = bytearray(enc(len(d)) + enc(d[0]))
    for i in range(1, len(d)): out += enc(d[i] - d[i - 1])
    out += enc(v[0])
    for i in range(1, len(v)):
        dv = v[i] - v[i - 1]
        out += enc((dv << 1) if dv >= 0 else (((-dv) << 1) - 1))
    return base64.b64encode(deflate(bytes(out))).decode()

def clean_amc(a):
    a = str(a)
    a = re.sub(r'\(.*?\)', '', a)
    a = re.sub(r'\b(Asset Management|Asset Managers?|Mutual Fund|Investment Managers?|Investment Management|Fund Management|AMC|Company|Limited|Ltd\.?|Pvt\.?|Private|Pte|India|Trustee)\b', '', a, flags=re.I)
    a = re.sub(r'[\s,.&-]+$', '', re.sub(r'\s+', ' ', a)).strip()
    return a or str(a)

def option_of(n):
    l = n.lower()
    if re.search(r'idcw|dividend|income distribution|payout|reinvest|bonus', l): return 1
    if re.search(r'growth|cumulative', l): return 0
    return 2

# ---------- AMFI text parsing ----------
TYPE_RE = re.compile(r'^(Open Ended|Close Ended|Interval Fund)\s*Schemes?\s*\((.+)\)\s*$', re.I)

def parse_day(s):
    try:
        return (datetime.datetime.strptime(s.strip(), '%d-%b-%Y').date() - EPOCH).days
    except Exception:
        return None

def parse_amfi(text):
    """Yields (code, name, nav, day, amc, category, type) from AMFI's semicolon text files (daily file or history report).
    Columns are found from the header line, so added or reordered columns do not matter."""
    amc = cat = typ = ''
    cols = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line: continue
        if ';' in line:
            p = [x.strip() for x in line.split(';')]
            if p[0].lower().startswith('scheme code'):
                cols = {h.lower(): i for i, h in enumerate(p)}
                continue
            if not p[0].isdigit(): continue
            if cols and 'net asset value' in cols and 'scheme name' in cols and 'date' in cols:
                ni, si, di = cols['net asset value'], cols['scheme name'], cols['date']
            elif len(p) == 6: ni, si, di = 4, 3, 5
            elif len(p) == 8: ni, si, di = 4, 1, 7
            else: continue
            if len(p) <= max(ni, si, di): continue
            try:
                nav = float(p[ni].replace(',', ''))
            except ValueError:
                continue
            day = parse_day(p[di])
            if day is None or nav <= 0: continue
            name = p[si]
            if cols:
                for key in ('plan', 'option'):
                    k = cols.get(key)
                    if k is not None and k < len(p) and p[k] and p[k].lower() not in name.lower():
                        name += ' - ' + p[k]
            yield int(p[0]), name, nav, day, amc, cat, typ
            continue
        m = TYPE_RE.match(line)
        if m:
            typ = m.group(1).title(); cat = m.group(2).strip()
        else:
            amc = line

def fetch(url, tries=3):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/plain,text/html,*/*;q=0.8', 'Accept-Language': 'en-IN,en;q=0.9', 'Referer': 'https://www.amfiindia.com/'})
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                txt = raw.decode('utf-8', 'replace')
                print('  GET', url.split('?')[0], '->', r.status, r.headers.get('Content-Type'), len(raw), 'bytes')
                return txt
        except Exception as e:
            last = e; print('  GET', url.split('?')[0], 'failed:', repr(e)[:200]); time.sleep(2 * (k + 1))
    return None

def count(text):
    return sum(1 for _ in parse_amfi(text)) if text else 0

def fetch_history(d0, d1):
    f = (EPOCH + datetime.timedelta(days=d0)).strftime('%d-%b-%Y'); t = (EPOCH + datetime.timedelta(days=d1)).strftime('%d-%b-%Y')
    for v in HIST_VARIANTS:
        q = dict(v); q.update({'frmdt': f, 'todt': t})
        url = HIST_URL + '?' + urllib.parse.urlencode(q)
        txt = fetch(url, tries=1)
        if txt and count(txt) < 500: print('    got', count(txt), 'rows; start of reply:', repr(txt[:250]))
        if txt and count(txt) >= 500:
            print('  history', f, 'to', t, 'ok with', v or 'no extra parameters'); return txt
    print('  history', f, 'to', t, 'could not be fetched'); return None

# ---------- main ----------
def main():
    args = sys.argv[1:]
    payload = args[0]
    local_nav = local_hist = None; local_hist = []
    today = datetime.datetime.now(datetime.timezone.utc).date()
    i = 1
    while i < len(args):
        if args[i] == '--local-navall': local_nav = args[i + 1]; i += 2
        elif args[i] == '--local-history': local_hist.append(args[i + 1]); i += 2
        elif args[i] == '--today': today = datetime.date.fromisoformat(args[i + 1]); i += 2
        else: i += 1
    today_day = (today - EPOCH).days + 1   # allow for IST being ahead of UTC

    meta = json.loads(zlib.decompress(base64.b64decode(open(f'{payload}/meta.b64').read()), -15))
    rows = meta['rows']
    lines = []
    for ci in range(0, (len(rows) + CHUNK - 1) // CHUNK):
        lines += open(f'{payload}/h{ci}.txt').read().split('\n')
    assert len(lines) >= len(rows), 'data folder is inconsistent'
    lines = lines[:len(rows)]
    pend_path = f'{payload}/pending.json'
    pending = json.load(open(pend_path)) if os.path.exists(pend_path) else {}
    data_end = max(r[10] for r in rows)
    print('data currently ends', EPOCH + datetime.timedelta(days=data_end), 'with', len(rows), 'schemes')

    # 1. gather downloads
    texts = []
    if local_nav or local_hist:
        for f in local_hist: texts.append(open(f, encoding='utf-8').read())
        if local_nav: texts.append(open(local_nav, encoding='utf-8').read())
    else:
        start = data_end + 1; failed = False
        while start < today_day - 1:
            end = min(start + 29, today_day - 1)
            tx = fetch_history(start, end)
            if tx is None: failed = True
            else: texts.append(tx)
            start = end + 1
        if failed: print('WARNING: part of the history could not be downloaded; there may be a gap until the next run.')
        tx = None
        for u in NAVALL_URLS:
            tx = fetch(u, tries=2)
            if tx and count(tx) >= 500: break
            if tx: print('    got', count(tx), 'rows; start of reply:', repr(tx[:250]))
            tx = None
        if tx is None:
            print('::error::Could not download the daily AMFI file. The page is published with the data it already has.')
            if not texts:
                out = os.environ.get('GITHUB_OUTPUT')
                if out:
                    with open(out, 'a') as f: f.write('changed=false\n')
                return
        else:
            texts.append(tx)

    byc = {r[0]: i for i, r in enumerate(rows)}
    newpts = {}   # code -> {day: v}
    info = {}     # code -> (name, amc, cat, typ)
    recent = today_day - 14
    for tx in texts:
        for code, name, nav, day, amc, cat, typ in parse_amfi(tx):
            if day > today_day or day < 7000: continue
            if code in byc:
                if day > rows[byc[code]][10]:
                    newpts.setdefault(code, {})[day] = round(nav * 10 ** 4)
            elif code in pending or day >= recent:
                newpts.setdefault(code, {})[day] = round(nav * 10 ** 4)
                info[code] = (name, amc, cat, typ)

    # 2. extend existing schemes
    added = updated = 0
    for code, pts in newpts.items():
        if code not in byc: continue
        k = byc[code]; r = rows[k]
        d, v = decode_blob(lines[k])
        for day in sorted(pts):
            if day > d[-1]:
                d.append(day); v.append(pts[day]); added += 1
        lines[k] = encode_blob(d, v)
        r[10] = d[-1]; r[12] = len(d); r[11] = d[0]; updated += 1

    # 3. brand-new schemes
    for code, pts in newpts.items():
        if code in byc: continue
        p = pending.setdefault(str(code), {'pts': {}})
        for day, v in pts.items(): p['pts'][str(day)] = v
        if code in info: p['name'], p['amc'], p['cat'], p['typ'] = info[code]
    amcs, cats = meta['amcs'], meta['cats']
    def amc_index(raw):
        c = clean_amc(raw) if raw else 'Other'
        for j, a in enumerate(amcs):
            if a.lower() == c.lower(): return j
        for j, a in enumerate(amcs):
            if len(a) >= 4 and len(c) >= 4 and (a.lower() in c.lower() or c.lower() in a.lower()): return j
        amcs.append(c); return len(amcs) - 1
    created = 0
    for code in list(pending):
        p = pending[code]
        if len(p['pts']) < 2 or 'name' not in p: continue
        days_ = sorted(int(x) for x in p['pts']); vals = [p['pts'][str(x)] for x in days_]
        name = re.sub(r'\s+', ' ', p['name']).strip()
        cat = p.get('cat') or 'Other Scheme'
        if cat not in cats: cats.append(cat)
        typ = {'Open Ended': 0, 'Close Ended': 1, 'Interval Fund': 2}.get(p.get('typ', 'Open Ended'), 0)
        rows.append([int(code), name, amc_index(p.get('amc', '')), cats.index(cat), typ, 1 if 'direct' in name.lower() else 0, option_of(name), None, None, '', days_[-1], days_[0], len(days_), 4])
        lines.append(encode_blob(days_, vals)); byc[int(code)] = len(rows) - 1
        del pending[code]; created += 1
    # forget unpromoted scheme sightings that have gone stale
    for code in list(pending):
        if max(int(x) for x in pending[code]['pts']) < today_day - 60: del pending[code]

    # 4. write back
    new_end = max(r[10] for r in rows)
    meta['dataEnd'] = new_end
    open(f'{payload}/meta.b64', 'w').write(base64.b64encode(deflate(json.dumps(meta, separators=(',', ':'), ensure_ascii=False).encode())).decode())
    for ci in range(0, (len(lines) + CHUNK - 1) // CHUNK):
        open(f'{payload}/h{ci}.txt', 'w').write('\n'.join(lines[ci * CHUNK:(ci + 1) * CHUNK]))
    json.dump(pending, open(pend_path, 'w'))
    changed = added > 0 or created > 0
    print(f'added {added} NAV points to {updated} schemes; {created} new schemes; {len(pending)} new schemes waiting for a second NAV')
    print('data now ends', EPOCH + datetime.timedelta(days=new_end), 'with', len(rows), 'schemes')
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f: f.write('changed=%s\n' % ('true' if changed else 'false'))

if __name__ == '__main__':
    main()
