"""Checks for public gallery assets without browser or network access."""
from pathlib import Path
from html.parser import HTMLParser
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

class GalleryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.ids = set()
        self.sample_sections = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'): self.ids.add(attrs['id'])
        if tag == 'section' and 'sample-showcase' in attrs.get('class',''):
            self.sample_sections += 1
        if tag == 'img' and '/assets/examples/' in attrs.get('src',''):
            self.images.append(attrs)

html = (ROOT/'index.html').read_text('utf-8')
css = (ROOT/'style.css').read_text('utf-8')
p = GalleryParser(); p.feed(html)
assert p.sample_sections == 1, 'Exactly one example gallery'
assert 'sample-title' in p.ids and 'draw-button' in p.ids
assert len({img['src'] for img in p.images}) == 5
assert all(img.get('width') or img.get('loading') == 'lazy' for img in p.images)
assets = sorted((ROOT/'assets/examples').glob('*.webp'))
assert len(assets) == 5
for asset in assets:
    with Image.open(asset) as image:
        assert image.size[0] == 420 and image.size[1] == 560
    assert asset.stat().st_size < 150_000, asset
assert 'scroll-snap-type:x mandatory' in css
assert '.side-gallery-left' in css and '.side-gallery-right' in css
assert 'https://okuyama' not in html, 'Public HTML should not publish the old owner URL'
assert (ROOT/'engine.mjs').exists() and (ROOT/'data/v1/species.json').exists()
print('PASS: 5 distinct light WebP examples, gallery, desktop rails, mobile carousel, draw retained, old owner URL not in HTML')
