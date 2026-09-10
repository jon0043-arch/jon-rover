import asyncio
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

DATA = Path('data/inventory.json')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

MODELS = [
    'range-rover-sport','range-rover-evoque','range-rover-velar','range-rover',
    'defender-130','defender-110','defender-90','defender',
    'discovery-sport','discovery','f-pace','e-pace','i-pace','xj','xf','xe'
]
STOP = {'all','wheel','drive','awd','4wd','rear','front','suv','sedan','coupe','convertible','4','door','2','automatic','manual'}
INVALID_META = {
    '', 'interior_color', 'exterior_color', 'interior color', 'exterior color',
    'interior', 'exterior', 'unknown', 'n/a', 'na', 'null', 'none', 'undefined'
}

# Edmunds exposes both VIN and dealer stock number in its public search-result text.
# We only accept a stock number when it is paired with the exact 17-character VIN.
EDMUNDS_STOCK_PAGES = [
    'https://www.edmunds.com/new-land-rover-range-rover-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/new-land-rover-range-rover-sport-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/new-land-rover-range-rover-evoque-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/new-land-rover-range-rover-velar-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/new-land-rover-defender-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/new-land-rover-discovery-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/new-land-rover-discovery-sport-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/used-land-rover-for-sale-bridgeton-nj/',
    'https://www.edmunds.com/used-jaguar-for-sale-bridgeton-nj/',
]


def clean_label(value):
    if value is None:
        return None
    value = re.sub(r'\\u0026', '&', str(value))
    value = value.replace('\\/', '/').replace('\\"', '"')
    value = re.sub(r'<[^>]+>', ' ', value)
    value = re.sub(r'\s+', ' ', value).strip(' :-|\t\r\n"\'')
    return value[:140] or None


def valid_meta(value):
    v = clean_label(value)
    if not v:
        return None
    normalized = re.sub(r'[\s_-]+', ' ', v).strip().lower()
    if normalized in INVALID_META:
        return None
    if normalized in {'interiorcolor', 'exteriorcolor', 'int color', 'ext color'}:
        return None
    return v


def valid_stock(value):
    v = valid_meta(value)
    if not v or len(v) > 25 or not re.search(r'[A-Za-z]', v):
        return None
    v = re.split(r'\s+(?:VIN|Vehicle|Exterior|Interior)\b', v, maxsplit=1, flags=re.I)[0].strip()
    return v if re.search(r'[A-Za-z]', v) and re.search(r'\d', v) else None


def identity_from_url(url, fallback_title=''):
    slug = urlparse(url or '').path.rstrip('/').split('/')[-1].lower()
    slug = re.sub(r'^(new|used|certified-used|certified|pre-owned)-', '', slug)
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
    x = (interior or '').lower()
    if 'caraway' in x or any(k in x for k in ['tan','beige','camel','caramel']): return 'tan'
    if 'light cloud' in x or any(k in x for k in ['ivory','cream','off-white','off white','cloud/ebony','cloud / ebony']): return 'off-white'
    if 'ebony' in x or 'black' in x: return 'black'
    if 'deep garnet' in x or any(k in x for k in ['burgundy','wine','garnet','oxblood']): return 'red-wine'
    return None


def all_matches(text, patterns, validator=valid_meta):
    values = []
    for p in patterns:
        for m in re.finditer(p, text, re.I | re.S):
            value = validator(m.group(1))
            if value and value not in values:
                values.append(value)
    return values


def best_color(values):
    if not values:
        return None
    def score(v):
        s = 0
        if re.search(r'\b[A-Z0-9]{3,6}\b$', v): s += 5
        if len(v) <= 65: s += 3
        if any(k in v.lower() for k in ['white','black','grey','gray','green','blue','silver','red','bronze','gold','caraway','ebony','cloud','garnet','tan','brown','perlino']): s += 4
        if ':' in v or '{' in v or '}' in v: s -= 6
        return s
    return sorted(values, key=lambda v: (-score(v), len(v)))[0]


def parse_page_data(html, text):
    hay = f"{text}\n{html}"
    stock_values = all_matches(hay, [
        r'"(?:stockNumber|stock_number|stockNo|stock_no|stock)"\s*:\s*"([^"\\]{2,40})"',
        r'(?:data-stock-number|data-stock)\s*=\s*["\']([^"\']+)["\']',
        r'\bStock(?: Number| #| No\.?|:)\s*[:#]?\s*([A-Z0-9-]{3,30})'
    ], validator=valid_stock)
    stock = stock_values[0] if stock_values else None
    exterior_values = all_matches(hay, [
        r'"(?:exteriorColor|exterior_color|exteriorColour|exterior_color_name|extColor|ext_color)"\s*:\s*"([^"\\]{2,120})"',
        r'(?:data-exterior-color|data-ext-color)\s*=\s*["\']([^"\']+)["\']',
        r'\bExterior(?: Color| Colour)?\s*[:|\-]\s*([^\n<|]{2,100})',
        r'\bExterior(?: Color| Colour)?\s+([^\n<]{2,100})'
    ])
    exterior = best_color(exterior_values)
    interior_values = all_matches(hay, [
        r'"(?:interiorColor|interior_color|interiorColour|interior_color_name|intColor|int_color)"\s*:\s*"([^"\\]{2,120})"',
        r'(?:data-interior-color|data-int-color)\s*=\s*["\']([^"\']+)["\']',
        r'\bInterior(?: Color| Colour)?\s*[:|\-]\s*([^\n<|]{2,100})',
        r'\bInterior(?: Color| Colour)?\s+([^\n<]{2,100})'
    ])
    interior = best_color(interior_values)
    mileage = None
    mileage_values = all_matches(hay, [
        r'"(?:odometer|vehicleMileage|vehicle_mileage)"\s*:\s*"?([\d,]{1,8})"?',
        r'\bOdometer\s*[:|\-]?\s*([\d,]{1,8})\s*(?:miles|mi)?\b',
        r'\bMileage\s*[:|\-]?\s*([\d,]{1,8})\s*(?:miles|mi)\b'
    ], validator=lambda x: clean_label(x))
    if mileage_values:
        try:
            mileage = int(re.sub(r'\D', '', mileage_values[0]))
        except ValueError:
            pass
    return stock, exterior, interior, mileage


async def enrich_one(context, sem, v, idx, total):
    out = dict(v)
    out.update(identity_from_url(v.get('url'), v.get('title') or ''))
    url = v.get('url') or ''
    if not url.startswith('https://www.landroverwillowgrove.com/inventory/'):
        out['exterior'] = valid_meta(out.get('exterior'))
        out['interior'] = valid_meta(out.get('interior'))
        out['stock'] = valid_stock(out.get('stock'))
        out['interiorFamily'] = family(out.get('interior'))
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
            else: out['stock'] = valid_stock(out.get('stock'))
            if exterior: out['exterior'] = exterior
            else: out['exterior'] = valid_meta(out.get('exterior'))
            if interior: out['interior'] = interior
            else: out['interior'] = valid_meta(out.get('interior'))
            out['interiorFamily'] = family(out.get('interior'))
            if mileage is not None: out['mileage'] = mileage
            if idx % 20 == 0:
                print('ENRICH', idx, '/', total, out.get('vin'), 'miles=', out.get('mileage'), 'ext=', out.get('exterior'), 'int=', out.get('interior'), 'stock=', out.get('stock'))
        except Exception as e:
            out['exterior'] = valid_meta(out.get('exterior'))
            out['interior'] = valid_meta(out.get('interior'))
            out['stock'] = valid_stock(out.get('stock'))
            out['interiorFamily'] = family(out.get('interior'))
            print('ENRICH_FAIL', out.get('vin'), type(e).__name__, str(e)[:120])
        finally:
            await page.close()
    return out


async def overlay_llm_mileage(context, vehicles):
    by_vin = {str(v.get('vin','')).upper(): v for v in vehicles if v.get('vin')}
    seen = set()
    page = await context.new_page()
    try:
        for pageno in range(1, 5):
            url = f'https://www.landroverwillowgrove.com/llm/inventory/?limit=100&page={pageno}'
            try:
                await page.goto(url, wait_until='domcontentloaded', timeout=35000)
                text = await page.locator('body').inner_text(timeout=8000)
            except Exception as e:
                print('LLM_MILEAGE_FAIL', pageno, type(e).__name__)
                continue
            pattern = re.compile(r'(?:New|Used|Certified Used)\s*\n\s*([\d,]+)\s+miles?\b[\s\S]{0,220}?VIN:\s*([A-HJ-NPR-Z0-9]{17})', re.I)
            found = 0
            for m in pattern.finditer(text):
                vin = m.group(2).upper()
                if vin in by_vin:
                    by_vin[vin]['mileage'] = int(m.group(1).replace(',',''))
                    seen.add(vin); found += 1
            print('LLM_MILEAGE', pageno, 'matched', found, 'total', len(seen))
            if pageno > 1 and found == 0:
                break
    finally:
        await page.close()
    return vehicles


async def overlay_secondary_stock(context, vehicles):
    by_vin = {str(v.get('vin','')).upper(): v for v in vehicles if v.get('vin')}
    matched = set()
    page = await context.new_page()
    try:
        for base_url in EDMUNDS_STOCK_PAGES:
            empty_pages = 0
            for pageno in range(1, 7):
                url = base_url if pageno == 1 else f'{base_url}?pagenumber={pageno}'
                try:
                    await page.goto(url, wait_until='domcontentloaded', timeout=35000)
                    await page.wait_for_timeout(750)
                    text = await page.locator('body').inner_text(timeout=8000)
                except Exception as e:
                    print('STOCK_SOURCE_FAIL', url, type(e).__name__)
                    empty_pages += 1
                    if empty_pages >= 2: break
                    continue

                # Edmunds result cards present VIN followed by Stock. Pair them only
                # inside a tight text window so a stock number cannot jump vehicles.
                found = 0
                for vin_match in re.finditer(r'VIN:\s*([A-HJ-NPR-Z0-9]{17})', text, re.I):
                    vin = vin_match.group(1).upper()
                    if vin not in by_vin:
                        continue
                    window = text[vin_match.end():vin_match.end()+140]
                    stock_match = re.search(r'Stock:\s*([A-Za-z0-9-]{2,25})', window, re.I)
                    if not stock_match:
                        continue
                    stock = valid_stock(stock_match.group(1))
                    if stock:
                        by_vin[vin]['stock'] = stock
                        matched.add(vin)
                        found += 1
                print('STOCK_SOURCE', url, 'matched', found, 'total', len(matched))
                if found == 0:
                    empty_pages += 1
                else:
                    empty_pages = 0
                if empty_pages >= 2: break
    finally:
        await page.close()
    return vehicles


async def main_async():
    payload = json.loads(DATA.read_text(encoding='utf-8'))
    vehicles = payload.get('vehicles') or []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=UA, viewport={'width':1440,'height':1200})
        sem = asyncio.Semaphore(6)
        tasks = [enrich_one(context, sem, v, i+1, len(vehicles)) for i,v in enumerate(vehicles)]
        vehicles = await asyncio.gather(*tasks)
        vehicles = await overlay_llm_mileage(context, vehicles)
        vehicles = await overlay_secondary_stock(context, vehicles)
        await context.close()
        await browser.close()

    payload['vehicles'] = vehicles
    payload['count'] = len(vehicles)
    filled = {
        'title': sum(bool(v.get('title') and len(v.get('title','').split())>1) for v in vehicles),
        'make': sum(bool(v.get('make')) for v in vehicles),
        'model': sum(bool(v.get('model')) for v in vehicles),
        'mileage': sum(v.get('mileage') is not None for v in vehicles),
        'mileage_positive': sum((v.get('mileage') or 0) > 0 for v in vehicles),
        'exterior': sum(bool(valid_meta(v.get('exterior'))) for v in vehicles),
        'interior': sum(bool(valid_meta(v.get('interior'))) for v in vehicles),
        'stock': sum(bool(valid_stock(v.get('stock'))) for v in vehicles),
        'vin': sum(bool(v.get('vin')) for v in vehicles),
    }
    payload['enrichmentStats'] = filled
    DATA.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    print('ENRICHED_VALID', json.dumps(filled))


def main():
    asyncio.run(main_async())

if __name__ == '__main__':
    main()
