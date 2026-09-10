import concurrent.futures
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import requests

DATA = Path('data/inventory.json')
READER = 'https://r.jina.ai/https://'

MODELS = [
    'range-rover-sport','range-rover-evoque','range-rover-velar','range-rover',
    'defender-130','defender-110','defender-90','defender',
    'discovery-sport','discovery','f-pace','e-pace','i-pace','xj','xf','xe'
]
STOP = {'all','wheel','drive','awd','4wd','rear','front','suv','sedan','coupe','convertible','4','door','2','automatic','manual'}


def clean_label(value):
    if not value:
        return None
    value = re.sub(r'\s+', ' ', value).strip(' :-|\t\r\n')
    return value[:120] or None


def identity_from_url(url, fallback_title=''):
    slug = urlparse(url or '').path.rstrip('/').split('/')[-1].lower()
    slug = re.sub(r'^(new|used|certified|pre-owned)-', '', slug)
    slug = re.sub(r'-[a-hj-npr-z0-9]{17}$', '', slug)
    tokens = slug.split('-')
    year = next((t for t in tokens if re.fullmatch(r'20\d{2}|19\d{2}', t)), None)
    if year and year in tokens:
        tokens = tokens[tokens.index(year)+1:]
    make = None
    if tokens[:2] == ['land','rover']:
        make = 'Land Rover'; tokens = tokens[2:]
    elif tokens[:1] == ['jaguar']:
        make = 'Jaguar'; tokens = tokens[1:]
    model = None
    model_slug = None
    joined = '-'.join(tokens)
    for candidate in MODELS:
        if joined.startswith(candidate + '-') or joined == candidate:
            model_slug = candidate
            model = candidate.replace('-', ' ').title().replace('F Pace','F-PACE').replace('E Pace','E-PACE').replace('I Pace','I-PACE')
            if candidate.startswith('range-rover'):
                model = candidate.replace('-', ' ').title()
            if candidate.startswith('defender-'):
                model = candidate.replace('-', ' ').title()
            break
    trim = None
    if model_slug:
        rest = joined[len(model_slug):].lstrip('-').split('-')
        trim_tokens = []
        for token in rest:
            if token in STOP:
                break
            trim_tokens.append(token)
        if trim_tokens:
            trim = ' '.join(trim_tokens).title()
    title = ' '.join(x for x in [year, make, model, trim] if x)
    return {'year': int(year) if year else None, 'make': make, 'model': model, 'trim': trim, 'title': title or fallback_title}


def family(interior):
    x=(interior or '').lower()
    if 'caraway' in x or any(k in x for k in ['tan','beige','camel','caramel']): return 'tan'
    if 'light cloud' in x or any(k in x for k in ['ivory','cream','off-white','off white']): return 'off-white'
    if 'ebony' in x or 'black' in x: return 'black'
    if 'deep garnet' in x or any(k in x for k in ['burgundy','wine','garnet','oxblood']): return 'red-wine'
    return None


def extract(text, patterns):
    for p in patterns:
        m = re.search(p, text, re.I)
        if m:
            return clean_label(m.group(1))
    return None


def enrich(v):
    out = dict(v)
    out.update(identity_from_url(v.get('url'), v.get('title') or ''))
    url = v.get('url') or ''
    if not url.startswith('https://www.landroverwillowgrove.com/inventory/'):
        return out
    try:
        r = requests.get(READER + url.replace('https://',''), timeout=12, headers={'Accept':'text/plain'})
        if r.ok:
            text = r.text
            stock = extract(text,[r'Stock(?: Number| #| No\.?|:)\s*[:#]?\s*([A-Z0-9-]{3,30})'])
            exterior = extract(text,[r'Exterior(?: Color)?\s*[:|\-]\s*([^\n|]{2,80})',r'Exterior\s+([^\n]{2,80})'])
            interior = extract(text,[r'Interior(?: Color)?\s*[:|\-]\s*([^\n|]{2,80})',r'Interior\s+([^\n]{2,80})'])
            miles = extract(text,[r'(?:Mileage|Miles|Odometer)\s*[:|\-]?\s*([\d,]+)'])
            if stock: out['stock'] = stock
            if exterior: out['exterior'] = exterior
            if interior:
                out['interior'] = interior
                out['interiorFamily'] = family(interior)
            if miles:
                try: out['mileage'] = int(re.sub(r'\D','',miles))
                except ValueError: pass
    except Exception:
        pass
    return out


def main():
    payload = json.loads(DATA.read_text(encoding='utf-8'))
    vehicles = payload.get('vehicles') or []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        vehicles = list(pool.map(enrich, vehicles))
    payload['vehicles'] = vehicles
    payload['count'] = len(vehicles)
    DATA.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    filled = {
        'title': sum(bool(v.get('title') and len(v.get('title','').split())>1) for v in vehicles),
        'make': sum(bool(v.get('make')) for v in vehicles),
        'model': sum(bool(v.get('model')) for v in vehicles),
        'mileage': sum(v.get('mileage') is not None for v in vehicles),
        'exterior': sum(bool(v.get('exterior')) for v in vehicles),
        'interior': sum(bool(v.get('interior')) for v in vehicles),
        'vin': sum(bool(v.get('vin')) for v in vehicles),
    }
    print('ENRICHED', json.dumps(filled))

if __name__ == '__main__':
    main()
