import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {randomBytes,createHash} from 'node:crypto';
import {api,active,session,save,sameOrigin} from '@/lib/gmail';
export const runtime='nodejs';
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
type C={params:Promise<{action:string}>};
export async function GET(req:Request,{params}:C){const {action}=await params;
 if(action==='accounts')return json({accounts:(await session()).map(a=>a.email)});
 if(action==='login'){if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.APP_URL||!process.env.SESSION_SECRET)return json({error:'Google OAuth még nincs beállítva.'},503);
 const state=randomBytes(24).toString('hex'),verifier=randomBytes(32).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const [k,v] of Object.entries({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:new URL('/api/callback',process.env.APP_URL).toString(),response_type:'code',scope:'openid email https://www.googleapis.com/auth/gmail.modify',access_type:'offline',prompt:'consent select_account',state,code_challenge:challenge,code_challenge_method:'S256'}))url.searchParams.set(k,v);
 const response=NextResponse.redirect(url);const opt={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:600};response.cookies.set('mc_oauth_state',state,opt);response.cookies.set('mc_oauth_verifier',verifier,opt);return response;
 }
 if(action==='callback'){const url=new URL(req.url),jar=await cookies();const state=jar.get('mc_oauth_state')?.value,verifier=jar.get('mc_oauth_verifier')?.value,code=url.searchParams.get('code');const home=new URL('/',process.env.APP_URL||url.origin);
 if(!code||!state||!verifier||url.searchParams.get('state')!==state)return NextResponse.redirect(new URL('/?error=auth',home));
 try{const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||'',client_secret:process.env.GOOGLE_CLIENT_SECRET||'',redirect_uri:new URL('/api/callback',process.env.APP_URL).toString(),grant_type:'authorization_code',code,code_verifier:verifier}),cache:'no-store'});if(!r.ok)throw Error('OAuth error');const t=await r.json();const p=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+t.access_token},cache:'no-store'});if(!p.ok)throw Error('Profile error');const u=await p.json();if(!u.email_verified||!u.email)throw Error('Unverified');const old=await session(),prior=old.find(a=>a.email===u.email);await save([...old.filter(a=>a.email!==u.email),{email:u.email,access:t.access_token,refresh:t.refresh_token||prior?.refresh,expiry:Date.now()+t.expires_in*1000}].slice(-4));const res=NextResponse.redirect(home);res.cookies.delete('mc_oauth_state');res.cookies.delete('mc_oauth_verifier');return res}catch{return NextResponse.redirect(new URL('/?error=auth',home))}
 }
 return json({error:'Ismeretlen művelet'},404)
}
export async function POST(req:Request,{params}:C){const {action}=await params;if(!sameOrigin(req))return json({error:'Tiltott kérés'},403);
 try{const body=await req.json();const email=String(body.email||'');
 if(action==='disconnect'){await save((await session()).filter(a=>a.email!==email));return json({ok:true})}
 if(action==='search'){let q=String(body.query||'').trim();if(!q||q.length>180)return json({error:'Érvénytelen keresés'},400);if(/^[^\\s@:]+@[^\\s@:]+\\.[^\\s@:]+$/.test(q))q='from:'+q;
 const cursor=typeof body.cursor==='string'&&body.cursor.length<3000?body.cursor:undefined;
 const a=await active(email);const p=new URLSearchParams({q,maxResults:'100'});if(cursor)p.set('pageToken',cursor);
 const data=await api(a,'/messages?'+p);
 const ids:string[]=(data.messages||[]).map((x:{id:string})=>x.id);
 let bytes=0,protectedCount=0,failed=0;const eligible:string[]=[];const senders:Record<string,{count:number;bytes:number}>={};
 for(let i=0;i<ids.length;i+=10){await Promise.all(ids.slice(i,i+10).map(async id=>{try{const m=await api(a,'/messages/'+id+'?format=metadata&metadataHeaders=From&fields=id,sizeEstimate,labelIds,payload/headers');bytes+=Number(m.sizeEstimate||0);const raw=String((m.payload?.headers||[]).find((h:{name:string})=>h.name.toLowerCase()==='from')?.value||'Ismeretlen');const sender=(raw.match(/<([^<>]+@[^<>]+)>/)?.[1]||raw).trim().toLowerCase().slice(0,180);const entry=senders[sender]||(senders[sender]={count:0,bytes:0});entry.count++;entry.bytes+=Number(m.sizeEstimate||0);if((m.labelIds||[]).some((l:string)=>l==='IMPORTANT'||l==='STARRED'))protectedCount++;else eligible.push(id)}catch{failed++}}))}
 return json({ids:eligible,count:ids.length,bytes,protectedCount,failed,senders,cursor:data.nextPageToken||null,estimate:Number(data.resultSizeEstimate||0),query:q})}
 if(action==='trash'){const ids=body.ids;if(body.confirm!=='KUKA'||!Array.isArray(ids)||ids.length<1||ids.length>2000||ids.some((id:unknown)=>typeof id!=='string'||!/^[a-zA-Z0-9]+$/.test(id)))return json({error:'Érvénytelen megerősítés'},400);const a=await active(email);let moved=0,failed=0;for(let i=0;i<ids.length;i+=10){await Promise.all(ids.slice(i,i+10).map(async(id:string)=>{try{const m=await api(a,'/messages/'+id+'?format=minimal&fields=labelIds');if((m.labelIds||[]).some((l:string)=>['STARRED','IMPORTANT','TRASH'].includes(l)))return;await api(a,'/messages/'+id+'/trash','POST');moved++}catch{failed++}}))}return json({moved,failed})}
 return json({error:'Ismeretlen művelet'},404)
 }catch(e){return json({error:e instanceof Error?e.message:'Ismeretlen hiba'},400)}
}
