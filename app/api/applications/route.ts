import {applicationDb} from '@/lib/application-db';
export async function POST(request:Request){
if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'請從本網站送出申請。'},{status:403});
if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'無效的資料格式。'},{status:415});
const raw=await request.text();if(raw.length>10000)return Response.json({error:'內容太長，請縮短後再試。'},{status:413});
let p;try{p=JSON.parse(raw);}catch{return Response.json({error:'資料格式錯誤。'},{status:400});}
if(!p||typeof p!=='object')return Response.json({error:'請填寫申請資料。'},{status:400});
if(p.website)return Response.json({error:'無法送出申請。'},{status:400});
const valid=(s:unknown,max:number)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
if(!valid(p.name,60)||!valid(p.email,200)||!/^\S+@\S+\.\S+$/.test(p.email)||!valid(p.city,60)||!['父母的故事','自己的故事','家族與手藝'].includes(p.purpose)||p.consent!==true||typeof p.story!=='string'||p.story.length>1500)return Response.json({error:'請確認稱呼、Email、縣市與資料使用同意。'},{status:400});
try{const db=applicationDb();const email=p.email.trim().toLowerCase();const recent=await db.prepare('SELECT id FROM applications WHERE email = ? AND created_at > ? LIMIT 1').bind(email,Date.now()-60000).first();if(recent)return Response.json({error:'剛剛已收到此 Email 的申請，請勿重複送出。'},{status:429});
await db.prepare('INSERT INTO applications (id,name,email,city,purpose,story,consent_version,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),p.name.trim(),email,p.city.trim(),p.purpose,p.story.trim(),'pilot-v1',Date.now()).run();return Response.json({saved:true},{status:201});
}catch(error){console.error('Application save failed',error);return Response.json({error:'目前無法保存申請，內容尚未送出，請稍後重試。'},{status:503});}}
