"""Daily provider check, verified UTC H1/D1 packaging, and private cloud upload.

Source publication dates determine freshness. Missing candles are never invented.
"""
import argparse,calendar,csv,gzip,hashlib,importlib.util,io,json,lzma,math,struct,tempfile,time,zipfile
from datetime import datetime,timedelta,timezone
from decimal import Decimal,InvalidOperation
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.error import HTTPError,URLError
from urllib.parse import urlencode
from urllib.request import Request,build_opener,HTTPCookieProcessor

HERE=Path(__file__).parent
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,HERE/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
Package=module('history_package','package-market-history.py');Upload=module('history_upload','upload-market-history.py')
PAIRS=['AUDCAD','AUDCHF','AUDNZD','EURUSD','EURGBP','EURCAD','EURCHF','EURJPY','EURAUD','EURNZD','USDCHF','USDJPY','USDCAD','CADCHF','CADJPY','GBPUSD','GBPCHF','GBPNZD','GBPAUD','GBPJPY','XAUUSD']
UTC=timezone.utc;EST=timezone(timedelta(hours=-5))
class Form(HTMLParser):
 def __init__(self):super().__init__();self.fields={}
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='input' and a.get('name') in ('tk','date','datemonth','platform','timeframe','fxpair'):self.fields[a['name']]=a.get('value','')
class Source:
 def __init__(self):self.opener=build_opener(HTTPCookieProcessor(CookieJar()));self.last=0
 def get(self,url,data=None,referer=None,maximum=15000000):
  for attempt in range(3):
   try:return self._get(url,data,referer,maximum)
   except HTTPError as e:
    if e.code not in (408,500,502,503,504) or attempt==2:raise
   except (URLError,TimeoutError,ConnectionError):
    if attempt==2:raise
   time.sleep(5*(attempt+1))
 def _get(self,url,data=None,referer=None,maximum=15000000):
  time.sleep(max(0,2-(time.monotonic()-self.last)));self.last=time.monotonic()
  headers={'User-Agent':'Mozilla/5.0 (TheOnePercent historical research)','Accept':'*/*'}
  if referer:headers['Referer']=referer
  try:
   with self.opener.open(Request(url,data=data,headers=headers),timeout=45) as r:
    raw=r.read(maximum+1)
    if len(raw)>maximum:raise ValueError('Source response exceeds allowance')
    return raw
  except HTTPError as e:
   if e.code==429:raise Upload.RateLimited('Provider rate limit; stopped requests until the next daily run') from None
   raise
 def histdata(self,pair,year,month):
  url=f'https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/{pair.lower()}/{year}/{month}'
  f=Form();f.feed(self.get(url,maximum=2000000).decode())
  if set(f.fields)!={'tk','date','datemonth','platform','timeframe','fxpair'}:raise ValueError('Archive not published yet')
  if f.fields['fxpair'].upper()!=pair or str(year) not in f.fields['date']:raise ValueError('Source identity mismatch')
  return self.get('https://www.histdata.com/get.php',urlencode(f.fields).encode(),url)

def minute_rows(archive,now):
 rows={};conflicts=set();invalid=duplicates=0
 with zipfile.ZipFile(io.BytesIO(archive)) as z:
  members=[m for m in z.infolist() if m.filename.lower().endswith('.csv')]
  if len(members)!=1 or members[0].file_size>150000000:raise ValueError('Unexpected ZIP contents')
  with z.open(members[0]) as raw:
   for record in csv.reader(io.TextIOWrapper(raw,encoding='utf-8-sig'),delimiter=';'):
    try:
     t=int(datetime.strptime(record[0],'%Y%m%d %H%M%S').replace(tzinfo=EST).timestamp());values=tuple(record[1:5]);o,h,l,c=map(Decimal,values)
     if len(values)!=4 or not all(v.is_finite() for v in (o,h,l,c)) or not 0<l<=min(o,c)<=max(o,c)<=h:raise ValueError('OHLC')
     if t+60>now:continue
     if t in rows:
      if rows[t]!=values:conflicts.add(t)
      else:duplicates+=1
     else:rows[t]=values
    except (ValueError,InvalidOperation,IndexError,OverflowError):invalid+=1
 for t in conflicts:rows.pop(t,None)
 return rows,{'invalid':invalid,'conflicting_minutes':len(conflicts),'duplicates':duplicates}

def aggregate(rows,seconds):
 out={}
 for t,values in sorted(rows.items()):
  key=t//seconds*seconds;o,h,l,c=values
  if key not in out:out[key]=[o,h,l,c]
  else:
   row=out[key]
   if Decimal(h)>Decimal(row[1]):row[1]=h
   if Decimal(l)<Decimal(row[2]):row[2]=l
   row[3]=c
 return out

def package(rows,provider,symbol,frame,folder,now):
 seconds={'H1':3600,'D1':86400}[frame];rows={t:v for t,v in rows.items() if t+seconds<=now}
 if not rows:return []
 path=folder/(symbol+'-'+frame+'.csv')
 with path.open('w',newline='',encoding='utf8') as f:
  writer=csv.writer(f);writer.writerow(['Date','Open','High','Low','Close'])
  for t,v in sorted(rows.items()):writer.writerow([datetime.fromtimestamp(t,UTC).isoformat(),*v])
 return Package.package_file(path,provider,symbol,frame,folder)

def dukascopy_rows(raw,year,month,now):
 decoded=lzma.decompress(raw,memlimit=64000000)
 if len(decoded)%24:raise ValueError('Invalid Dukascopy candle record size')
 origin=int(datetime(year,month,1,tzinfo=UTC).timestamp());end=origin+calendar.monthrange(year,month)[1]*86400;rows={};previous=-1
 for offset,o,c,l,h,volume in struct.iter_unpack('>5If',decoded):
  t=origin+offset
  if t+3600>now:continue
  if not origin<=t<end or t<=previous or not 0<l<=min(o,c)<=max(o,c)<=h or not math.isfinite(volume):raise ValueError('Invalid US30 OHLC')
  previous=t
  if volume==0 and o==h==l==c:continue
  rows[t]=tuple(f'{p//1000}.{p%1000:03d}' for p in (o,h,l,c))
 return rows

def run(client,folder,pairs,us30=True):
 now=int(time.time());today=datetime.fromtimestamp(now,UTC);current=(today.year,today.month);last=today.replace(day=1)-timedelta(days=1);earlier=last.replace(day=1)-timedelta(days=1);periods=[(earlier.year,earlier.month),(last.year,last.month),current];source=Source();report={'checked_at':today.isoformat(),'pairs':[],'errors':[],'publication':'private; website permissions are separate'}
 for pair in pairs:
  rows={};bad=set();quality=[];available=set()
  for year,month in periods:
   try:
    part,q=minute_rows(source.histdata(pair,year,month),now);quality.append(q);available.add((year,month))
    for t,v in part.items():
     if t in rows and rows[t]!=v:bad.add(t)
     rows[t]=v
   except Upload.RateLimited:
    (folder/'refresh-report.json').write_text(json.dumps(report,indent=2));client.request('/run',{'provider':'histdata','status':'rate_limited','details':report});raise
   except Exception as e:report['errors'].append({'pair':pair,'period':f'{year}-{month:02d}','error':str(e)})
  for t in bad:rows.pop(t,None)
  if not rows:continue
  # UTC month boundaries need five hours from the preceding fixed-EST source month.
  allowed={periods[i] for i in (1,2) if periods[i] in available and periods[i-1] in available}
  rows={t:v for t,v in rows.items() if (datetime.fromtimestamp(t,UTC).year,datetime.fromtimestamp(t,UTC).month) in allowed}
  if not rows:continue
  chunks=[]
  for frame,seconds in [('H1',3600),('D1',86400)]:chunks.extend(package(aggregate(rows,seconds),'histdata',pair,frame,folder,now))
  client.upload(chunks,folder);report['pairs'].append({'symbol':pair,'chunks':len(chunks),'last_candle':max((c['last_utc'] for c in chunks),default=None),'quality':quality});print(json.dumps(report['pairs'][-1]),flush=True)
 client.request('/run',{'provider':'histdata','status':'failed' if report['errors'] else 'complete','details':report})
 if us30:
  try:
   inventory=client.request('/inventory?provider=dukascopy&symbol=US30');done={x['month'][:7] for x in inventory if x['timeframe']=='H1'};duk=[]
   for year in range(2013,today.year+1):
    for month in range(1,13):
     if (year,month)<(2013,9) or (year,month)>current:continue
     if f'{year}-{month:02d}' in done and (year,month) not in periods:continue
     url=f'https://datafeed.dukascopy.com/datafeed/USA30IDXUSD/{year}/{month-1:02d}/BID_candles_hour_1.bi5'
     rows=dukascopy_rows(source.get(url,maximum=5000000),year,month,now);chunks=package(rows,'dukascopy','US30','H1',folder,now)+package(aggregate(rows,86400),'dukascopy','US30','D1',folder,now);client.upload(chunks,folder);duk.append({'month':f'{year}-{month:02d}','chunks':len(chunks)})
   client.request('/run',{'provider':'dukascopy','status':'complete','details':{'US30_mapping':'USA30IDXUSD CFD','periods':duk}})
  except Exception as e:
   client.request('/run',{'provider':'dukascopy','status':'rate_limited' if isinstance(e,Upload.RateLimited) else 'failed','details':{'error':str(e)}});report['errors'].append({'pair':'US30','error':str(e)})
 (folder/'refresh-report.json').write_text(json.dumps(report,indent=2));return report

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--token-file');p.add_argument('--out',type=Path,required=True);p.add_argument('--pairs',nargs='+',choices=PAIRS,default=PAIRS);p.add_argument('--skip-us30',action='store_true');args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
 client=Upload.Uploader(args.token_file);print(json.dumps({'database_before_refresh':client.request('/status')}),flush=True)
 report=run(client,args.out,args.pairs,not args.skip_us30)
 print(json.dumps({'pairs_updated':len(report['pairs']),'errors':len(report['errors'])}),flush=True)
 if report['errors']:raise SystemExit(1)

if __name__=='__main__':main()
