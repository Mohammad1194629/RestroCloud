import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const supabase=createClient("https://ajnmwemjpofmbbuoaiqp.supabase.co","sb_publishable-w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP");
const $=s=>document.querySelector(s);
const loginPanel=$("#login-panel"),app=$("#app"),loginMessage=$("#login-message"),list=$("#restaurant-list");
const statusText={active:"نشط",draft:"مسودة",suspended:"موقوف"};
const digits=n=>new Intl.NumberFormat("ar-IQ").format(n||0);
function message(el,text,bad=false){el.textContent=text;el.style.color=bad?"#a33f2c":"#526c4f";}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
async function loadRestaurants(){
 list.replaceChildren(el("p","muted","جارٍ تحميل المطاعم..."));
 const {data,error}=await supabase.from("restaurants").select("id,name,slug,status,created_at").order("created_at",{ascending:true});
 if(error){list.replaceChildren(el("p","message","تعذر تحميل المطاعم: "+error.message));return;}
 const rows=data||[];
 $("#stat-total").textContent=digits(rows.length);
 $("#stat-active").textContent=digits(rows.filter(x=>x.status==="active").length);
 $("#stat-draft").textContent=digits(rows.filter(x=>x.status==="draft").length);
 $("#stat-suspended").textContent=digits(rows.filter(x=>x.status==="suspended").length);
 list.replaceChildren();
 if(!rows.length){list.append(el("p","muted","لا توجد مطاعم مسجلة بعد."));return;}
 rows.forEach(r=>{
  const card=el("article","restaurant-card"),info=el("div",""),title=el("div","restaurant-title",r.name),slug=el("div","restaurant-meta",r.slug),status=el("span","status "+r.status,statusText[r.status]||r.status);
  info.append(title,slug,status);
  const actions=el("div","card-actions");
  const site=el("a","","الموقع");site.href="restaurants/"+encodeURIComponent(r.slug)+"/";site.target="_blank";site.rel="noopener";
  const admin=el("a","","لوحة المطعم");admin.href="admin.html?r="+encodeURIComponent(r.slug);admin.target="_blank";admin.rel="noopener";
  actions.append(site,admin);
  if(r.status!=="active"){const activate=el("button","activate","تفعيل");activate.onclick=()=>setStatus(r,"active");actions.append(activate);}
  if(r.status!=="draft"){const draft=el("button","","إيقاف مؤقت");draft.onclick=()=>setStatus(r,"draft");actions.append(draft);}
  if(r.status!=="suspended"){const suspend=el("button","suspend","تعليق");suspend.onclick=()=>setStatus(r,"suspended");actions.append(suspend);}
  card.append(info,actions);list.append(card);
 });
}
async function setStatus(restaurant,status){
 const label=statusText[status];
 if(!confirm("تغيير حالة "+restaurant.name+" إلى: "+label+"؟"))return;
 const {error}=await supabase.from("restaurants").update({status}).eq("id",restaurant.id);
 if(error){alert("تعذر تحديث الحالة: "+error.message);return;}
 await loadRestaurants();
}
async function checkSession(){
 const {data:{user},error}=await supabase.auth.getUser();
 if(error){message(loginMessage,error.message,true);return;}
 if(!user){loginPanel.classList.remove("hidden");app.classList.add("hidden");return;}
 if(user.app_metadata?.role!=="platform_owner"){
  loginPanel.classList.remove("hidden");app.classList.add("hidden");
  message(loginMessage,"هذا الحساب لا يملك صلاحية مدير المنصة.",true);return;
 }
 loginPanel.classList.add("hidden");app.classList.remove("hidden");
 await loadRestaurants();
}
$("#login-form").addEventListener("submit",async e=>{
 e.preventDefault();const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;
 message(loginMessage,"جارٍ تسجيل الدخول...");
 const {error}=await supabase.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
 button.disabled=false;
 if(error){message(loginMessage,"تعذر تسجيل الدخول: "+error.message,true);return;}
 await checkSession();
});
$("#create-form").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("#new-name").value.trim(),slug=$("#new-slug").value.trim().toLowerCase(),button=e.currentTarget.querySelector("button");
 if(name.length<2||!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)){message($("#create-message"),"تحقق من اسم المطعم والرابط المختصر.",true);return;}
 button.disabled=true;message($("#create-message"),"جارٍ إنشاء المطعم...");
 const {data,error}=await supabase.rpc("create_restaurant",{_name:name,_slug:slug});
 button.disabled=false;
 if(error){message($("#create-message"),"تعذر إنشاء المطعم: "+error.message,true);return;}
 e.currentTarget.reset();message($("#create-message"),"تم إنشاء المطعم كمسودة. معرّف المطعم: "+data);
 await loadRestaurants();
});
$("#refresh").addEventListener("click",loadRestaurants);
$("#logout").addEventListener("click",async()=>{await supabase.auth.signOut();loginPanel.classList.remove("hidden");app.classList.add("hidden");});
checkSession();