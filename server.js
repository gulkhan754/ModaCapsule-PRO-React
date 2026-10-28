'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'public'),STORE=path.join(__dirname,'data','users.json');
const sessions=new Map();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const readUsers=()=>{try{return JSON.parse(fs.readFileSync(STORE,'utf8'))}catch{return []}};
const saveUsers=u=>{fs.mkdirSync(path.dirname(STORE),{recursive:true});fs.writeFileSync(STORE,JSON.stringify(u,null,2),{mode:0o600})};
const reply=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))};
const getBody=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>100000){reject(new Error('Payload too large'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)});
const hash=p=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex')};
const verify=(p,stored)=>{try{const [salt,digest]=stored.split(':');const actual=crypto.scryptSync(p,salt,64),expected=Buffer.from(digest,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected)}catch{return false}};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const current=req=>{const token=cookies(req).session;const s=sessions.get(token);if(!s)return null;if(s.until<Date.now()){sessions.delete(token);return null}return readUsers().find(u=>u.id===s.userId)||null};
const safe=u=>({id:u.id,name:u.name,email:u.email,createdAt:u.createdAt});
const session=(res,user)=>{const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{userId:user.id,until:Date.now()+7*86400000});return {'Set-Cookie':`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`}};
const UPLOADS=path.join(ROOT,'uploads');
const PORT=Number(process.env.PORT)||3000;
http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  if(url.pathname==='/api/me'&&req.method==='GET'){const u=current(req);return reply(res,u?200:401,u?{user:safe(u)}:{error:'Авторизация қажет'})}
  if(url.pathname==='/api/register'&&req.method==='POST'){
   const b=await getBody(req),name=String(b.name||'').trim(),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
   if(name.length<2||name.length>60||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||password.length>128)return reply(res,400,{error:'Аты, email және кемінде 8 таңбалы құпиясөз қажет'});
   const users=readUsers();if(users.some(u=>u.email===email))return reply(res,409,{error:'Бұл email тіркелген'});
   const user={id:crypto.randomUUID(),name,email,passwordHash:hash(password),createdAt:new Date().toISOString(),wardrobe:[],favorites:[],outfits:[],consultations:[]};users.push(user);saveUsers(users);return reply(res,201,{user:safe(user)},session(res,user));
  }
  if(url.pathname==='/api/login'&&req.method==='POST'){
   const b=await getBody(req),u=readUsers().find(x=>x.email===String(b.email||'').trim().toLowerCase());if(!u||!verify(String(b.password||''),u.passwordHash))return reply(res,401,{error:'Email немесе құпиясөз қате'});return reply(res,200,{user:safe(u)},session(res,u));
  }
  if(url.pathname==='/api/logout'&&req.method==='POST'){sessions.delete(cookies(req).session);return reply(res,200,{ok:true},{'Set-Cookie':'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
  const u=current(req);if(!u)return reply(res,401,{error:'Алдымен аккаунтқа кіріңіз'});
  if(url.pathname==='/api/photo'&&req.method==='POST'){
   const type=(req.headers['content-type']||'').split(';')[0],ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[type];if(!ext)return reply(res,415,{error:'JPG, PNG немесе WEBP қажет'});
   let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>2*1024*1024)return reply(res,413,{error:'Фото 2 МБ-тан аспауы керек'});chunks.push(c)}const b=Buffer.concat(chunks);
   const valid=ext==='.jpg'?b[0]===255&&b[1]===216&&b[2]===255:ext==='.png'?b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';if(!valid)return reply(res,400,{error:'Сурет файлы қате'});
   const dir=path.join(UPLOADS,u.id);fs.mkdirSync(dir,{recursive:true});const name=crypto.randomUUID()+ext;fs.writeFileSync(path.join(dir,name),b);return reply(res,201,{url:'/uploads/'+u.id+'/'+name});
  }
  if(url.pathname==='/api/profile'&&req.method==='GET')return reply(res,200,{user:safe(u),wardrobe:u.wardrobe,favorites:u.favorites,outfits:u.outfits,consultations:u.consultations});
  if(url.pathname==='/api/profile'&&req.method==='PUT'){
   const b=await getBody(req);if(!['wardrobe','favorites','outfits','consultations'].includes(b.field)||!Array.isArray(b.value)||b.value.length>150)return reply(res,400,{error:'Деректер дұрыс емес'});
   const serialized=JSON.stringify(b.value);if(serialized.length>80000)return reply(res,400,{error:'Деректер тым үлкен'});
   const users=readUsers(),target=users.find(x=>x.id===u.id);target[b.field]=b.value;saveUsers(users);return reply(res,200,{ok:true});
  }
  return reply(res,404,{error:'Маршрут табылмады'});
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{error:'Method not allowed'});
 const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);const file=path.resolve(ROOT,'.'+pathname);
 if(pathname.startsWith('/uploads/')){const u=current(req);if(!u||pathname.split('/')[2]!==u.id)return reply(res,403,{error:'Рұқсат жоқ'})}
 if(!file.startsWith(ROOT+path.sep))return reply(res,403,{error:'Forbidden'});
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res)});
 }catch(err){reply(res,400,{error:'Сұранысты өңдеу мүмкін болмады'})}
}).listen(PORT,()=>console.log(`ModaCapsule: http://localhost:${PORT}`));
