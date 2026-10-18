"""Headless Chromium smoke test. Start web server: python3 -m http.server 8000"""
from playwright.sync_api import sync_playwright
from pathlib import Path
from urllib.parse import urlparse
import mimetypes
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1)
    page=context.new_page()
    # Intercept a synthetic HTTPS origin so the smoke test does not require network.
    def serve(route):
        path=urlparse(route.request.url).path.lstrip('/') or 'index.html'
        target=(Path(__file__).resolve().parent.parent / path).resolve()
        root=Path(__file__).resolve().parent.parent
        if not target.is_relative_to(root) or not target.is_file():
            route.fulfill(status=404,body='Not found')
            return
        typ=mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        route.fulfill(status=200,body=target.read_bytes(),content_type=typ)
    page.route('https://gacha.example/**', serve)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('https://gacha.example/',wait_until='networkidle')
    assert page.locator('#draw-button').is_enabled()
    page.locator('#draw-button').click()
    page.locator('#result').wait_for(state='visible')
    species=page.locator('#result-title').inner_text()
    prompt=page.locator('#prompt').input_value()
    assert species in prompt and len(prompt)<=1000,(species,len(prompt))
    url=page.url
    assert '?v=1&s=' in url
    page.screenshot(path='/mnt/data/identity-fantasy-gacha/preview-mobile.png',full_page=True)
    page.reload(wait_until='networkidle')
    assert page.locator('#result-title').inner_text()==species
    assert page.locator('#prompt').input_value()==prompt
    assert not errors, errors
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'horizontal scrolling on 390px'
    page.set_viewport_size({'width':320,'height':720})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'horizontal scrolling on 320px'
    print('PASS mobile browser: draw, seed URL, reload, no JS exceptions, no horizontal overflow')
    print('Example result:',species,'prompt length:',len(prompt),'URL:',url)
    browser.close()
