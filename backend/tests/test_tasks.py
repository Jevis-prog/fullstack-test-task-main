import unittest
from types import SimpleNamespace

from src.tasks import _scan


class ScanTests(unittest.TestCase):
    def test_suspicious_extension(self):
        file_item = SimpleNamespace(
            original_name="script.js",
            mime_type="text/javascript",
            size=100,
        )
        self.assertEqual(_scan(file_item), ["suspicious extension .js"])

    def test_pdf_mime_type_mismatch(self):
        file_item = SimpleNamespace(
            original_name="report.pdf",
            mime_type="text/plain",
            size=100,
        )
        self.assertEqual(_scan(file_item), ["pdf extension does not match mime type"])


if __name__ == "__main__":
    unittest.main()
