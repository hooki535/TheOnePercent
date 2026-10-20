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

    def test_backtesting_page_renders_correct_static_urls(self):
        response = self.client.get('/backtesting')
        self.assertEqual(response.status_code, 200)
        text = response.get_data(as_text=True)
        self.assertIn('window.OP_FLASK = true', text)
        self.assertIn('/static/assets/backtesting.js', text)
        self.assertIn('/static/assets/backtest-engine.js', text)
        self.assertNotIn('{{', text)

    def test_replay_assets_and_archives_are_served(self):
        for file in ('backtesting.js', 'backtest-engine.js', 'backtest-lab.js', 'backtest-workspace.js', 'backtest-chart.js', 'backtesting.css', 'backtesting/tutorial-preview.svg',
                     'backtesting/data/EURUSD_1H.csv', 'backtesting/data/GBPUSD_1D.csv',
                     'backtesting/data/BTCUSD_1D.csv'):
            with self.subTest(file=file):
                response = self.client.get('/static/assets/' + file)
                self.assertEqual(response.status_code, 200)
                response.close()


if __name__ == '__main__':
    unittest.main()
