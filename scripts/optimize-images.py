"""Generate responsive WebP assets from originals using ImageMagick (magick)."""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'catalogue.js').read_text()
items = json.loads(source[source.index('['):source.rindex(']') + 1])
output = ROOT / 'media'
output.mkdir(exist_ok=True)


def convert(item):
    source = ROOT / 'images' / item['path']
    for width in (480, 800, 1280):
        target = output / f"{item['id']}-{width}.webp"
        subprocess.run(['magick', str(source), '-auto-orient', '-colorspace', 'sRGB',
                        '-resize', f'{width}x{width}>', '-strip', '-quality', '78',
                        '-define', 'webp:method=5', str(target)], check=True)
    return item['id']


if '--metadata-only' not in sys.argv:
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(convert, items))
    print(f'Generated {len(results) * 3} responsive images.')
for item in items:
    files = [output / f"{item['id']}-{width}.webp" for width in (480, 800, 1280)]
    sizes = subprocess.check_output(['magick', 'identify', '-format', '%w %h\n', *map(str, files)], text=True)
    dimensions = [list(map(int, row.split())) for row in sizes.strip().splitlines()]
    item['widths'] = [pair[0] for pair in dimensions]
    item['width'], item['height'] = dimensions[-1]
(ROOT / 'catalogue.js').write_text('/* Generated image metadata; rebuild with scripts/optimize-images.py. */\nconst catalogue = ' + json.dumps(items, ensure_ascii=False, indent=2) + ';\n')
original = sum((ROOT / 'images' / item['path']).stat().st_size for item in items)
preview = sum((output / f"{item['id']}-1280.webp").stat().st_size for item in items)
print(f'Originals: {original / 1024**2:.1f} MB; optimized previews: {preview / 1024**2:.1f} MB')
