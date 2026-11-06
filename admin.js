import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const supabase=createClient("https://ajnmwemjpofmbbuoaiqp.supabase.co","sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP");
const RESTAURANT_ID="9c9143d1-27cf-41ac-ad6b-cc67ca08dd69",BUCKET="restaurant-product-images";
const $=s=>document.querySelector(s);
const loginPanel=$("#login-panel"),dashboard=$("#dashboard"),loginMsg=$("#login-msg"),productMsg=$("#product-msg");
const fileInput=$("#product-image-file"),urlInput=$("#product-image"),preview=$("#image-preview"),saveButton=$("#save-product");
let categories=[],products=[],lastOrders=[],editingImageUrl=null;
const money=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0))+" د.ع";
const digits=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0));
const statusNames={pending:"قيد الانتظار",accepted:"تم القبول",preparing:"قيد التحضير",ready:"جاهز",completed:"مكتمل",cancelled:"ملغي"};
const typeNames={dine_in:"داخل المطعم",delivery:"توصيل",pickup:"استلام"};
function msg(el,text,bad=false){el.textContent=text;el.style.color=bad?"#a33f2c":"#526c4f";}
function showPage(name){
 document.querySelectorAll(".admin-page-section").forEach(s=>s.classList.add("hidden"));
 $("#page-"+name)?.classList.remove("hidden");
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
 const titles={home:"الرئيسية",products:"إدارة القائمة",orders:"الطلبات",reports:"التقارير",messages:"الرسائل",settings:"إعدادات الموقع",password:"تغيير كلمة المرور"};
 $("#page-title").textContent=titles[name]||"لوحة الإدارة";
 if(name==="orders")loadOrders();
 if(name==="reports"||name==="home")loadOverview();
 if(name==="settings")loadSettings();
}
async function loadDashboard(){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError){msg(loginMsg,authError.message,true);return;}
 if(!user){loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");return;}
 const {data:m,error}=await supabase.from("memberships").select("role").eq("restaurant_id",RESTAURANT_ID).eq("user_id",user.id).maybeSingle();
 if(error||!m||!["owner","admin","manager"].includes(m.role)){
  await supabase.auth.signOut();loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");
  msg(loginMsg,error?.message||"هذا الحساب غير مخوّل لإدارة المطعم.",true);return;
 }
 loginPanel.classList.add("hidden");dashboard.classList.remove("hidden");
 await loadCategories();await loadProducts();await loadOrders();await loadSettings();await loadOverview();
}
async function loadCategories(){
 const {data,error}=await supabase.from("categories").select("id,name,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("sort_order");
 if(error){msg(productMsg,error.message,true);return;}
 categories=data||[];const select=$("#product-category");select.innerHTML="";
 categories.forEach(c=>{const o=document.createElement("option");o.value=c.id;o.textContent=c.name;select.append(o);});
}
function showPreview(src){
 if(!src){preview.classList.add("hidden");preview.removeAttribute("src");return;}
 preview.src=src;preview.classList.remove("hidden");
 preview.onerror=()=>{preview.classList.add("hidden");msg(productMsg,"تعذر تحميل الصورة المختارة.",true);};
}
fileInput.addEventListener("change",()=>{const f=fileInput.files[0];if(f){urlInput.value="";showPreview(URL.createObjectURL(f));}});
urlInput.addEventListener("input",()=>{fileInput.value="";if(urlInput.value.trim())showPreview(urlInput.value.trim());else showPreview(editingImageUrl);});
async function uploadImage(file){
 const types={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
 if(!types[file.type])throw new Error("اختر صورة JPG أو PNG أو WebP أو AVIF.");
 if(file.size>5242880)throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميغابايت.");
 const path=RESTAURANT_ID+"/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+types[file.type];
 const {error}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
function storagePath(url){
 const marker="/storage/v1/object/public/"+BUCKET+"/";const i=(url||"").indexOf(marker);
 return i<0?null:decodeURIComponent(url.slice(i+marker.length));
}
async function removeStoredImage(url){
 const path=storagePath(url);if(!path)return;
 const {error}=await supabase.storage.from(BUCKET).remove([path]);
 if(error)console.warn("تعذر حذف الصورة القديمة",error.message);
}
function resetProductForm(){
 $("#product-form").reset();$("#product-id").value="";editingImageUrl=null;showPreview(null);
 $("#product-form-title").textContent="إضافة منتج جديد";saveButton.textContent="إضافة المنتج";
 $("#cancel-edit").classList.add("hidden");$("#remove-image").checked=false;fileInput.value="";
}
async function loadProducts(){
 const {data,error}=await supabase.from("products").select("id,category_id,name,description,price,image_url,is_available,is_spicy,sort_order").eq("restaurant_id",RESTAURANT_ID).order("sort_order").order("created_at",{ascending:false});
 if(error){msg(productMsg,"تعذر تحميل المنتجات: "+error.message,true);return;}
 products=data||[];renderProducts();
}
function renderProducts(){
 const rows=$("#product-rows");rows.innerHTML="";
 const categoryNames=new Map(categories.map(c=>[c.id,c.name]));
 $("#product-count").textContent=digits(products.length)+" منتج";
 products.forEach(p=>{
  const tr=document.createElement("tr"),imageCell=document.createElement("td");
  if(p.image_url){const img=document.createElement("img");img.className="table-product-image";img.src=p.image_url;img.alt=p.name;img.onerror=()=>{img.replaceWith(document.createTextNode("—"));};imageCell.append(img);}else imageCell.textContent="—";
  const name=document.createElement("td");name.textContent=p.name+(p.is_spicy?" 🌶️":"");
  const category=document.createElement("td");category.textContent=categoryNames.get(p.category_id)||"—";
  const price=document.createElement("td");price.textContent=money(p.price);
  const status=document.createElement("td");status.textContent=p.is_available?"متاح":"مخفي";
  const actions=document.createElement("td");actions.className="action-cell";
  const edit=document.createElement("button");edit.className="outline-btn small-action";edit.textContent="تعديل";edit.onclick=()=>editProduct(p);
  const toggle=document.createElement("button");toggle.className="danger-btn small-action";toggle.textContent=p.is_available?"إخفاء":"إظهار";
  toggle.onclick=async()=>{const {error}=await supabase.from("products").update({is_available:!p.is_available}).eq("id",p.id).eq("restaurant_id",RESTAURANT_ID);if(error)msg(productMsg,error.message,true);else{msg(productMsg,"تم تحديث حالة المنتج.");await loadProducts();}};
  const del=document.createElement("button");del.className="delete-btn small-action";del.textContent="حذف";
  del.onclick=async()=>{if(!confirm("هل تريد حذف المنتج: "+p.name+"؟"))return;const {error}=await supabase.from("products").delete().eq("id",p.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg(productMsg,error.message,true);return;}await removeStoredImage(p.image_url);msg(productMsg,"تم حذف المنتج.");await loadProducts();};
  actions.append(edit,toggle,del);tr.append(imageCell,name,category,price,status,actions);rows.append(tr);
 });
 if(!products.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="لا توجد منتجات.";tr.append(td);rows.append(tr);}
}
function editProduct(p){
 $("#product-id").value=p.id;$("#product-name").value=p.name;$("#product-category").value=p.category_id||"";
 $("#product-price").value=p.price;$("#product-description").value=p.description||"";
 $("#product-spicy").checked=!!p.is_spicy;urlInput.value="";fileInput.value="";
 $("#remove-image").checked=false;editingImageUrl=p.image_url;showPreview(p.image_url);
 $("#product-form-title").textContent="تعديل المنتج: "+p.name;saveButton.textContent="حفظ التعديلات";
 $("#cancel-edit").classList.remove("hidden");$("#page-products").scrollIntoView({behavior:"smooth",block:"start"});
}
$("#product-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!categories.length){msg(productMsg,"لا توجد أقسام نشطة.",true);return;}
 saveButton.disabled=true;msg(productMsg,"جارٍ حفظ المنتج...");
 let uploadedUrl=null;
 try{
  const id=$("#product-id").value,file=fileInput.files[0];
  let image=editingImageUrl;
  if(file){image=await uploadImage(file);uploadedUrl=image;}
  else if(urlInput.value.trim())image=urlInput.value.trim();
  else if($("#remove-image").checked)image=null;
  const payload={category_id:$("#product-category").value,name:$("#product-name").value.trim(),description:$("#product-description").value.trim()||null,price:Number($("#product-price").value),image_url:image,is_spicy:$("#product-spicy").checked};
  let result;
  if(id)result=await supabase.from("products").update(payload).eq("id",id).eq("restaurant_id",RESTAURANT_ID);
  else result=await supabase.from("products").insert({...payload,restaurant_id:RESTAURANT_ID,is_available:true});
  if(result.error)throw result.error;
  if(id&&editingImageUrl&&editingImageUrl!==image)await removeStoredImage(editingImageUrl);
  msg(productMsg,id?"تم حفظ تعديلات المنتج.":"تمت إضافة المنتج إلى المنيو.");
  resetProductForm();await loadProducts();await loadOverview();
 }catch(err){if(uploadedUrl)await removeStoredImage(uploadedUrl);msg(productMsg,"لم يتم حفظ المنتج: "+err.message,true);}
 finally{saveButton.disabled=false;}
});
$("#reset-product").addEventListener("click",resetProductForm);
$("#cancel-edit").addEventListener("click",resetProductForm);
function createOrderCard(order,tableMap){
 const card=document.createElement("article");card.className="order-card";
 const head=document.createElement("div");head.className="order-card-head";
 const title=document.createElement("strong");title.textContent="طلب رقم #"+order.order_number;
 const date=document.createElement("small");date.textContent=new Date(order.created_at).toLocaleString("ar-IQ");
 head.append(title,date);
 const meta=document.createElement("p");meta.className="order-meta";
 const table=order.table_id?tableMap.get(order.table_id):"";
 meta.textContent=[typeNames[order.order_type]||order.order_type,table,order.customer_name,order.customer_phone,order.delivery_address].filter(Boolean).join(" · ");
 const list=document.createElement("ul");list.className="order-lines";
 (order.order_items||[]).forEach(item=>{const li=document.createElement("li");li.textContent=item.product_name+" × "+digits(item.quantity)+" — "+money(item.line_total);list.append(li);});
 const note=document.createElement("p");note.className="order-note";note.textContent=order.notes?"ملاحظات: "+order.notes:"";
 const foot=document.createElement("div");foot.className="order-card-foot";
 const total=document.createElement("strong");total.textContent=money(order.total);
 const select=document.createElement("select");select.className="status-select";
 Object.entries(statusNames).forEach(([v,label])=>{const o=document.createElement("option");o.value=v;o.textContent=label;select.append(o);});
 select.value=order.status;select.onchange=async()=>{const {error}=await supabase.from("orders").update({status:select.value}).eq("id",order.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg($("#orders-list"),error.message,true);select.value=order.status;}else{await loadOrders();await loadOverview();}};
 foot.append(total,select);card.append(head,meta,list,note,foot);return card;
}
async function loadOrders(){
 const box=$("#orders-list"),recent=$("#recent-orders");
 const [orderRes,tableRes]=await Promise.all([
  supabase.from("orders").select("id,order_number,order_type,status,customer_name,customer_phone,delivery_address,notes,total,created_at,table_id,order_items(product_name,quantity,unit_price,line_total)").eq("restaurant_id",RESTAURANT_ID).order("created_at",{ascending:false}).limit(100),
  supabase.from("restaurant_tables").select("id,table_number,label").eq("restaurant_id",RESTAURANT_ID)
 ]);
 if(orderRes.error){box.textContent="تعذر تحميل الطلبات: "+orderRes.error.message;recent.textContent=box.textContent;return;}
 lastOrders=orderRes.data||[];
 const tableMap=new Map((tableRes.data||[]).map(t=>[t.id,t.label||"طاولة "+t.table_number]));
 box.innerHTML="";recent.innerHTML="";
 const pending=lastOrders.filter(o=>o.status==="pending").length;
 $("#orders-badge").textContent=digits(pending);
 if(!lastOrders.length){box.textContent="لا توجد طلبات حتى الآن.";recent.textContent="لا توجد طلبات حديثة.";return;}
 lastOrders.forEach(o=>box.append(createOrderCard(o,tableMap)));
 lastOrders.slice(0,5).forEach(o=>recent.append(createOrderCard(o,tableMap)));
}
async function loadOverview(){
 const [pRes,oRes]=await Promise.all([
  supabase.from("products").select("id",{count:"exact",head:true}).eq("restaurant_id",RESTAURANT_ID),
  supabase.from("orders").select("id,status,total",{count:"exact"}).eq("restaurant_id",RESTAURANT_ID)
 ]);
 if(pRes.error||oRes.error)return;
 const orders=oRes.data||[],pending=orders.filter(o=>o.status==="pending").length,completed=orders.filter(o=>o.status==="completed");
 const sales=completed.reduce((s,o)=>s+Number(o.total||0),0);
 $("#stat-products").textContent=digits(pRes.count||0);$("#stat-orders").textContent=digits(oRes.count||orders.length);
 $("#stat-pending").textContent=digits(pending);$("#stat-sales").textContent=money(sales);
 $("#report-products").textContent=digits(pRes.count||0);$("#report-orders").textContent=digits(oRes.count||orders.length);
 $("#report-completed").textContent=digits(completed.length);$("#report-sales").textContent=money(sales);
 $("#report-summary").textContent="الطلبات المكتملة: "+digits(completed.length)+"، الطلبات غير المكتملة أو الملغاة: "+digits(orders.length-completed.length)+"، قيمة المبيعات المكتملة: "+money(sales)+".";
}
async function loadSettings(){
 const {data,error}=await supabase.from("restaurant_settings").select("welcome_text,description,phone,whatsapp_number,ordering_enabled").eq("restaurant_id",RESTAURANT_ID).maybeSingle();
 if(error){msg($("#settings-msg"),error.message,true);return;}
 if(!data)return;
 $("#setting-welcome").value=data.welcome_text||"";$("#setting-description").value=data.description||"";
 $("#setting-phone").value=data.phone||"";$("#setting-whatsapp").value=data.whatsapp_number||"";
 $("#setting-ordering").checked=!!data.ordering_enabled;
}
$("#settings-form").addEventListener("submit",async e=>{
 e.preventDefault();const enabled=$("#setting-ordering").checked;
 if(enabled&&!confirm("تنبيه: الأسعار الحالية تجريبية. هل تأكدت من اعتماد الأسعار الحقيقية واختبار الطلبات؟"))return;
 const payload={welcome_text:$("#setting-welcome").value.trim()||null,description:$("#setting-description").value.trim()||null,phone:$("#setting-phone").value.trim()||null,whatsapp_number:$("#setting-whatsapp").value.trim()||null,ordering_enabled:enabled};
 const {error}=await supabase.from("restaurant_settings").update(payload).eq("restaurant_id",RESTAURANT_ID);
 if(error)msg($("#settings-msg"),"تعذر حفظ الإعدادات: "+error.message,true);
 else msg($("#settings-msg"),"تم حفظ إعدادات الموقع.");
});
$("#password-form").addEventListener("submit",async e=>{
 e.preventDefault();const p=$("#new-password").value,c=$("#confirm-password").value;
 if(p.length<8){msg($("#password-msg"),"كلمة المرور يجب أن تكون 8 أحرف على الأقل.",true);return;}
 if(p!==c){msg($("#password-msg"),"كلمتا المرور غير متطابقتين.",true);return;}
 const {error}=await supabase.auth.updateUser({password:p});
 if(error)msg($("#password-msg"),"تعذر تغيير كلمة المرور: "+error.message,true);
 else{$("#password-form").reset();msg($("#password-msg"),"تم تحديث كلمة المرور.");}
});
$("#login-form").addEventListener("submit",async e=>{
 e.preventDefault();msg(loginMsg,"جارٍ التحقق...");
 const {error}=await supabase.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
 if(error){msg(loginMsg,error.message,true);return;}await loadDashboard();
});
$("#logout").addEventListener("click",async()=>{await supabase.auth.signOut();loginPanel.classList.remove("hidden");dashboard.classList.add("hidden");});
$("#refresh-orders").addEventListener("click",loadOrders);
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
loadDashboard();
