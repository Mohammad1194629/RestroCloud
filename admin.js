import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const supabase=createClient("https://ajnmwemjpofmbbuoaiqp.supabase.co","sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP");
const RESTAURANT_ID="9c9143d1-27cf-41ac-ad6b-cc67ca08dd69";
const BUCKET="restaurant-product-images";
const loginPanel=document.querySelector("#login-panel"),dashboard=document.querySelector("#dashboard");
const loginMsg=document.querySelector("#login-msg"),productMsg=document.querySelector("#product-msg");
const fileInput=document.querySelector("#product-image-file"),urlInput=document.querySelector("#product-image"),preview=document.querySelector("#image-preview"),saveButton=document.querySelector("#save-product");
let categories=[];
const money=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0))+" د.ع";
function message(el,text,bad=false){el.textContent=text;el.style.color=bad?"#a33f2c":"#526c4f";}
async function loadDashboard(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");return;}
 const {data:m}=await supabase.from("memberships").select("role").eq("restaurant_id",RESTAURANT_ID).eq("user_id",user.id).maybeSingle();
 if(!m||!["owner","admin","manager"].includes(m.role)){await supabase.auth.signOut();message(loginMsg,"هذا الحساب غير مخوّل لإدارة المطعم.",true);return;}
 loginPanel.classList.add("hidden");dashboard.classList.remove("hidden");await loadCategories();await loadProducts();
}
async function loadCategories(){
 const {data,error}=await supabase.from("categories").select("id,name").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("sort_order");
 if(error){message(productMsg,error.message,true);return;}
 categories=data||[];const select=document.querySelector("#product-category");select.innerHTML="";
 categories.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;select.append(o);});
}
function showPreview(file){if(!file){preview.classList.add("hidden");preview.removeAttribute("src");return;}preview.src=URL.createObjectURL(file);preview.classList.remove("hidden");}
fileInput.addEventListener("change",()=>{const f=fileInput.files[0];if(f){urlInput.value="";showPreview(f);}});
urlInput.addEventListener("input",()=>{fileInput.value="";if(urlInput.value.trim()){preview.src=urlInput.value.trim();preview.classList.remove("hidden");}else showPreview(null);});
async function uploadImage(file){
 const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
 if(!types[file.type])throw new Error("اختر صورة JPG أو PNG أو WebP أو AVIF.");
 if(file.size>5242880)throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميغابايت.");
 const path=RESTAURANT_ID+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+types[file.type];
 const {error}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
async function loadProducts(){
 const {data,error}=await supabase.from("products").select("id,name,price,is_available,image_url,is_spicy").eq("restaurant_id",RESTAURANT_ID).order("created_at",{ascending:false});
 if(error){message(productMsg,"تعذر تحميل المنتجات: "+error.message,true);return;}
 const rows=document.querySelector("#product-rows");rows.innerHTML="";
 (data||[]).forEach(p=>{
  const tr=document.createElement("tr"),imageCell=document.createElement("td");
  if(p.image_url){const img=document.createElement("img");img.className="table-product-image";img.src=p.image_url;img.alt=p.name;imageCell.append(img);}else imageCell.textContent="—";
  const name=document.createElement("td");name.textContent=p.name+(p.is_spicy?" 🌶️ حار":"");
  const price=document.createElement("td");price.textContent=money(p.price);
  const status=document.createElement("td");status.textContent=p.is_available?"متاح":"غير متاح";
  const actions=document.createElement("td");
  const toggle=document.createElement("button");toggle.className=p.is_available?"danger-btn":"add-btn";toggle.textContent=p.is_available?"إخفاء":"إظهار";
  toggle.onclick=async()=>{const {error}=await supabase.from("products").update({is_available:!p.is_available}).eq("id",p.id).eq("restaurant_id",RESTAURANT_ID);if(error)message(productMsg,error.message,true);else await loadProducts();};
  const remove=document.createElement("button");remove.className="delete-btn";remove.textContent="حذف";
  remove.onclick=async()=>{if(!window.confirm("حذف الصنف "+p.name+"؟"))return;const {error}=await supabase.from("products").delete().eq("id",p.id).eq("restaurant_id",RESTAURANT_ID);if(error){message(productMsg,error.message,true);return;}message(productMsg,"تم حذف الصنف.");await loadProducts();};
  actions.append(toggle,remove);tr.append(imageCell,name,price,status,actions);rows.append(tr);
 });
}
document.querySelector("#login-form").addEventListener("submit",async e=>{e.preventDefault();message(loginMsg,"جارٍ التحقق...");const {error}=await supabase.auth.signInWithPassword({email:document.querySelector("#email").value.trim(),password:document.querySelector("#password").value});if(error){message(loginMsg,error.message,true);return;}await loadDashboard();});
document.querySelector("#logout").addEventListener("click",async()=>{await supabase.auth.signOut();await loadDashboard();});
document.querySelector("#product-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!categories.length){message(productMsg,"أضف قسماً نشطاً أولاً.",true);return;}
 saveButton.disabled=true;message(productMsg,"جارٍ حفظ الصنف...");
 try{
  let image=imageInputValue();const file=fileInput.files[0];if(file)image=await uploadImage(file);
  const payload={restaurant_id:RESTAURANT_ID,category_id:document.querySelector("#product-category").value,name:document.querySelector("#product-name").value.trim(),description:document.querySelector("#product-description").value.trim()||null,price:Number(document.querySelector("#product-price").value),image_url:image,is_spicy:document.querySelector("#product-spicy").checked,is_available:true};
  const {error}=await supabase.from("products").insert(payload);if(error)throw error;
  e.target.reset();showPreview(null);message(productMsg,"تمت إضافة الصنف إلى المنيو.");await loadProducts();
 }catch(err){message(productMsg,"لم يتم حفظ الصنف: "+err.message,true);}
 finally{saveButton.disabled=false;}
});
function imageInputValue(){return urlInput.value.trim()||null;}
loadDashboard();