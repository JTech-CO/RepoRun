"""Optional branding regeneration. Requires CairoSVG; not used by normal builds."""
from pathlib import Path
import hashlib
import json
import cairosvg
root = Path(__file__).resolve().parents[1] / 'public' / 'icons'
source = root / 'logo.svg'
metadata = {'source': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'generated': {}}
for size in (16, 32, 48, 128):
    target = root / f'{size}.png'
    cairosvg.svg2png(url=str(source), write_to=str(target), output_width=size, output_height=size)
    metadata['generated'][target.name] = hashlib.sha256(target.read_bytes()).hexdigest()
(root / 'assets.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print('Updated SVG fingerprints and all installation PNGs.')
