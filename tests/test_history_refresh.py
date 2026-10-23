import importlib.util,io,json,struct,lzma,unittest,zipfile,tempfile
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('refresh',ROOT/'tools/refresh-market-history.py');R=importlib.util.module_from_spec(spec);spec.loader.exec_module(R)
def archive(text):
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w') as z:z.writestr('source.csv',text)
 return out.getvalue()
class RefreshTests(unittest.TestCase):
 def test_fixed_est_duplicate_conflicts_and_future_cutoff(self):
  raw=archive('20260101 000000;1;2;1;2;0\n20260101 000000;1;2;1;2;0\n20260101 000100;1;3;1;2;0\n20260101 000100;1;4;1;2;0\n20260101 000200;2;1;1;2;0\n20270101 000000;1;2;1;2;0\n')
  rows,quality=R.minute_rows(raw,int(datetime(2026,10,23,tzinfo=timezone.utc).timestamp()));t=int(datetime(2026,1,1,5,tzinfo=timezone.utc).timestamp());self.assertEqual(rows,{t:('1','2','1','2')});self.assertEqual(quality,{'invalid':1,'conflicting_minutes':1,'duplicates':1})
 def test_decimal_aggregation_preserves_actual_extremes(self):
  result=R.aggregate({0:('1.123456789','1.2','1.0','1.15'),60:('1.15','1.300000001','1.05','1.2')},3600)
  self.assertEqual(result,{0:['1.123456789','1.300000001','1.0','1.2']})
 def test_partial_hour_is_not_packaged(self):
  with tempfile.TemporaryDirectory() as folder:
   chunks=R.package({0:['1','2','1','2'],3600:['1','2','1','2']},'histdata','EURUSD','H1',Path(folder),4000)
   self.assertEqual(len(chunks),1);self.assertEqual(chunks[0]['candle_count'],1);self.assertFalse(chunks[0]['published'])
 def test_usa30_scale_and_future_hour(self):
  origin=int(datetime(2026,1,1,tzinfo=timezone.utc).timestamp());raw=lzma.compress(struct.pack('>5If',0,40000123,40002123,39999123,40003123,1.0)+struct.pack('>5If',3600,40000123,40002123,39999123,40003123,1.0));rows=R.dukascopy_rows(raw,2026,1,origin+3700)
  self.assertEqual(rows,{origin:('40000.123','40003.123','39999.123','40002.123')})
 def test_upload_paths_cannot_escape_package(self):
  with tempfile.TemporaryDirectory() as folder:
   with self.assertRaisesRegex(ValueError,'outside'):
    client=R.Upload.Uploader();client.remote_hashes=set();client.upload([{'object_path':'../outside','sha256':'a'*64,'bytes':1}],folder)
 def test_daily_workflow_has_no_server_secret(self):
  workflow=(ROOT/'.github/workflows/history-refresh.yml').read_text();self.assertIn('id-token: write',workflow);self.assertIn("20 3 * * *",workflow);self.assertNotIn('SERVICE_ROLE',workflow)
if __name__=='__main__':unittest.main()
