"""Builds slides/sealed-pick.html from the evidence files and the app's brand mark, then (with --export) prints the PDF
and one PNG per slide with Playwright's Chromium. Usage: python slides/build_slides.py [--export]"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FONTS = HERE / 'fonts'
FONTS.mkdir(exist_ok=True)
for pkg, files in {
    'bricolage-grotesque': ['bricolage-grotesque-latin-400-normal.woff2', 'bricolage-grotesque-latin-600-normal.woff2', 'bricolage-grotesque-latin-800-normal.woff2'],
    'jetbrains-mono': ['jetbrains-mono-latin-400-normal.woff2'],
}.items():
    for f in files:
        src = ROOT / 'node_modules/@fontsource' / pkg / 'files' / f
        if src.exists() and not (FONTS / f).exists():
            shutil.copy(src, FONTS / f)
    lic = ROOT / 'node_modules/@fontsource' / pkg / 'LICENSE'
    if lic.exists():
        shutil.copy(lic, FONTS / f'{pkg}-OFL.txt')

dev = json.loads((ROOT / 'notes/evidence/devnet.json').read_text(encoding='utf-8'))
# the wax-seal emblem the app ships as its favicon (packages/web/public/favicon.svg), drawn at slide size
EMBLEM = (ROOT / 'packages/web/public/favicon.svg').read_text(encoding='utf-8').replace('width="64" height="64"', 'width="300" height="300"')
rows = ''.join(
    f'<div class="tx"><span class="c">{r["circuit"]}</span><span class="h">block {r["blockHeight"]}</span>'
    f'<span class="id">{r["txHash"][:8]}…{r["txHash"][-4:]}</span><span class="ok">{r["status"]}</span></div>'
    for r in dev['receipts'])

SEAL_JS = r'''
function sealSvg(hex, size) {
  const bytes = (hex.match(/../g) || ['00']).map(h => parseInt(h, 16));
  const id = 'w' + hex.slice(0, 10) + size, c = size / 2, r = size * 0.43, pts = [];
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, b = bytes[i % bytes.length] / 255;
    const rr = r * (0.93 + 0.08 * b + 0.025 * Math.sin(a * 5 + bytes[1])); pts.push([c + rr * Math.cos(a), c + rr * Math.sin(a)]); }
  let d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
  for (let i = 0; i < 36; i++) { const p0 = pts[(i + 35) % 36], p1 = pts[i], p2 = pts[(i + 1) % 36], p3 = pts[(i + 2) % 36];
    d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + ' ' + p2[0].toFixed(2) + ',' + p2[1].toFixed(2); }
  const fs = size * 0.19, label = hex.slice(0, 4).toUpperCase();
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs><radialGradient id="${id}" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#ef7457"/><stop offset=".5" stop-color="#c9432f"/><stop offset="1" stop-color="#8c2416"/></radialGradient></defs><path d="${d}Z" fill="url(#${id})"/><circle cx="${c}" cy="${c + 1}" r="${r * .66}" fill="none" stroke="rgba(255,190,170,.28)" stroke-width="${size / 50}"/><circle cx="${c}" cy="${c}" r="${r * .66}" fill="none" stroke="rgba(70,10,4,.42)" stroke-width="${size / 42}"/><text x="${c}" y="${c + fs * .36 + 1}" text-anchor="middle" font-size="${fs}" class="st hi">${label}</text><text x="${c}" y="${c + fs * .36}" text-anchor="middle" font-size="${fs}" class="st">${label}</text></svg>`;
}
document.querySelectorAll('[data-seal]').forEach(el => { el.innerHTML = sealSvg(el.dataset.seal, Number(el.dataset.size || 160)); });
'''

HTML = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sealed Pick · slides</title>
<style>
@font-face {{ font-family: 'Bricolage Grotesque'; font-weight: 400; src: url(fonts/bricolage-grotesque-latin-400-normal.woff2) format('woff2'); }}
@font-face {{ font-family: 'Bricolage Grotesque'; font-weight: 600; src: url(fonts/bricolage-grotesque-latin-600-normal.woff2) format('woff2'); }}
@font-face {{ font-family: 'Bricolage Grotesque'; font-weight: 800; src: url(fonts/bricolage-grotesque-latin-800-normal.woff2) format('woff2'); }}
@font-face {{ font-family: 'JetBrains Mono'; font-weight: 400; src: url(fonts/jetbrains-mono-latin-400-normal.woff2) format('woff2'); }}
@page {{ size: 1920px 1080px; margin: 0; }}
:root {{ --bg:#0d1315; --ink:#ece6d9; --ink2:#b8b2a5; --muted:#7b8a8e; --line:#22313a; --paper:#efe6d2; --paper-ink:#2b2620; --wax:#c9432f; --ok:#8fd0b2; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: #000; }}
body {{ font-family: 'Bricolage Grotesque', sans-serif; color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.slide {{ width: 1920px; height: 1080px; position: relative; overflow: hidden; page-break-after: always; break-after: page; padding: 120px 140px;
  background: radial-gradient(1200px 700px at 8% -10%, rgba(201,67,47,.13), transparent 60%), radial-gradient(900px 700px at 100% 110%, rgba(95,184,162,.09), transparent 60%), linear-gradient(180deg, #17231f, var(--bg) 45%); }}
.mono {{ font-family: 'JetBrains Mono', monospace; }}
.kicker {{ font-size: 26px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 26px; }}
h1 {{ font-size: 150px; font-weight: 800; letter-spacing: -.02em; margin: 0; line-height: 1; }}
h2 {{ font-size: 84px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 56px; line-height: 1.04; max-width: 1500px; }}
p, li {{ font-size: 38px; line-height: 1.38; color: var(--ink2); }}
p {{ margin: 0 0 26px; max-width: 1400px; }}
.lead {{ font-size: 48px; color: var(--ink); max-width: 1300px; }}
.foot {{ position: absolute; left: 140px; right: 140px; bottom: 70px; display: flex; justify-content: space-between; font-size: 24px; color: var(--muted); }}
.st {{ font-family: 'Bricolage Grotesque'; font-weight: 800; letter-spacing: .06em; fill: rgba(78,14,6,.6); }} .st.hi {{ fill: rgba(255,210,196,.32); }}
.title {{ display: grid; grid-template-columns: 300px 1fr; gap: 70px; align-items: center; margin-top: 120px; }}
.title .emblem {{ display: grid; filter: drop-shadow(0 16px 20px rgba(0,0,0,.5)); }}
.rules {{ list-style: none; padding: 0; margin: 10px 0 44px; display: grid; gap: 22px; }}
.rules li {{ padding-left: 54px; position: relative; color: var(--ink); font-size: 44px; }}
.rules li::before {{ content: ''; position: absolute; left: 0; top: 18px; width: 22px; height: 22px; border-radius: 50%; background: var(--wax); }}
.steps {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 46px; margin-top: 20px; }}
.step {{ background: linear-gradient(180deg, var(--paper), #e6dabf); color: var(--paper-ink); border-radius: 28px; padding: 48px 44px; min-height: 560px; position: relative; }}
.step .n {{ font-size: 30px; font-weight: 800; color: var(--wax); letter-spacing: .06em; }}
.step h3 {{ font-size: 58px; margin: 14px 0 22px; }}
.step p {{ color: #5b5246; font-size: 32px; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }}
.panel {{ border-radius: 28px; padding: 46px 48px; }}
.panel.private {{ background: linear-gradient(180deg, var(--paper), #e6dabf); color: var(--paper-ink); }}
.panel.public {{ background: #0a1012; border: 1px solid #1b272c; }}
.panel h3 {{ font-size: 46px; margin: 0 0 26px; }}
.panel.private h3 {{ color: var(--paper-ink); }}
.panel ul {{ margin: 0; padding-left: 36px; }}
.panel.private li {{ color: #5b5246; }}
.panel li {{ font-size: 34px; margin-bottom: 14px; }}
.formula {{ margin-top: 40px; font-size: 27px; color: var(--muted); }}
.facts {{ display: grid; gap: 30px; }}
.fact b {{ display: block; font-size: 44px; color: var(--ink); margin-bottom: 6px; }}
.fact span {{ font-size: 31px; color: var(--ink2); line-height: 1.35; }}
.term {{ background: #070b0c; border: 1px solid #1b272c; border-radius: 24px; padding: 34px 38px; }}
.term .hd {{ font-size: 25px; color: var(--muted); margin-bottom: 20px; }}
.tx {{ display: grid; grid-template-columns: 190px 140px 1fr 230px; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 23px; padding: 8px 0; border-bottom: 1px solid #141e22; white-space: nowrap; }}
.tx .c {{ color: var(--ok); }} .tx .h {{ color: var(--muted); }} .tx .id {{ color: #ee8a72; }} .tx .ok {{ color: var(--ink2); text-align: right; }}
.cols3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 50px; }}
.col h3 {{ font-size: 44px; margin: 0 0 18px; color: var(--ink); }}
.col p {{ font-size: 36px; }}
.cmd {{ display: inline-block; margin: 26px 0 40px; padding: 26px 36px; border-radius: 18px; background: #070b0c; border: 1px solid #1b272c; font-size: 38px; color: var(--ok); }}
.shot {{ display: grid; grid-template-columns: 520px 1fr; gap: 56px; align-items: center; margin-top: 10px; }}
.shot img {{ width: 100%; border-radius: 18px; border: 1px solid #22313a; box-shadow: 0 30px 60px -28px rgba(0,0,0,.8); }}
.shot p {{ font-size: 32px; }}
.url {{ display: inline-block; margin-top: 10px; padding: 14px 20px; border-radius: 14px; background: #070b0c; border: 1px solid #1b272c; font-size: 22px; color: var(--ok); white-space: nowrap; }}
.small {{ font-size: 30px; color: var(--muted); }}
</style></head><body>

<section class="slide">
  <div class="title"><div class="emblem">{EMBLEM}</div>
  <div><h1>Sealed Pick</h1><p class="lead" style="margin-top:34px">A party game for three on Midnight. Everyone seals a pick through a Compact contract; the seals break together.</p></div></div>
  <div class="foot"><span class="mono">github.com/luoy16002-svg/sealed-pick</span><span>Midnight WaveHack · Wave 2</span></div>
</section>

<section class="slide">
  <div class="kicker">The problem</div>
  <h2>Hidden, simultaneous picks need a referee.</h2>
  <p>Coordination games, blind votes and sealed guesses only work when two rules hold:</p>
  <ul class="rules"><li>Nobody sees another pick before choosing.</li><li>Nobody changes a pick after seeing someone else's.</li></ul>
  <p>Online, a server usually holds every pick, and everyone has to trust it.</p>
</section>

<section class="slide">
  <div class="kicker">How a round works</div>
  <h2>Three players, three seals, one reveal.</h2>
  <div class="steps">
    <div class="step"><div class="n">01</div><h3>Seal</h3><p>Each phone keeps its choice and a random nonce in private state. The commit circuit proves the player owns the seat and the choice is in range, and discloses only the seal.</p></div>
    <div class="step"><div class="n">02</div><h3>Wait</h3><p>The public ledger shows three seals and a counter. No choice exists on chain yet, so there is nothing to peek at.</p></div>
    <div class="step"><div class="n">03</div><h3>Break</h3><p>After the last seal, the openings go to one player. The reveal circuit checks all three against their seals and publishes the choices and the score in one transaction.</p></div>
  </div>
</section>

<section class="slide" style="padding-top: 100px">
  <div class="kicker">The live table</div>
  <h2 style="margin-bottom: 40px">Play a round in the browser.</h2>
  <div class="shot">
    <div>
      <p>Three phones and the public ledger, in one tab. The compiled Compact circuits run in the page.</p>
      <p>After a seal, "Cheat with a modified app" sends a second pick straight to the circuit. It answers "Player already committed".</p>
      <div class="url mono">luoy16002-svg.github.io/sealed-pick</div>
    </div>
    <img src="../notes/screenshot-sealed.png" alt="The Sealed Pick table during a round">
  </div>
</section>

<section class="slide">
  <div class="kicker">Privacy boundary</div>
  <h2>What the ledger sees.</h2>
  <div class="two">
    <div class="panel private"><h3>On each phone, private state</h3><ul><li>The player's random 32-byte secret, which proves seat ownership</li><li>The choice and its nonce until the reveal</li></ul></div>
    <div class="panel public"><h3>On the public ledger</h3><ul><li>Room ID, option count and phase</li><li>Seat pseudonyms and seals</li><li>After the reveal: the three choices and the score</li></ul></div>
  </div>
  <p class="formula mono">pseudonym = persistentHash(domain, roomId, secret)<br>seal = persistentCommit((domain, roomId, seat, choice), nonce)</p>
</section>

<section class="slide">
  <div class="kicker">Built and checked</div>
  <h2 style="margin-bottom:44px">Running, tested, proven on a devnet.</h2>
  <div class="two" style="grid-template-columns: 1fr 1.15fr; align-items: start">
    <div class="facts">
      <div class="fact"><b>Compact 0.31.1</b><span>Four circuits compile with proving and verifying keys.</span></div>
      <div class="fact"><b>33 tests pass</b><span>Rules, every commit order, all 64 answer triples, and a raw-ledger check that no choice appears early.</span></div>
      <div class="fact"><b>Browser table</b><span>Runs the generated circuits in the page. A forged second commitment is refused by the circuit.</span></div>
    </div>
    <div class="term"><div class="hd mono">npm run devnet:e2e · local devnet · real proofs</div>{rows}</div>
  </div>
</section>

<section class="slide">
  <div class="kicker">Next</div>
  <h2>Where Sealed Pick goes from here.</h2>
  <div class="cols3">
    <div class="col"><h3>Who plays</h3><p>Friends on a call, classrooms learning about focal points, stream audiences voting without seeing the running tally.</p></div>
    <div class="col"><h3>What we build next</h3><p>The same round on Preprod: the script is ready and waits for faucet funds. Openings sent between phones over an encrypted channel. Room links and more seats.</p></div>
    <div class="col"><h3>How it pays</h3><p>Free to play. Paid question packs, and branded rooms for streamers and events.</p></div>
  </div>
</section>

<section class="slide">
  <div class="kicker">Try it</div>
  <h2>Three phones, one ledger, no peeking.</h2>
  <div class="cmd mono">luoy16002-svg.github.io/sealed-pick</div>
  <p>Press “Play a round for me”, or play all three phones yourself. On a phone, the table shows one seat at a time.</p>
  <p class="small">Locally: <span class="mono">npm ci &amp;&amp; npm run build &amp;&amp; npm run web:dev</span>, then open localhost:5391.</p>
  <div class="foot"><span class="mono">github.com/luoy16002-svg/sealed-pick</span><span>Apache-2.0</span></div>
</section>

<script>{SEAL_JS}</script>
</body></html>'''

out = HERE / 'sealed-pick.html'
out.write_text(HTML, encoding='utf-8')
print('wrote', out)

if '--export' in sys.argv:
    from playwright.sync_api import sync_playwright
    png = HERE / 'png'
    png.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page.goto(out.as_uri(), wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(300)
        page.pdf(path=str(HERE / 'sealed-pick.pdf'), width='1920px', height='1080px', print_background=True)
        slides = page.query_selector_all('section.slide')
        for i, el in enumerate(slides):
            el.screenshot(path=str(png / f'slide{i + 1}.png'))
        browser.close()
    print('exported pdf and', len(slides), 'pngs')
