"""Validate architecture evidence as data; never execute submission code."""
import base64
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

DOCUMENT = 'docs/architecture/README.md'
MAX_BYTES = 5 * 1024 * 1024


def validate(read):
    document = read(DOCUMENT).decode('utf-8')
    def field(name):
        match = re.search(r'^' + re.escape(name) + r':[ \t]*(.*)$', document, re.M)
        if not match or not match[1].strip():
            raise ValueError(f'Complete {name} in {DOCUMENT}.')
        return match[1].strip()

    url = urlsplit(field('Diagram URL'))
    host = (url.hostname or '').lower()
    if (url.scheme != 'https' or not host or '.' not in host or url.username
            or url.password or host in {'example.com', 'example.org', 'example.net', 'localhost'}
            or host.endswith(('.example', '.invalid', '.test', '.localhost'))
            or re.search(r'TODO|YOUR-|PLACEHOLDER|[<>\s]', url.geturl(), re.I)
            or not (url.path.strip('/') or url.query or url.fragment)):
        raise ValueError('Diagram URL must be a specific HTTPS diagram share link, not a homepage or placeholder.')

    path = field('Diagram export')
    if path not in {f'docs/architecture/system-architecture.{ext}' for ext in ('png', 'svg', 'pdf')}:
        raise ValueError('Diagram export must name docs/architecture/system-architecture.png, .svg, or .pdf.')
    data = read(path)
    if not data or len(data) > MAX_BYTES:
        raise ValueError('Diagram export must be nonempty and at most 5 MiB.')
    if path.endswith('.png'):
        valid = len(data) >= 33 and data.startswith(b'\x89PNG\r\n\x1a\n') and data[12:16] == b'IHDR' and int.from_bytes(data[16:20], 'big') > 0 and int.from_bytes(data[20:24], 'big') > 0 and b'IEND' in data
    elif path.endswith('.pdf'):
        valid = data.startswith(b'%PDF-') and b'%%EOF' in data
    else:
        if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
            raise ValueError('SVG exports must not contain DTD or entity declarations.')
        root = ET.fromstring(data)
        valid = root.tag.split('}')[-1] == 'svg' and any(e.tag.split('}')[-1] in {'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'image', 'use'} for e in root.iter())
    if not valid:
        raise ValueError('Diagram export does not have the expected image/PDF structure.')
    overview = re.search(r'^## System overview\s*\n(.*?)(?=^## |\Z)', document, re.M | re.S)
    if not overview or len(overview[1].strip()) < 80 or re.search(r'\bTODO\b|\bTBD\b|\[write|\[describe', overview[1], re.I):
        raise ValueError('Write a System overview of at least 80 characters describing components, connections, and approval gates.')


def local_reader(root):
    root = Path(root).resolve()
    def read(path):
        candidate = root / path
        if any(p.is_symlink() for p in [candidate, *candidate.parents] if p != root and root in p.parents):
            raise ValueError('Architecture evidence must be regular files, not symlinks.')
        if not candidate.is_file() or candidate.stat().st_size > MAX_BYTES:
            raise ValueError(f'Missing or oversized evidence file: {path}')
        return candidate.read_bytes()
    return read


def github_reader(event):
    # Read Git objects from the base repository at the exact PR head commit.
    # Fork PR commits are available through the base repository's PR refs.
    repo = event['repository']['full_name']
    sha = event['pull_request']['head']['sha']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo) or not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Invalid GitHub repository or commit identifier.')
    def api(path):
        request = Request(f'https://api.github.com/repos/{repo}/{path}', headers={
            'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'architecture-evidence-gate',
        })
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    commit = api(f'git/commits/{sha}')
    tree = api('git/trees/' + quote(commit['tree']['sha']) + '?recursive=1')
    if tree.get('truncated'):
        raise ValueError('Repository tree is too large to verify architecture evidence.')
    entries = {entry['path']: entry for entry in tree['tree']}
    def read(path):
        entry = entries.get(path, {})
        if entry.get('type') != 'blob' or entry.get('mode') not in {'100644', '100755'} or entry.get('size', MAX_BYTES + 1) > MAX_BYTES:
            raise ValueError(f'Missing, oversized, or non-regular evidence file: {path}')
        blob = api('git/blobs/' + quote(entry['sha']))
        if blob.get('encoding') != 'base64':
            raise ValueError('Unsupported evidence encoding.')
        return base64.b64decode(blob['content'])
    return read


if __name__ == '__main__':
    try:
        if '--github' in sys.argv:
            event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
            reader = github_reader(event)
        else:
            reader = local_reader('.')
        validate(reader)
    except Exception as error:
        print(f'Architecture gate FAILED: {error}', file=sys.stderr)
        sys.exit(1)
    print('Architecture evidence present. Instructor must verify link access and diagram accuracy before accepting submission.')
