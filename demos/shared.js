(function(){
const c=window.DEMO_CONFIG,key='rc-demo-'+c.id,app=document.getElementById('app');
const money=n=>Number(n).toLocaleString('en-US')+' د.ع';
let state={cart:[],category:'الكل',view:'customer',admin:'orders',orders:[],services:[],table:'',lastReceipt:null,menu:c.menu.map(x=>({...x})),ownerMessage:''};
try{const z=JSON.parse(localStorage.getItem(key)||'{}');state.orders=z.orders||[];state.services=z.services||[];state.menu=z.menu||state.menu;state.ownerMessage=z.ownerMessage||'';}catch(e){}
const save=()=>localStorage.setItem(key,JSON.stringify({orders:state.orders,services:state.services,menu:state.menu,ownerMessage:state.ownerMessage}));
function beep(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.value=.08;o.start();o.stop(a.currentTime+.22);setTimeout(()=>a.close(),400);}catch(e){}}
function render(){
const total=state.cart.reduce((s,x)=>s+x.price*x.qty,0),cats=['الكل',...new Set(state.menu.map(x=>x.cat))],tableOpts=Array.from({length:30},(_,i)=>'<option value="'+(i+1)+'" '+(state.table==String(i+1)?'selected':'')+'>طاولة '+(i+1)+'</option>').join('');
let h='<div class="wrap"><div class="top"><div class="brand"><span class="mark">'+c.mark+'</span><div>'+c.name+'<div class="tag">منيو إلكتروني · RestroCloud</div></div></div><button class="navbtn" id="home">☰ القائمة</button></div>';
h+='<header class="hero"><small>'+c.kicker+'</small><h1>'+c.name+'</h1><p>'+c.description+'</p><span class="pill">📍 '+(c.address||'تلعفر · العنوان تجريبي')+'</span></header>';
h+='<div class="info-strip"><div class="info-cell"><span class="info-icon">☎️</span><span><b>الحجز</b><br>'+(c.phone||'رقم تجريبي')+'</span></div><div class="info-cell"><span class="info-icon">📍</span><span><b>العنوان</b><br>تلعفر</span></div><div class="info-cell"><span class="info-icon">🕒</span><span><b>الدوام</b><br>'+(c.hours||'١٢ ظهراً – ١١ مساءً')+'</span></div></div>';
h+='<div class="tabs"><button class="'+(state.view==='customer'?'active':'')+'" data-view="customer">منيو الزبون</button><button class="'+(state.view==='staff'?'active':'')+'" data-view="staff">لوحة الإدارة</button></div>';
if(state.view==='customer'){
h+='<div class="customer-head"><div class="table-chip">🪑 '+(state.table?'طاولتك: '+state.table:'لم تحدد الطاولة')+'</div><div class="cart-chip">🛒 السلة: '+state.cart.reduce((s,x)=>s+x.qty,0)+'</div></div>';
h+='<div class="sectionhead"><div><h2>خدمات الطاولة</h2><div class="muted">حدد الطاولة ثم اختر الخدمة</div></div></div><select class="field" id="service-table"><option value="">اختر رقم الطاولة</option>'+tableOpts+'</select><div class="servicebar"><button data-service="ماء"><span>💧</span>طلب ماء</button><button data-service="نادل"><span>🙋</span>طلب نادل</button><button data-service="تنظيف"><span>🧹</span>طلب تنظيف</button><button data-service="فاتورة"><span>🧾</span>طلب فاتورة</button></div>';
h+='<div class="sectionhead"><div><h2>قائمة الطعام</h2><div class="muted">اختر من أصنافنا</div></div></div><div class="categories">';
cats.forEach(x=>h+='<button class="'+(state.category===x?'active':'')+'" data-cat="'+x+'">'+x+'</button>');h+='</div><div class="grid">';
state.menu.filter(x=>!x.hidden&&(state.category==='الكل'||x.cat===state.category)).forEach(x=>h+='<article class="item '+(x.offer?'offer':'')+'"><div class="foodpic">'+x.icon+'</div>'+(x.offer?'<span class="offer-tag">عرض اليوم · خصم</span>':'')+'<h3>'+x.name+'</h3><p>'+x.desc+'</p><div class="itemfoot"><span class="price">'+money(x.price)+(x.oldPrice?'<small style="display:block;color:#999;text-decoration:line-through">'+money(x.oldPrice)+'</small>':'')+'</span><button class="add" data-add="'+x.id+'">أضف +</button></div></article>');h+='</div>';
h+='<section class="panel"><div class="row"><h2 style="font-size:18px;margin:0">🛒 سلة الطلب</h2><span class="badge">'+state.cart.length+' أصناف</span></div>';
if(!state.cart.length)h+='<p class="muted">السلة فارغة. اختر أصنافك من القائمة.</p>';
state.cart.forEach(x=>h+='<div class="row cartline"><div><b>'+x.name+'</b><div class="muted">'+money(x.price*x.qty)+'</div></div><div class="qty"><button data-minus="'+x.id+'">−</button>'+x.qty+'<button data-plus="'+x.id+'">+</button></div></div>');
h+='<div class="row" style="margin:12px 0"><b>المجموع</b><b>'+money(total)+'</b></div><label class="muted">رقم الطاولة (يمكن استخدام الرقم المحدد أعلاه)</label><select class="field" id="order-table"><option value="">اختر الطاولة</option>'+tableOpts+'</select><button class="primary" id="send" style="width:100%;margin-top:10px" '+(!state.cart.length?'disabled':'')+'>تأكيد وإرسال الطلب</button></section>';
if(state.lastReceipt)h+='<section class="panel receipt"><h3 style="margin-top:0">إيصال الطلب التجريبي</h3><div class="row"><b>رقم الطلب</b><b>#'+state.lastReceipt.id+'</b></div><div class="row"><span>رقم الطاولة</span><b>'+state.lastReceipt.table+'</b></div><div class="muted">'+state.lastReceipt.time+'</div>'+state.lastReceipt.items.map(x=>'<div class="row orderline"><span>'+x.name+' × '+x.qty+'</span><b>'+money(x.price*x.qty)+'</b></div>').join('')+'<div class="row" style="margin-top:10px"><b>الإجمالي</b><b>'+money(state.lastReceipt.total)+'</b></div><p class="muted">تم تسجيل طلبك في هذه المعاينة فقط.</p><label class="muted">رسالة إلى صاحب المطعم (اختياري)</label><textarea id="owner-msg" class="field" rows="2" placeholder="اكتب ملاحظتك أو رسالتك"></textarea><button class="secondary" id="send-msg" style="margin-top:8px">إرسال الرسالة</button></section>';
h+='<footer><b>'+c.name+'</b><br>العنوان: تلعفر · البيانات تجريبية<br>© RestroCloud</footer>';
}else{
h+='<div class="adminnav">'+[['orders','الطلبات'],['menu','القائمة الطعام'],['reports','التقارير'],['settings','إعدادات الموقع'],['password','تغيير الرقم السري']].map(x=>'<button class="'+(state.admin===x[0]?'active':'')+'" data-admin="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
if(state.admin==='orders'){
h+='<div class="row"><h2>الطلبات الواردة</h2><button class="secondary" id="sound">🔔 تفعيل صوت التنبيه</button></div><p class="muted">الصوت يعمل عند فتح لوحة الإدارة والسماح للمتصفح بالتشغيل.</p>';
if(!state.orders.length)h+='<div class="panel muted">لا توجد طلبات حالياً. افتح واجهة الزبون وأرسل طلباً.</div>';
state.orders.forEach(o=>h+='<div class="order"><div class="row"><b>طلب #'+o.id+' · طاولة '+o.table+'</b><span class="badge">'+o.status+'</span></div><div class="muted">'+o.time+'</div>'+o.items.map(x=>'<div class="row orderline"><span>'+x.name+' × '+x.qty+'</span><b>'+money(x.price*x.qty)+'</b></div>').join('')+'<div class="row"><b>الإجمالي</b><b>'+money(o.total)+'</b></div><select class="field" data-status="'+o.id+'">'+['جديد','قيد التحضير','جاهز','مكتمل'].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div>');
h+='<h3>طلبات خدمات الطاولة</h3>';if(!state.services.length)h+='<p class="muted">لا توجد طلبات خدمات.</p>';state.services.forEach(s=>h+='<div class="order row"><div><b>'+s.kind+' · طاولة '+s.table+'</b><div class="muted">'+s.time+'</div></div><button class="'+(s.done?'secondary':'primary')+'" data-done="'+s.id+'">'+(s.done?'تم التنفيذ':'إنهاء')+'</button></div>');
}else if(state.admin==='menu'){
h+='<h2>إدارة القائمة الطعام</h2><p class="muted">تعديل السعر أو إخفاء صنف في هذه المعاينة.</p>';
state.menu.forEach(x=>h+='<div class="order"><div class="row"><b>'+x.icon+' '+x.name+'</b><button class="secondary" data-hide="'+x.id+'">'+(x.hidden?'إظهار':'إخفاء')+'</button></div><label class="muted">السعر بالدينار</label><input class="field" type="number" min="0" data-price="'+x.id+'" value="'+x.price+'"></div>');
}else if(state.admin==='reports'){
h+='<h2>التقارير</h2><div class="grid"><div class="panel">عدد الطلبات<h2>'+state.orders.length+'</h2></div><div class="panel">مجموع المبيعات<h2>'+money(state.orders.reduce((s,x)=>s+x.total,0))+'</h2></div><div class="panel">الخدمات<h2>'+state.services.length+'</h2></div></div><h3>أكثر الأصناف طلباً</h3>';
let ranked={};state.orders.forEach(o=>o.items.forEach(i=>ranked[i.name]=(ranked[i.name]||0)+i.qty));let arr=Object.entries(ranked).sort((a,b)=>b[1]-a[1]);h+=arr.length?arr.map(x=>'<div class="row orderline"><span>'+x[0]+'</span><b>'+x[1]+' طلب</b></div>').join(''):'<p class="muted">ستظهر النتائج بعد وصول طلبات.</p>';
}else if(state.admin==='settings'){
h+='<h2>إعدادات الموقع</h2><div class="panel"><b>'+c.name+'</b><p class="muted">اسم وشعار وعنوان وبيانات تواصل تجريبية. ستصبح قابلة للتعديل والحفظ في النسخة المرتبطة بقاعدة البيانات.</p><div class="muted">العنوان: '+(c.address||'تلعفر')+'</div><div class="muted">ساعات العمل: '+(c.hours||'١٢ ظهراً – ١١ مساءً')+'</div></div>';
}else{
h+='<h2>تغيير الرقم السري</h2><div class="panel"><p class="muted">تغيير كلمة المرور غير مفعّل في هذه النسخة التجريبية؛ لا يوجد حساب دخول حقيقي بعد.</p><input class="field" type="password" placeholder="كلمة المرور الحالية" disabled><input class="field" style="margin-top:8px" type="password" placeholder="كلمة المرور الجديدة" disabled><button class="primary" style="margin-top:8px" disabled>حفظ التغيير</button></div>';
}
h+='<button class="danger" id="clear">مسح بيانات المعاينة</button><footer>لوحة إدارة تجريبية · لا تمثل حساباً تشغيلياً حقيقياً</footer>';
}
h+='</div>';app.innerHTML=h;
app.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
app.querySelectorAll('[data-admin]').forEach(b=>b.onclick=()=>{state.admin=b.dataset.admin;render()});
app.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;render()});
app.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{let p=state.menu.find(x=>String(x.id)===b.dataset.add),f=state.cart.find(x=>x.id===p.id);if(f)f.qty++;else state.cart.push({...p,qty:1});render()});
app.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{state.cart.find(x=>String(x.id)===b.dataset.plus).qty++;render()});
app.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{let x=state.cart.find(x=>String(x.id)===b.dataset.minus);x.qty--;state.cart=state.cart.filter(x=>x.qty>0);render()});
const st=app.querySelector('#service-table');if(st)st.onchange=()=>{state.table=st.value;render()};
const ot=app.querySelector('#order-table');if(ot)ot.onchange=()=>{state.table=ot.value;let s=app.querySelector('#service-table');if(s)s.value=ot.value};
app.querySelectorAll('[data-service]').forEach(b=>b.onclick=()=>{let t=app.querySelector('#service-table').value;if(!t){alert('حدد رقم الطاولة أولاً');return}state.table=t;state.services.unshift({id:Date.now().toString(),table:t,kind:b.dataset.service,time:new Date().toLocaleTimeString('ar-IQ'),done:false});save();alert('تم إرسال طلب '+b.dataset.service+' للطاولة '+t);render()});
const send=app.querySelector('#send');if(send)send.onclick=()=>{let t=app.querySelector('#order-table').value||state.table;if(!t){alert('حدد رقم الطاولة قبل إرسال الطلب');return}let sum=state.cart.reduce((s,x)=>s+x.price*x.qty,0),o={id:Date.now().toString().slice(-6),table:t,items:state.cart.map(x=>({...x})),total:sum,status:'جديد',time:new Date().toLocaleString('ar-IQ')};state.orders.unshift(o);state.lastReceipt=o;state.cart=[];save();render();};
const msg=app.querySelector('#send-msg');if(msg)msg.onclick=()=>{state.ownerMessage=app.querySelector('#owner-msg').value;save();alert('تم حفظ الرسالة في المعاينة.');};
app.querySelectorAll('[data-status]').forEach(s=>s.onchange=()=>{let o=state.orders.find(x=>x.id===s.dataset.status);o.status=s.value;save();render()});
app.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{state.services.find(x=>x.id===b.dataset.done).done=true;save();render()});
app.querySelectorAll('[data-hide]').forEach(b=>b.onclick=()=>{let x=state.menu.find(x=>String(x.id)===b.dataset.hide);x.hidden=!x.hidden;save();render()});
app.querySelectorAll('[data-price]').forEach(i=>i.onchange=()=>{let x=state.menu.find(x=>String(x.id)===i.dataset.price);x.price=Math.max(0,Number(i.value)||0);save()});
const sound=app.querySelector('#sound');if(sound)sound.onclick=()=>{beep();sound.textContent='🔔 تم تفعيل الصوت لهذه الجلسة'};
const clear=app.querySelector('#clear');if(clear)clear.onclick=()=>{if(confirm('مسح طلبات وخدمات المعاينة؟')){state.orders=[];state.services=[];state.cart=[];state.lastReceipt=null;save();render()}};
const home=app.querySelector('#home');if(home)home.onclick=()=>{state.view=state.view==='customer'?'staff':'customer';render()};
}
window.addEventListener('storage',e=>{if(e.key===key){try{const z=JSON.parse(e.newValue||'{}'),old=state.orders.length+state.services.length;state.orders=z.orders||[];state.services=z.services||[];if(state.view==='staff'&&state.orders.length+state.services.length>old)beep();render()}catch(_){}}});
render();
})();