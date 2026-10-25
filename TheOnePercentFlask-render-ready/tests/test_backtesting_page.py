"""Exercise the page blueprint without starting external data pollers."""
from pathlib import Path
import unittest

from flask import Flask
from blueprints.pages import pages


class BacktestingPageTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[1]
        app = Flask(__name__, template_folder=str(root / 'templates'),
                    static_folder=str(root / 'static'), static_url_path='/static')
        app.register_blueprint(pages)
        self.client = app.test_client()

    def test_old_backtesting_route_preserves_session_links(self):
        response = self.client.get('/backtesting')
        self.assertEqual(response.status_code, 200)
        text = response.get_data(as_text=True)
        self.assertIn('TheOnePercent-Backtesting/pages/backtesting.html', text)
        self.assertIn('location.hash', text)
        self.assertNotIn('/static/assets/backtesting.js', text)


if __name__ == '__main__':
    unittest.main()
