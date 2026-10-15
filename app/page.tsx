'use client';
import {useEffect,useState} from 'react';
import {Mail,Search,Plus,Trash2,ShieldCheck,HardDrive,Star,AlertTriangle,LoaderCircle,LogOut} from 'lucide-react';
type Result={ids:string[];count:number;bytes:number;protectedCount:number;failed:number;truncated:boolean;query:string};
const size=(n:number)=>n>=1073741824?(n/1073741824).toFixed(2)+' GB':(n/1048576).toFixed(1)+' MB';
export default function Home(){
 const [accounts,setAccounts]=useState<string[]>([]),[email,setEmail]=useState(''),[query,setQuery]=useState(''),[notice,setNotice]=useState('');
 const [result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 async function refresh(){try{const r=await fetch('/api/accounts',{cache:'no-store'}),d=await r.json();setAccounts(d.accounts);setEmail(e=>d.accounts.includes(e)?e:(d.accounts[0]||''))}catch{setNotice('A fiókok betöltése sikertelen.')}} 
 useEffect(()=>{void refresh();if(new URLSearchParams(location.search).has('error'))setNotice('A Google-belépés nem sikerült.')},[]);
 async function search(){if(!email||!query.trim())return;setBusy(true);setResult(null);setNotice('');setConfirm(false);try{const r=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,query})}),d=await r.json();if(!r.ok)throw Error(d.error);setResult(d)}catch(e){setNotice(e instanceof Error?e.message:'Keresési hiba')}finally{setBusy(false)}}
 async function trash(){if(!result||!confirm)return;setBusy(true);setNotice('');try{const r=await fetch('/api/trash',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,ids:result.ids,confirm:'KUKA'})}),d=await r.json();if(!r.ok)throw Error(d.error);setNotice(d.moved+' levél a Kukába került.'+(d.failed?' Sikertelen: '+d.failed+'.':'')+' A tárhely a Kuka ürítése után szabadulhat fel.');setResult(null);setConfirm(false)}catch(e){setNotice(e instanceof Error?e.message:'Törlési hiba')}finally{setBusy(false)}}
 async function disconnect(){if(!confirmAccount())return;await fetch('/api/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});setResult(null);await refresh()}
 function confirmAccount(){return window.confirm('Leválasztod ezt a fiókot? A leveleid érintetlenek maradnak.')}
 return <main className="shell">
 <header className="top"><div className="logo"><span className="logo-icon"><Mail size={23}/></span>MAIL <b>CLEANER</b></div><span className="secure"><ShieldCheck size={16}/> Titkosított kapcsolat</span></header>
 <section className="hero"><div className="eyebrow">GMAIL-TISZTÍTÓ · V1</div><h1>Tegyél rendet a <span>leveleid között.</span></h1><p>Válassz Gmail-fiókot, keress rá a felesleges levelekre, és nézd meg, mennyi helyet foglalnak. Törlés csak a jóváhagyásoddal.</p></section>
 <section className="panel"><div className="section-head"><div><span className="eyebrow">01 / FIÓKOK</span><h2>Google-fiókok</h2></div><a className="primary light" href="/api/login"><Plus size={17}/> Fiók hozzáadása</a></div>
 {accounts.length?<div className="account-line"><select aria-label="Gmail-fiók" value={email} onChange={e=>{setEmail(e.target.value);setResult(null);setConfirm(false)}}>{accounts.map(a=><option key={a} value={a}>{a}</option>)}</select><button className="icon-btn" title="Fiók leválasztása" onClick={disconnect}><LogOut size={19}/></button></div>:<div className="empty"><Mail size={30}/><b>Még nincs csatlakoztatott Gmail-fiók</b><p>Nyomd meg a Fiók hozzáadása gombot. Kizárólag a Google bejelentkező oldalán adod meg a jelszavadat.</p></div>}
 <div className="hint"><ShieldCheck size={16}/> Egy keresés mindig csak a kiválasztott Gmail-fiókra vonatkozik.</div></section>
 <section className="panel"><div className="section-head"><div><span className="eyebrow">02 / KERESÉS</span><h2>Mit tisztítsunk?</h2></div></div>
 <label htmlFor="search">Feladó e-mail-címe vagy Gmail keresés</label><div className="searchline"><Search size={20}/><input id="search" placeholder="hirlevel@webshop.hu" value={query} onChange={e=>{setQuery(e.target.value);setResult(null)}} onKeyDown={e=>{if(e.key==='Enter')void search()}}/><button className="primary" onClick={search} disabled={busy||!email||!query.trim()}>{busy?<LoaderCircle className="spin" size={17}/>:<Search size={17}/>} Keresés</button></div>
 <div className="chips">{[['Feladó','from:'],['10 MB felett','larger:10M'],['2 évnél régebbi','older_than:2y'],['Promóciók','category:promotions']].map(([label,q])=><button key={label} className="chip" onClick={()=>{setQuery(q);setResult(null)}}>{label}</button>)}</div>
 <p className="small">Ha csak e-mail-címet írsz be, az alkalmazás automatikusan feladóként keresi.</p></section>
 {result&&<section className="panel"><div className="section-head"><div><span className="eyebrow">03 / EREDMÉNYEK</span><h2>Találatok</h2></div></div>
 <div className="stats"><div className="stat"><Mail size={22}/><strong>{result.count.toLocaleString('hu-HU')}</strong><span>Vizsgált levél</span></div><div className="stat"><HardDrive size={22}/><strong>{size(result.bytes)}</strong><span>Vizsgált levélméret</span></div><div className="stat"><Star size={22}/><strong>{result.protectedCount}</strong><span>Védett levél</span></div></div>
 {(result.truncated||result.failed>0)&&<p className="warning"><AlertTriangle size={18}/>{result.truncated?'Legfeljebb 2000 levelet vizsgálunk keresésenként. ':''}{result.failed?'Nem ellenőrizhető levelek: '+result.failed+'.':''}</p>}
 <p className="safe"><ShieldCheck size={19}/><span><b>{result.ids.length.toLocaleString('hu-HU')} levél</b> helyezhető a Kukába. A fontos és csillagozott leveleket kihagyjuk.</span></p>
 {!confirm?<button className="danger wide" disabled={result.ids.length===0||busy} onClick={()=>setConfirm(true)}><Trash2 size={18}/> Találatok Kukába helyezése</button>:<div className="confirm"><b>Biztosan áthelyezed ezt a {result.ids.length} levelet a Kukába?</b><p>Fiók: {email}. A levelek visszaállíthatók, amíg a Kukában vannak.</p><div className="buttons"><button className="secondary" onClick={()=>setConfirm(false)}>Mégse</button><button className="danger" disabled={busy} onClick={trash}>{busy?<LoaderCircle className="spin" size={18}/>:<Trash2 size={18}/>} Igen, a Kukába</button></div></div>}
 <p className="small">A méret Gmail API-becslés, nem a garantáltan felszabaduló tárhely. A Kukát külön a Gmailben ürítheted.</p></section>}
 {notice&&<div className="notice" role="status">{notice}</div>}
 <footer>MAIL CLEANER · NINCS AUTOMATIKUS VÉGLEGES TÖRLÉS</footer>
 </main>
}
