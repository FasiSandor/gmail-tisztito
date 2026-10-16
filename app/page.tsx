'use client';
import {useEffect,useRef,useState} from 'react';
import {Mail,Search,Plus,Trash2,ShieldCheck,HardDrive,Star,AlertTriangle,LoaderCircle,LogOut} from 'lucide-react';
type Sender={count:number;bytes:number};
type Page={ids:string[];count:number;bytes:number;protectedCount:number;failed:number;cursor:string|null;estimate:number;senders:Record<string,Sender>};
type Scan={ids:string[];count:number;bytes:number;protectedCount:number;failed:number;cursor:string|null;estimate:number;senders:Record<string,Sender>};
const empty=():Scan=>({ids:[],count:0,bytes:0,protectedCount:0,failed:0,cursor:null,estimate:0,senders:{}});
const size=(n:number)=>n>=1073741824?(n/1073741824).toFixed(2)+' GB':(n/1048576).toFixed(1)+' MB';
const storageKey=(email:string,q:string)=>'mc_scan_'+email+'_'+q;
export default function Home(){
 const [accounts,setAccounts]=useState<string[]>([]),[email,setEmail]=useState(''),[query,setQuery]=useState(''),[notice,setNotice]=useState('');
 const [result,setResult]=useState<Scan|null>(null),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[stopped,setStopped]=useState(false),[processed,setProcessed]=useState(0);
 const stop=useRef(false);
 async function refresh(){try{const r=await fetch('/api/accounts',{cache:'no-store'}),d=await r.json();setAccounts(d.accounts);setEmail(e=>d.accounts.includes(e)?e:(d.accounts[0]||''))}catch{setNotice('A fiókok betöltése sikertelen.')}}
 useEffect(()=>{void refresh();if(new URLSearchParams(location.search).has('error'))setNotice('A Google-belépés nem sikerült.')},[]);
 function clearResult(){stop.current=true;setResult(null);setConfirm(false);setStopped(false)}
 async function scan(resume=false){if(!email||!query.trim())return;stop.current=false;setBusy(true);setStopped(false);setNotice('');setConfirm(false);
  let current:Scan=empty();const key=storageKey(email,query.trim());
  if(resume){try{const v=sessionStorage.getItem(key);if(v)current=JSON.parse(v) as Scan}catch{}}else{sessionStorage.removeItem(key);setResult(null);setProcessed(0)}
  try{let hasMore=true;while(hasMore&&!stop.current){
   const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,query,cursor:current.cursor})});
   const d=await r.json() as Page & {error?:string};if(!r.ok)throw Error(d.error||'Keresési hiba');
   const senders={...current.senders};for(const [name,v] of Object.entries(d.senders||{})){const prior=senders[name]||{count:0,bytes:0};senders[name]={count:prior.count+v.count,bytes:prior.bytes+v.bytes}}
   current={ids:[...current.ids,...d.ids],count:current.count+d.count,bytes:current.bytes+d.bytes,protectedCount:current.protectedCount+d.protectedCount,failed:current.failed+d.failed,cursor:d.cursor,estimate:d.estimate||current.estimate,senders};
   setResult(current);setProcessed(current.count);try{sessionStorage.setItem(key,JSON.stringify(current))}catch{setNotice('A böngésző tárhelye megtelt, a folytatás csak ezen a megnyitott oldalon biztosított.')}
   hasMore=!!d.cursor;
  }setStopped(stop.current);
  }catch(e){setStopped(true);setNotice(e instanceof Error?e.message:'Vizsgálati hiba. A folytatás megpróbálható.')}finally{setBusy(false)}
 }
 async function trash(){if(!result||!confirm)return;setBusy(true);setNotice('');let moved=0,failed=0;const ids=result.ids;
 try{for(let i=0;i<ids.length;i+=100){const r=await fetch('/api/trash',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,ids:ids.slice(i,i+100),confirm:'KUKA'})});const d=await r.json();if(!r.ok)throw Error(d.error||'Törlési hiba');moved+=d.moved;failed+=d.failed;setNotice(moved+' levél a Kukába helyezve...')}
 setNotice(moved+' levél a Kukába került.'+(failed?' Sikertelen műveletek: '+failed+'.':'')+' A tárhely felszabadulásához a Kukát külön üríteni kell.');setResult(null);setConfirm(false);sessionStorage.removeItem(storageKey(email,query.trim()));
 }catch(e){setNotice((e instanceof Error?e.message:'Hiba')+'; eddig áthelyezve: '+moved+'. A következő keresés újraellenőrzi az üzeneteket.');setConfirm(false);setResult(null)}finally{setBusy(false)}
 }
 async function disconnect(){if(!window.confirm('Leválasztod a fiókot? A leveleid megmaradnak.'))return;await fetch('/api/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});clearResult();await refresh()}
 const ranked=Object.entries(result?.senders||{}).sort((a,b)=>b[1].count-a[1].count).slice(0,15);
 return <main className="shell">
 <header className="top"><div className="logo"><span className="logo-icon"><Mail size={23}/></span>MAIL <b>CLEANER</b></div><span className="secure"><ShieldCheck size={16}/> Titkosított kapcsolat</span></header>
 <section className="hero"><div className="eyebrow">GMAIL-TISZTÍTÓ · NAGY POSTAFIÓK</div><h1>Tegyél rendet a <span>leveleid között.</span></h1><p>Akár százezres postafiókban is, oldalanként vizsgálva. A fontos leveleket védjük, és a Kukába mozgatáshoz mindig jóváhagyást kérünk.</p></section>
 <section className="panel"><div className="section-head"><div><span className="eyebrow">01 / FIÓKOK</span><h2>Google-fiókok</h2></div><a className="primary light" href="/api/login"><Plus size={17}/> Fiók hozzáadása</a></div>
 {accounts.length?<div className="account-line"><select aria-label="Gmail-fiók" value={email} onChange={e=>{setEmail(e.target.value);clearResult()}}>{accounts.map(a=><option key={a} value={a}>{a}</option>)}</select><button className="icon-btn" title="Fiók leválasztása" onClick={disconnect}><LogOut size={19}/></button></div>:<div className="empty"><Mail size={30}/><b>Még nincs csatlakoztatott Gmail-fiók</b><p>Nyomd meg a Fiók hozzáadása gombot. A Google oldalán jelentkezel be.</p></div>}
 <div className="hint"><ShieldCheck size={16}/> Csak a kiválasztott fiókot vizsgáljuk. Gmail-jelszót nem tárolunk.</div></section>
 <section className="panel"><div className="section-head"><div><span className="eyebrow">02 / VIZSGÁLAT</span><h2>Mit tisztítsunk?</h2></div></div>
 <label htmlFor="search">Feladó e-mail-címe vagy Gmail keresés</label><div className="searchline"><Search size={20}/><input id="search" placeholder="hirlevel@webshop.hu vagy in:anywhere" value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);clearResult()}} onKeyDown={e=>{if(e.key==='Enter'&&!busy)void scan()}}/><button className="primary" onClick={()=>void scan()} disabled={busy||!email||!query.trim()}><Search size={17}/> Vizsgálat</button></div>
 <div className="chips">{[['Feladó','from:'],['Teljes postafiók','in:anywhere -in:trash -in:spam'],['10 MB felett','larger:10M'],['2 évnél régebbi','older_than:2y'],['Promóciók','category:promotions']].map(([label,q])=><button key={label} className="chip" disabled={busy} onClick={()=>{setQuery(q);clearResult()}}>{label}</button>)}</div>
 <p className="small">A vizsgálat 100 leveles oldalakon halad. A lapot hagyd nyitva vizsgálat közben; megszakítás után ugyanitt folytatható. Az összesítés Gmail API-becslés.</p></section>
 {(result||busy)&&<section className="panel"><div className="section-head"><div><span className="eyebrow">03 / EREDMÉNYEK</span><h2>{busy?'Vizsgálat folyamatban':'Találatok'}</h2></div></div>
 <div className="stats"><div className="stat"><Mail size={22}/><strong>{(result?.count||processed).toLocaleString('hu-HU')}</strong><span>Vizsgált levél</span></div><div className="stat"><HardDrive size={22}/><strong>{size(result?.bytes||0)}</strong><span>Becsült összméret</span></div><div className="stat"><Star size={22}/><strong>{result?.protectedCount||0}</strong><span>Védett levél</span></div></div>
 {busy?<button className="secondary" style={{marginTop:16}} onClick={()=>{stop.current=true}}>Vizsgálat megszakítása</button>:result?.cursor?<button className="primary" style={{marginTop:16}} onClick={()=>void scan(true)}>Vizsgálat folytatása</button>:<p className="safe"><ShieldCheck size={19}/> Vizsgálat befejezve.</p>}
 {result&&<><p className="small">Feladók rangsora az eddig megvizsgált levelekből:</p><div>{ranked.map(([name,v])=><div key={name} className="account-line" style={{padding:'8px 0',borderBottom:'1px solid #2a3445',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><span style={{wordBreak:'break-word',fontSize:13}}>{name}</span><span style={{color:'#60a5fa',fontSize:13}}>{v.count.toLocaleString('hu-HU')} db · {size(v.bytes)}</span></div>)}</div>
 {result.failed>0&&<p className="warning"><AlertTriangle size={18}/> {result.failed} levél adata nem volt elérhető.</p>}
 <p className="safe"><ShieldCheck size={19}/> <span><b>{result.ids.length.toLocaleString('hu-HU')} nem védett levél</b> helyezhető a Kukába.</span></p>
 {!busy&&(!confirm?<button className="danger wide" disabled={!result.ids.length||!!result.cursor} onClick={()=>setConfirm(true)}><Trash2 size={18}/> {result.cursor?'A teljes vizsgálat után törölhetsz':'Találatok Kukába helyezése'}</button>:<div className="confirm"><b>Biztosan áthelyezed ezt a {result.ids.length} levelet a Kukába?</b><p>Fiók: {email}. A művelet 100-as adagokban zajlik. A fontos és csillagozott leveleket ismételten ellenőrizzük.</p><div className="buttons"><button className="secondary" onClick={()=>setConfirm(false)}>Mégse</button><button className="danger" onClick={()=>void trash()}><Trash2 size={18}/> Igen, a Kukába</button></div></div>)}
 <p className="small">A Kuka ürítése külön Gmail-művelet. A becsült levélméret nem egyenlő a garantált tárhelynyereséggel.</p></>}
 </section>}
 {notice&&<div className="notice" role="status">{notice}</div>}<footer>MAIL CLEANER · NINCS AUTOMATIKUS VÉGLEGES TÖRLÉS</footer>
 </main>
}
