import csv,gzip,importlib.util,json,tempfile,unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('history_package',Path(__file__).resolve().parents[1]/'tools/package-market-history.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class PackageTests(unittest.TestCase):
    def source(self,root,rows):
        path=root/'input.csv'
        with path.open('w',newline='') as stream:
            writer=csv.writer(stream);writer.writerow(['Date','Open','High','Low','Close']);writer.writerows(rows)
        return path

    def test_month_chunks_preserve_exact_prices_and_are_repeatable(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);out=root/'out';path=self.source(root,[
                ['2025-01-31T23:00:00Z','1.10000','1.30001','1.00000','1.20000'],
                ['2025-02-01T00:00:00Z','1.20000','1.40000','1.10000','1.30000']])
            a=module.package_file(path,'histdata','EURUSD','H1',out)
            b=module.package_file(path,'histdata','EURUSD','H1',out)
            self.assertEqual(a,b);self.assertEqual(len(a),2)
            self.assertFalse(any(x['published'] for x in a))
            data=json.loads(gzip.decompress((out/a[0]['object_path']).read_bytes()))
            self.assertEqual(data['candles'][0][1:],['1.10000','1.30001','1.00000','1.20000'])
            self.assertEqual(data['timezone'],'UTC')

    def test_invalid_or_duplicate_candles_rejected(self):
        for values in [('1','2','3','1'),('1','NaN','1','1')]:
            with self.subTest(values=values),tempfile.TemporaryDirectory() as folder:
                root=Path(folder);path=self.source(root,[['2025-01-01T00:00:00Z',*values]])
                with self.assertRaises((ValueError,ArithmeticError)):module.package_file(path,'histdata','EURUSD','H1',root/'out')
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);row=['2025-01-01T00:00:00Z','1','2','1','2'];path=self.source(root,[row,row])
            with self.assertRaises(ValueError):module.package_file(path,'histdata','EURUSD','H1',root/'out')

    def test_unsafe_identity_rejected(self):
        with self.assertRaises(ValueError):module.package_file(Path('unused'),'../','EURUSD','H1',Path('unused'))

if __name__=='__main__':unittest.main()
