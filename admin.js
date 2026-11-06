import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const supabase=createClient("https://ajnmwemjpofmbbuoaiqp.supabase.co","sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP");
const RESTAURANT_ID="9c9143d1-27cf-41ac-ad6b-cc67ca08dd69";
const loginPanel=document.querySelector("#login-panel"),dashboard=document.querySelector("#dashboard");
const loginMsg=document.querySelector("#login-msg"),productMsg=document.querySelector("#product-msg");
let categories=[];
const money=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0))+" د.ع";
function message(el,text,isError=false){el.textContent=text;el.style.color=isError?"#a33f2c":"#526c4f";}
async function loadDashboard(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");return;}
 const {data:membership,error:memberError}=await supabase.from("memberships").select("role").eq("restaurant_id",RESTAURANT_ID).eq("user_id",user.id).maybeSingle();
 if(memberError||!membership||!["owner","admin","manager"].includes(membership.role)){await supabase.auth.signOut();message(loginMsg,"هذا الحساب غير مخوّل لإدارة المطعم.",true);return;}
 loginPanel.classList.add("hidden");dashboard.classList.remove("hidden");
 await loadCategories();await loadProducts();
}
async function loadCategories(){
 const {data,error}=await supabase.from("categories").select("id,name").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("sort_order");
 if(error){message(productMsg,"تعذر تحميل الأقسام: "+error.message,true);return;}
 categories=data||[];
 const select=document.querySelector("#product-category");select.innerHTML="";
 categories.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;select.append(o);});
}
async function loadProducts(){
 const {data,error}=await supabase.from("products").select("id,name,price,is_available").eq("restaurant_id",RESTAURANT_ID).order("created_at",{ascending:false});
 if(error){message(productMsg,"تعذر تحميل المنتجات: "+error.message,true);return;}
 const rows=document.querySelector("#product-rows");rows.innerHTML="";
 (data||[]).forEach(p=>{
  const tr=document.createElement("tr");
  const name=document.createElement("td");name.textContent=p.name;
  const price=document.createElement("td");price.textContent=money(p.price);
  const status=document.createElement("td");status.textContent=p.is_available?"متاح":"غير متاح";
  const action=document.createElement("td");const btn=document.createElement("button");btn.className=p.is_available?"danger-btn":"add-btn";btn.textContent=p.is_available?"إخفاء":"إظهار";
  btn.onclick=async()=>{const {error}=await supabase.from("products").update({is_available:!p.is_available}).eq("id",p.id).eq("restaurant_id",RESTAURANT_ID);if(error)message(productMsg,error.message,true);else loadProducts();};
  action.append(btn);tr.append(name,price,status,action);rows.append(tr);
 });
}
document.querySelector("#login-form").addEventListener("submit",async e=>{e.preventDefault();message(loginMsg,"جارٍ التحقق...");const {error}=await supabase.auth.signInWithPassword({email:document.querySelector("#email").value.trim(),password:document.querySelector("#password").value});if(error){message(loginMsg,"تعذر تسجيل الدخول: "+error.message,true);return;}await loadDashboard();});
document.querySelector("#logout").addEventListener("click",async()=>{await supabase.auth.signOut();await loadDashboard();});
document.querySelector("#product-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!categories.length){message(productMsg,"أضف قسماً نشطاً أولاً.",true);return;}
 const payload={restaurant_id:RESTAURANT_ID,category_id:document.querySelector("#product-category").value,name:document.querySelector("#product-name").value.trim(),description:document.querySelector("#product-description").value.trim()||null,price:Number(document.querySelector("#product-price").value),image_url:document.querySelector("#product-image").value.trim()||null,is_available:true};
 const {error}=await supabase.from("products").insert(payload);
 if(error){message(productMsg,"لم يتم حفظ الصنف: "+error.message,true);return;}
 e.target.reset();message(productMsg,"تم حفظ الصنف.");await loadProducts();
});
// لا تستدعِ استعلامات Supabase داخل onAuthStateChange؛ قد يسبب ذلك تعليق جلسة المصادقة.
loadDashboard();
