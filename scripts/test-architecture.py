import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('gate', Path(__file__).with_name('check-architecture.py'))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ArchitectureGateTests(unittest.TestCase):
    def setUp(self):
        self.doc = ('Diagram URL: https://excalidraw.com/#json=fixture,key\n'
                    'Diagram export: docs/architecture/system-architecture.svg\n'
                    '## System overview\n'
                    'The learner coordinates named agents, reviews implementation plans, and approves deployment after the test agent reports validation results.\n')
        self.files = {gate.DOCUMENT: self.doc.encode(),
                      'docs/architecture/system-architecture.svg': b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'}

    def test_complete_evidence(self):
        gate.validate(self.files.__getitem__)

    def test_missing_files(self):
        for path in list(self.files):
            files = dict(self.files)
            del files[path]
            with self.subTest(path=path), self.assertRaises(KeyError):
                gate.validate(files.__getitem__)

    def test_blank_and_placeholder_urls(self):
        for url in ['', 'https://figma.com', 'http://figma.com/file/abc', 'https://example.com/diagram', 'https://figma.com/file/YOUR-ID', 'https://user:pass@figma.com/file/abc']:
            files = dict(self.files)
            files[gate.DOCUMENT] = self.doc.replace('https://excalidraw.com/#json=fixture,key', url).encode()
            with self.subTest(url=url), self.assertRaises(ValueError):
                gate.validate(files.__getitem__)

    def test_invalid_exports(self):
        for data in [b'', b'not a diagram', b'<svg/>', b'<!DOCTYPE svg><svg/>', b'x' * (gate.MAX_BYTES + 1)]:
            files = dict(self.files)
            files['docs/architecture/system-architecture.svg'] = data
            with self.subTest(size=len(data)), self.assertRaises((ValueError, gate.ET.ParseError)):
                gate.validate(files.__getitem__)

    def test_export_path_escape(self):
        self.files[gate.DOCUMENT] = self.doc.replace('docs/architecture/system-architecture.svg', '../outside.svg').encode()
        with self.assertRaises(ValueError):
            gate.validate(self.files.__getitem__)

    def test_missing_overview(self):
        self.files[gate.DOCUMENT] = self.doc.split('## System overview')[0].encode()
        with self.assertRaises(ValueError):
            gate.validate(self.files.__getitem__)

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'target').write_text('data')
            (root / 'link').symlink_to(root / 'target')
            with self.assertRaises(ValueError):
                gate.local_reader(root)('link')

    def test_api_complete_evidence(self):
        import io
        import json
        import base64
        sha = 'a' * 40
        paths = list(self.files)
        responses = iter([
            {'tree': {'sha': 'b' * 40}},
            {'tree': [{'path': path, 'type': 'blob', 'mode': '100644', 'size': len(self.files[path]), 'sha': str(i + 1) * 40} for i, path in enumerate(paths)]},
            *[{'encoding': 'base64', 'content': base64.b64encode(self.files[path]).decode()} for path in paths],
        ])
        def api(request, **kwargs):
            return io.BytesIO(json.dumps(next(responses)).encode())
        with patch.dict(gate.os.environ, {'GH_TOKEN': 'test-token'}), patch.object(gate, 'urlopen', side_effect=api):
            gate.validate(gate.github_reader({'repository': {'full_name': 'owner/repo'}, 'pull_request': {'head': {'sha': sha}}}))

    def test_api_reads_exact_head_and_rejects_symlink(self):
        import io
        import json
        sha = 'a' * 40
        responses = iter([{'tree': {'sha': 'b' * 40}}, {'tree': [{'path': gate.DOCUMENT, 'type': 'blob', 'mode': '120000', 'size': 10, 'sha': 'c' * 40}]}])
        def api(request, **kwargs):
            return io.BytesIO(json.dumps(next(responses)).encode())
        with patch.dict(gate.os.environ, {'GH_TOKEN': 'test-token'}), patch.object(gate, 'urlopen', side_effect=api) as mocked:
            read = gate.github_reader({'repository': {'full_name': 'owner/repo'}, 'pull_request': {'head': {'sha': sha}}})
            self.assertIn('/git/commits/' + sha, mocked.call_args_list[0].args[0].full_url)
            with self.assertRaises(ValueError):
                read(gate.DOCUMENT)


if __name__ == '__main__':
    unittest.main()
