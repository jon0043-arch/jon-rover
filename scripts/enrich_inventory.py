import asyncio
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

DATA = Path('data/inventory.json')
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

MODELS = [
    'range-rover-sport','range-rover-evoque','range-rover-velar','range-rover',
    'defender-130','defender-110','defender-90','defender',
    'discovery-sport','discovery','f-pace','e-pace','i-pace','xj','xf','xe'
]
STOP = {'all','wheel','drive','awd','4wd','rear','front','suv','sedan','coupe','convertible','4','door','2','automatic','manual'}


def clean_label(value):
    if value is None:
        return None
    value = re.sub(r'\s+', ' ', str(value)).strip(' :-|\t\r\n"\'')
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


def first_match(text, patterns):
    for p in patterns:
        m = re.search(p, text, re.I | re.S)
        if m:
            return clean_label(m.group(1))
    return None


def parse_page_data(html, text):
    # Search both rendered text and raw HTML/JSON blobs because Dealer Inspire
    # frequently stores these values in JavaScript rather than visible labels.
    hay = f"{text}\n{html}"
    stock = first_match(hay, [
        r'"stock(?:Number|_number|No)?"\s*:\s*"([^"\\]{2,40})"',
        r'\bStock(?: Number| #| No\.?|:)\s*[:#]?\s*([A-Z0-9-]{3,30})'
    ])
    exterior = first_match(hay, [
        r'"(?:exteriorColor|exterior_color|extColor|ext_color)"\s*:\s*"([^"\\]{2,100})"',
        r'\bExterior(?: Color)?\s*[:|\-]\s*([^\n<|]{2,100})',
        r'\bExterior Color\s+([^\n<]{2,100})'
    ])
    interior = first_match(hay, [
        r'"(?:interiorColor|interior_color|intColor|int_color)"\s*:\s*"([^"\\]{2,100})"',
        r'\bInterior(?: Color)?\s*[:|\-]\s*([^\n<|]{2,100})',
        r'\bInterior Color\s+([^\n<]{2,100})'
    ])
    miles = first_match(hay, [
        r'"(?:mileage|miles|odometer)"\s*:\s*"?([\d,]+)"?',
        r'\b(?:Mileage|Miles|Odometer)\s*[:|\-]?\s*([\d,]+)',
        r'([\d,]+)\s+(?:miles|mi)\b'
    ])
    mileage = None
    if miles:
        try:
            mileage = int(re.sub(r'\D','',miles))
        except ValueError:
            pass
    return stock, exterior, interior, mileage


async def enrich_one(context, sem, v, idx, total):
    out = dict(v)
    out.update(identity_from_url(v.get('url'), v.get('title') or ''))
    url = v.get('url') or ''
    if not url.startswith('https://www.landroverwillowgrove.com/inventory/'):
        return out
    async with sem:
        page = await context.new_page()
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=35000)
            await page.wait_for_timeout(1200)
            html = await page.content()
            text = await page.locator('body').inner_text(timeout=5000)
            stock, exterior, interior, mileage = parse_page_data(html, text)
            if stock: out['stock'] = stock
            if exterior: out['exterior'] = exterior
            if interior:
                out['interior'] = interior
                out['interiorFamily'] = family(interior)
            if mileage is not None: out['mileage'] = mileage
            if idx % 20 == 0:
                print('ENRICH', idx, '/', total, out.get('vin'), 'miles=', out.get('mileage'), 'ext=', out.get('exterior'), 'int=', out.get('interior'))
        except Exception as e:
            print('ENRICH_FAIL', out.get('vin'), type(e).__name__, str(e)[:120])
        finally:
            await page.close()
    return out


async def main_async():
    payload = json.loads(DATA.read_text(encoding='utf-8'))
    vehicles = payload.get('vehicles') or []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=UA, viewport={'width':1440,'height':1200})
        sem = asyncio.Semaphore(6)
        tasks = [enrich_one(context, sem, v, i+1, len(vehicles)) for i,v in enumerate(vehicles)]
        vehicles = await asyncio.gather(*tasks)
        await context.close()
        await browser.close()
    payload['vehicles'] = vehicles
    payload['count'] = len(vehicles)
    DATA.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    filled = {
        'title': sum(bool(v.get('title') and len(v.get('title','').split())>1) for v in vehicles),
        'make': sum(bool(v.get('make')) for v in vehicles),
        'model': sum(bool(v.get('model')) for v in vehicles),
        'mileage': sum(v.get('mileage') is not None for v in vehicles),
        'mileage_positive': sum((v.get('mileage') or 0) > 0 for v in vehicles),
        'exterior': sum(bool(v.get('exterior')) for v in vehicles),
        'interior': sum(bool(v.get('interior')) for v in vehicles),
        'stock': sum(bool(v.get('stock')) for v in vehicles),
        'vin': sum(bool(v.get('vin')) for v in vehicles),
    }
    print('ENRICHED', json.dumps(filled))


def main():
    asyncio.run(main_async())

if __name__ == '__main__':
    main()
