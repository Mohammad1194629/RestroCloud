
(function(){
const c=window.DEMO_CONFIG;
const key='rc-demo-'+c.id;
let state={cart:[],category:'الكل',view:'customer',orders:[],services:[]};
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');state.orders=saved.orders||[];state.services=saved.services||[];}catch(e){}
const app=document.getElementById('app');
const money=n=>Number(n).toLocaleString('en-US')+' د.ع';
const save=()=>localStorage.setItem(key,JSON.stringify({orders:state.orders,services:state.services}));
function render(){
let total=state.cart.reduce((s,x)=>s+x.price*x.qty,0);
let cats=['الكل'].concat([...new Set(c.menu.map(x=>x.cat))]);
let html='<div class="wrap"><div class="top"><div class="brand"><span class="mark">'+c.mark+'</span><div>'+c.name+'<div class="tag">معاينة RestroCloud · بيانات افتراضية</div></div></div><span class="pill" style="background:#e9e5d9;color:#596b45;border:0">تجريبي</span></div>';
html+='<header class="hero"><small>'+c.kicker+'</small><h1>'+c.name+'</h1><p>'+c.description+'</p><span class="pill">📍 '+c.location+'　 ·　 🕒 '+c.hours+'</span></header>';
html+='<div class="tabs"><button class="'+(state.view==='customer'?'active':'')+'" data-view="customer">واجهة الزبون</button><button class="'+(state.view==='staff'?'active':'')+'" data-view="staff">لوحة الموظف ('+state.orders.filter(x=>x.status!=='مكتمل').length+')</button></div>';
if(state.view==='customer'){
html+='<div class="sectionhead"><div><h2>قائمة الطعام</h2><div class="muted">اختر ما تشتهي، وسنجهز طلبك بكل سرور</div></div><span class="badge">قائمة تجريبية</span></div><div class="categories">';
cats.forEach(x=>html+='<button class="'+(state.category===x?'active':'')+'" data-cat="'+x+'">'+x+'</button>');
html+='</div><div class="grid">';
c.menu.filter(x=>state.category==='الكل'||x.cat===state.category).forEach((x,i)=>html+='<article class="item"><div class="foodpic">'+x.icon+'</div><h3>'+x.name+'</h3><p>'+x.desc+'</p><div class="itemfoot"><span class="price">'+money(x.price)+'</span><button class="add" data-add="'+x.id+'">أضف +</button></div></article>');
html+='</div><section class="panel"><div class="row"><h2 style="font-size:18px;margin:0">سلة الطلب</h2><span class="badge">'+state.cart.reduce((s,x)=>s+x.qty,0)+' صنف</span></div>';
if(!state.cart.length)html+='<p class="muted">السلة فارغة حالياً. أضف أصنافاً من القائمة.</p>';
state.cart.forEach(x=>html+='<div class="row cartline"><div><b>'+x.name+'</b><div class="muted">'+money(x.price*x.qty)+'</div></div><div class="qty"><button data-minus="'+x.id+'">−</button>'+x.qty+'<button data-plus="'+x.id+'">+</button></div></div>');
html+='<div class="row" style="margin:12px 0"><b>المجموع</b><b>'+money(total)+'</b></div><label class="muted">رقم الطاولة</label><select id="table" class="field"><option value="">اختر رقم الطاولة</option>'+Array.from({length:20},(_,i)=>'<option value="'+(i+1)+'">طاولة '+(i+1)+'</option>').join('')+'</select><button class="primary" id="send" style="width:100%;margin-top:10px" '+(!state.cart.length?'disabled':'')+'>إرسال الطلب للمطعم</button></section>';
html+='<section class="panel"><h2 style="font-size:18px;margin-top:0">خدمات الطاولة</h2><p class="muted">اطلب المساعدة دون مغادرة الطاولة.</p><div class="servicegrid"><button data-service="النادل">🙋 طلب نادل</button><button data-service="الفاتورة">🧾 طلب فاتورة</button><button data-service="التنظيف">🧹 طلب تنظيف</button></div><select id="service-table" class="field" style="margin-top:10px"><option value="">اختر الطاولة</option>'+Array.from({length:20},(_,i)=>'<option value="'+(i+1)+'">طاولة '+(i+1)+'</option>').join('')+'</select></section>';
}else{
html+='<div class="sectionhead"><div><h2>لوحة الموظف</h2><div class="muted">إدارة الطلبات والخدمات الواردة من الزبائن</div></div></div><div class="grid"><div class="panel"><div class="muted">عدد الطلبات</div><h2>'+state.orders.length+'</h2></div><div class="panel"><div class="muted">مجموع المبيعات التجريبية</div><h2>'+money(state.orders.reduce((s,x)=>s+x.total,0))+'</h2></div></div><h3>الطلبات</h3>';
if(!state.orders.length)html+='<div class="panel muted">لا توجد طلبات. أرسل طلباً من واجهة الزبون لتجربتها.</div>';
state.orders.forEach(o=>{html+='<div class="order"><div class="row"><b>طلب #'+o.id+' · طاولة '+o.table+'</b><span class="badge">'+o.status+'</span></div><div class="muted">'+o.time+'</div>'+o.items.map(x=>'<div class="row orderline"><span>'+x.name+' × '+x.qty+'</span><b>'+money(x.price*x.qty)+'</b></div>').join('')+'<div class="row" style="margin-top:10px"><b>المجموع</b><b>'+money(o.total)+'</b></div><select class="field" data-status="'+o.id+'">'+['جديد','قيد التحضير','جاهز','مكتمل'].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div>';});
html+='<h3>طلبات الخدمات</h3>';
if(!state.services.length)html+='<div class="panel muted">لا توجد طلبات خدمات حتى الآن.</div>';
state.services.forEach(s=>html+='<div class="order row"><div><b>'+s.kind+' · طاولة '+s.table+'</b><div class="muted">'+s.time+'</div></div><button class="'+(s.done?'secondary':'primary')+'" data-done="'+s.id+'">'+(s.done?'تم التنفيذ':'إنهاء الطلب')+'</button></div>');
html+='<button class="secondary" id="clear">مسح بيانات التجربة</button>';
}
html+='<footer>© RestroCloud · نموذج توضيحي غير متصل بنظام المطعم الحقيقي<br>الأسعار والأصناف وبيانات التشغيل افتراضية لأغراض المعاينة فقط.</footer></div>';
app.innerHTML=html;
app.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();});
app.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;render();});
app.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{let p=c.menu.find(x=>String(x.id)===b.dataset.add),f=state.cart.find(x=>x.id===p.id);if(f)f.qty++;else state.cart.push({...p,qty:1});render();});
app.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{let x=state.cart.find(x=>String(x.id)===b.dataset.plus);x.qty++;render();});
app.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{let x=state.cart.find(x=>String(x.id)===b.dataset.minus);x.qty--;state.cart=state.cart.filter(x=>x.qty>0);render();});
const send=app.querySelector('#send');if(send)send.onclick=()=>{let t=app.querySelector('#table').value;if(!t){alert('اختر رقم الطاولة أولاً');return;}let sum=state.cart.reduce((s,x)=>s+x.price*x.qty,0);state.orders.unshift({id:Date.now().toString().slice(-6),table:t,items:state.cart.map(x=>({...x})),total:sum,status:'جديد',time:new Date().toLocaleTimeString('ar-IQ')});state.cart=[];save();alert('تم إرسال طلبك التجريبي إلى لوحة الموظف.');render();};
app.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{let t=app.querySelector('#service-table').value;if(!t){alert('اختر رقم الطاولة أولاً');return;}state.services.unshift({id:Date.now().toString(),table:t,kind:b.dataset.service,time:new Date().toLocaleTimeString('ar-IQ'),done:false});save();alert('تم إرسال طلب '+b.dataset.service+' للطاولة '+t);render();});
app.querySelectorAll('[data-status]').forEach(s=>s.onchange=()=>{let o=state.orders.find(x=>x.id===s.dataset.status);o.status=s.value;save();render();});
app.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{let s=state.services.find(x=>x.id===b.dataset.done);s.done=true;save();render();});
const clear=app.querySelector('#clear');if(clear)clear.onclick=()=>{if(confirm('هل تريد مسح طلبات وخدمات المعاينة؟')){state.orders=[];state.services=[];save();render();}};
}
render();
})();