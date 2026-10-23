"""Upload verified compressed history to the private Supabase bucket.

Uses a short-lived local upload token or GitHub Actions OIDC; never a browser key.
"""
import argparse,base64,hashlib,json,os,time
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError

ENDPOINT='https://ecnxstqfnjaiibwiwwto.supabase.co/functions/v1/history-ingest'
class RateLimited(RuntimeError):pass

class Uploader:
 def __init__(self,token_file=None):self.local=Path(token_file).read_text().strip() if token_file else None;self.jwt=None;self.jwt_at=0;self.remote_hashes=None
 def headers(self):
  if self.local:return {'X-History-Upload-Token':self.local}
  if not self.jwt or time.time()-self.jwt_at>240:
   url=os.environ['ACTIONS_ID_TOKEN_REQUEST_URL']+'&audience='+ENDPOINT
   request=Request(url,headers={'Authorization':'Bearer '+os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
   with urlopen(request,timeout=30) as response:self.jwt=json.load(response)['value'];self.jwt_at=time.time()
  return {'Authorization':'Bearer '+self.jwt}
 def request(self,path,body=None):
  encoded=None if body is None else json.dumps(body,separators=(',',':')).encode()
  for attempt in range(3):
   try:
    req=Request(ENDPOINT+path,data=encoded,headers={**self.headers(),'Content-Type':'application/json'})
    with urlopen(req,timeout=120) as response:return json.load(response)
   except HTTPError as e:
    if e.code==429:
     if attempt==2:raise RateLimited('Upload rate limited; retry on the next scheduled run') from None
     delay=max(60,int(e.headers.get('Retry-After','60')));print(json.dumps({'storage_backoff_seconds':delay}),flush=True);time.sleep(delay);continue
    if e.code<500 or attempt==2:
     detail=e.read(1000).decode(errors='replace');raise RuntimeError('History gateway HTTP '+str(e.code)+': '+detail) from None
   except OSError:
    if attempt==2:raise
   time.sleep(2**attempt*2)
 def upload(self,chunks,root,ledger=None,max_chunks=None):
  root=Path(root).resolve();ledger=Path(ledger) if ledger else None
  done=set()
  if ledger and ledger.exists():
   state=json.loads(ledger.read_text())
   if state.get('endpoint')!=ENDPOINT:raise ValueError('Upload ledger belongs to another endpoint')
   done=set(state['uploaded'])
  if self.remote_hashes is None:self.remote_hashes=set(self.request('/hashes'))
  # The server inventory is authoritative; an old Storage-pilot ledger is not proof of a database payload.
  done=set(self.remote_hashes)
  pending=[m for m in chunks if m['sha256'] not in done]
  if max_chunks:pending=pending[:max_chunks]
  sent=0;batch=[];size=0
  def flush():
   nonlocal batch,size,sent
   if not batch:return
   result=self.request('/batch',{'chunks':batch});sent+=result['stored'];done.update(c['meta']['sha256'] for c in batch);self.remote_hashes.update(c['meta']['sha256'] for c in batch)
   if ledger:
    ledger.parent.mkdir(parents=True,exist_ok=True);tmp=ledger.with_suffix('.tmp');tmp.write_text(json.dumps({'endpoint':ENDPOINT,'uploaded':sorted(done)}));tmp.replace(ledger)
   print(json.dumps({'uploaded_this_run':sent,'remaining_this_run':len(pending)-sent,'private':True}),flush=True);batch=[];size=0
  for meta in pending:
   path=(root/meta['object_path']).resolve()
   if not path.is_relative_to(root):raise ValueError('Chunk outside package directory')
   raw=path.read_bytes()
   if len(raw)!=meta['bytes'] or hashlib.sha256(raw).hexdigest()!=meta['sha256']:raise ValueError('Local chunk checksum mismatch')
   item={'meta':meta,'data':base64.b64encode(raw).decode()};length=len(json.dumps(item))
   if length>1500000:raise ValueError('Chunk exceeds gateway batch allowance')
   if len(batch)>=64 or size+length>1500000:flush()
   batch.append(item);size+=length
  flush();return sent

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--package',type=Path,required=True);p.add_argument('--token-file',type=Path);p.add_argument('--max-chunks',type=int);p.add_argument('--shard',type=int,default=0);p.add_argument('--shards',type=int,default=1);p.add_argument('--dry-run',action='store_true');args=p.parse_args()
 manifest=json.loads((args.package/'upload-manifest.json').read_text());chunks=manifest['datasets']
 if not 0<=args.shard<args.shards<=4:raise ValueError('Use 1–4 shards and a valid shard index')
 chunks=[c for i,c in enumerate(chunks) if i%args.shards==args.shard]
 summary={'chunks':len(chunks),'bytes':sum(c['bytes'] for c in chunks),'symbols':sorted({c['symbol'] for c in chunks})};print(json.dumps(summary),flush=True)
 if args.dry_run:return
 client=Uploader(args.token_file);print(json.dumps({'before':client.request('/status')}),flush=True)
 client.upload(chunks,args.package,args.package/('upload-state.json' if args.shards==1 else f'upload-state-{args.shard}-of-{args.shards}.json'),args.max_chunks)
 print(json.dumps({'after':client.request('/status')}),flush=True)

if __name__=='__main__':main()
