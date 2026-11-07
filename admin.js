import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const supabase=createClient("https://ajnmwemjpofmbbuoaiqp.supabase.co","sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP");
const RESTAURANT_ID="9c9143d1-27cf-41ac-ad6b-cc67ca08dd69",BUCKET="restaurant-product-images";
const $=s=>document.querySelector(s);
const loginPanel=$("#login-panel"),dashboard=$("#dashboard"),loginMsg=$("#login-msg"),productMsg=$("#product-msg");
const fileInput=$("#product-image-file"),urlInput=$("#product-image"),preview=$("#image-preview"),saveButton=$("#save-product");
let categories=[],products=[],lastOrders=[],editingImageUrl=null,allCategories=[];
const money=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0))+" د.ع";
const digits=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0));
const statusNames={pending:"قيد الانتظار",accepted:"تم القبول",preparing:"قيد التحضير",ready:"جاهز",completed:"مكتمل",cancelled:"ملغي"};
const typeNames={dine_in:"داخل المطعم",delivery:"توصيل",pickup:"استلام"};
function msg(el,text,bad=false){el.textContent=text;el.style.color=bad?"#a33f2c":"#526c4f";}
function showPage(name){
 document.querySelectorAll(".admin-page-section").forEach(s=>s.classList.add("hidden"));
 $("#page-"+name)?.classList.remove("hidden");
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
 const titles={home:"الرئيسية",products:"إدارة القائمة",orders:"الطلبات", "table-services":"خدمات الطاولة",reports:"التقارير",messages:"الرسائل",settings:"إعدادات ومحتوى الموقع",password:"تغيير كلمة المرور"};
 $("#page-title").textContent=titles[name]||"لوحة الإدارة";
 if(name==="orders")loadOrders();
 if(name==="table-services")loadTableServiceRequests();
 if(name==="messages")loadMessages();
 if(name==="products")loadCategoryManager();
 if(name==="reports"||name==="home")loadOverview();
 if(name==="settings"){loadSettings();loadServiceManager();}
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
 await loadCategories();await loadProducts();await loadCategoryManager();await loadOrders();await loadSettings();await loadOverview();
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
async function loadCategoryManager(){
 const box=$("#category-rows");if(!box)return;
 const {data,error}=await supabase.from("categories").select("id,name,is_active,sort_order").eq("restaurant_id",RESTAURANT_ID).order("sort_order");
 if(error){msg($("#category-msg"),"تعذر تحميل الأقسام: "+error.message,true);return;}
 allCategories=data||[];box.innerHTML="";
 allCategories.forEach(c=>{
  const row=document.createElement("div");row.className="category-row";
  const name=document.createElement("strong");name.textContent=c.name;
  const state=document.createElement("span");state.textContent=c.is_active?"ظاهر للزبائن":"مخفي";
  const toggle=document.createElement("button");toggle.type="button";toggle.className="outline-btn small-action";toggle.textContent=c.is_active?"إخفاء":"إظهار";
  toggle.onclick=async()=>{const {error}=await supabase.from("categories").update({is_active:!c.is_active}).eq("id",c.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg($("#category-msg"),error.message,true);return;}await loadCategories();await loadCategoryManager();msg($("#category-msg"),"تم تحديث القسم.");};
  row.append(name,state,toggle);box.append(row);
 });
 if(!allCategories.length)box.textContent="لا توجد أقسام.";
}
$("#category-form").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("#category-name").value.trim();if(!name)return;
 const button=$("#category-form button");button.disabled=true;
 const {error}=await supabase.from("categories").insert({restaurant_id:RESTAURANT_ID,name,sort_order:allCategories.length,is_active:true});
 button.disabled=false;
 if(error){msg($("#category-msg"),"تعذر إضافة القسم: "+error.message,true);return;}
 $("#category-name").value="";await loadCategories();await loadCategoryManager();msg($("#category-msg"),"تمت إضافة القسم.");
});
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
async function loadMessages(){
 const box=$("#messages-list");if(!box)return;
 const {data,error}=await supabase.from("contact_messages").select("id,name,phone,message,is_read,created_at").eq("restaurant_id",RESTAURANT_ID).order("created_at",{ascending:false}).limit(100);
 if(error){box.textContent="تعذر تحميل الرسائل: "+error.message;return;}
 const rows=data||[];const unread=rows.filter(x=>!x.is_read).length;$("#messages-badge").textContent=digits(unread);box.innerHTML="";
 if(!rows.length){box.textContent="لا توجد رسائل حتى الآن.";return;}
 rows.forEach(m=>{
  const card=document.createElement("article");card.className="message-card"+(m.is_read?"":" unread");
  const head=document.createElement("div");head.className="message-head";
  const name=document.createElement("strong");name.textContent=m.name;
  const date=document.createElement("small");date.textContent=new Date(m.created_at).toLocaleString("ar-IQ");
  head.append(name,date);
  const phone=document.createElement("p");phone.className="message-phone";phone.textContent=m.phone||"لم يذكر رقم هاتف";
  const body=document.createElement("p");body.className="message-body";body.textContent=m.message;
  const actions=document.createElement("div");actions.className="message-actions";
  const read=document.createElement("button");read.type="button";read.className="outline-btn small-action";read.textContent=m.is_read?"وضع كغير مقروءة":"تحديد كمقروءة";
  read.onclick=async()=>{const {error}=await supabase.from("contact_messages").update({is_read:!m.is_read}).eq("id",m.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg($("#messages-list"),error.message,true);return;}await loadMessages();};
  const del=document.createElement("button");del.type="button";del.className="delete-btn small-action";del.textContent="حذف";
  del.onclick=async()=>{if(!confirm("هل تريد حذف هذه الرسالة؟"))return;const {error}=await supabase.from("contact_messages").delete().eq("id",m.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg($("#messages-list"),error.message,true);return;}await loadMessages();};
  actions.append(read,del);card.append(head,phone,body,actions);box.append(card);
 });
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
 const fields="display_name,hero_title,welcome_text,description,phone,whatsapp_number,ordering_enabled,cover_url,address,reservation_phone,opening_time,closing_time,map_url,menu_title,menu_subtitle,services_title,services_description,contact_title,contact_description,footer_text,feature_tags,discover_button_text,menu_eyebrow,services_eyebrow,contact_eyebrow,contact_submit_text,address_label,reservation_label,hours_label,favorites_button_text,search_placeholder,show_services,show_contact,show_address,show_reservation,show_working_hours";
 const {data,error}=await supabase.from("restaurant_settings").select(fields).eq("restaurant_id",RESTAURANT_ID).maybeSingle();
 if(error){msg($("#settings-msg"),error.message,true);return;} if(!data)return;
 const set=(id,value)=>{const el=$("#"+id);if(el)el.value=value??"";};
 const check=(id,value)=>{const el=$("#"+id);if(el)el.checked=value!==false;};
 set("setting-display-name",data.display_name);set("setting-hero-title",data.hero_title);
 set("setting-welcome",data.welcome_text);set("setting-description",data.description);set("setting-phone",data.phone);
 set("setting-whatsapp",data.whatsapp_number);set("setting-cover",data.cover_url);set("setting-address",data.address);
 set("setting-reservation",data.reservation_phone);set("setting-opening",data.opening_time?.slice(0,5));set("setting-closing",data.closing_time?.slice(0,5));
 set("setting-map",data.map_url);set("setting-menu-title",data.menu_title);set("setting-menu-subtitle",data.menu_subtitle);
 set("setting-services-title",data.services_title);set("setting-services-description",data.services_description);
 set("setting-contact-title",data.contact_title);set("setting-contact-description",data.contact_description);set("setting-footer-text",data.footer_text);
 set("setting-feature-tags",Array.isArray(data.feature_tags)?data.feature_tags.join(" | "):"");
 set("setting-discover-button",data.discover_button_text);set("setting-menu-eyebrow",data.menu_eyebrow);
 set("setting-services-eyebrow",data.services_eyebrow);set("setting-contact-eyebrow",data.contact_eyebrow);
 set("setting-contact-submit",data.contact_submit_text);set("setting-address-label",data.address_label);
 set("setting-reservation-label",data.reservation_label);set("setting-hours-label",data.hours_label);
 set("setting-favorites-text",data.favorites_button_text);set("setting-search-placeholder",data.search_placeholder);
 check("setting-ordering",data.ordering_enabled);check("setting-show-services",data.show_services);
 check("setting-show-contact",data.show_contact);check("setting-show-address",data.show_address);
 check("setting-show-reservation",data.show_reservation);check("setting-show-hours",data.show_working_hours);
}
$("#settings-form").addEventListener("submit",async e=>{
 e.preventDefault();const enabled=$("#setting-ordering").checked;
 if(enabled&&!confirm("هل تأكدت من اعتماد الأسعار واختبار الطلبات قبل تفعيل استقبال الطلبات؟"))return;
 const val=id=>$("#"+id).value.trim()||null,flag=id=>$("#"+id).checked;
 const tags=$("#setting-feature-tags").value.split("|").map(x=>x.trim()).filter(Boolean).slice(0,8);
 const payload={
  display_name:val("setting-display-name"),hero_title:val("setting-hero-title"),welcome_text:val("setting-welcome"),description:val("setting-description"),
  phone:val("setting-phone"),whatsapp_number:val("setting-whatsapp"),cover_url:val("setting-cover"),address:val("setting-address"),
  reservation_phone:val("setting-reservation"),opening_time:val("setting-opening"),closing_time:val("setting-closing"),map_url:val("setting-map"),
  menu_title:val("setting-menu-title"),menu_subtitle:val("setting-menu-subtitle"),services_title:val("setting-services-title"),
  services_description:val("setting-services-description"),discover_button_text:val("setting-discover-button"),
  menu_eyebrow:val("setting-menu-eyebrow"),services_eyebrow:val("setting-services-eyebrow"),contact_eyebrow:val("setting-contact-eyebrow"),
  contact_submit_text:val("setting-contact-submit"),address_label:val("setting-address-label"),reservation_label:val("setting-reservation-label"),
  hours_label:val("setting-hours-label"),favorites_button_text:val("setting-favorites-text"),search_placeholder:val("setting-search-placeholder"),contact_title:val("setting-contact-title"),
  contact_description:val("setting-contact-description"),footer_text:val("setting-footer-text"),feature_tags:tags,
  ordering_enabled:enabled,show_services:flag("setting-show-services"),show_contact:flag("setting-show-contact"),
  show_address:flag("setting-show-address"),show_reservation:flag("setting-show-reservation"),show_working_hours:flag("setting-show-hours")
 };
 const {error}=await supabase.from("restaurant_settings").update(payload).eq("restaurant_id",RESTAURANT_ID);
 if(error)msg($("#settings-msg"),"تعذر حفظ الإعدادات: "+error.message,true);
 else msg($("#settings-msg"),"تم حفظ محتوى الموقع وإعداداته. حدّث صفحة المطعم لرؤية التغييرات.");
});
async function loadServiceManager(){
 const box=$("#service-admin-rows");if(!box)return;
 const {data,error}=await supabase.from("restaurant_services").select("*").eq("restaurant_id",RESTAURANT_ID).order("sort_order");
 if(error){msg($("#service-admin-msg"),"تعذر تحميل الخدمات: "+error.message,true);return;}
 box.innerHTML="";
 (data||[]).forEach(s=>{
  const row=document.createElement("div");row.className="category-row";
  const title=document.createElement("strong");title.textContent=s.icon+" "+s.title;
  const state=document.createElement("span");state.textContent=s.is_active?"ظاهر":"مخفي";
  const edit=document.createElement("button");edit.type="button";edit.className="outline-btn small-action";edit.textContent="تعديل";
  edit.onclick=()=>{$("#service-admin-id").value=s.id;$("#service-admin-title").value=s.title;$("#service-admin-icon").value=s.icon;$("#service-admin-key").value=s.service_key;$("#service-admin-key").disabled=true;$("#service-admin-active").checked=s.is_active;};
  const toggle=document.createElement("button");toggle.type="button";toggle.className="outline-btn small-action";toggle.textContent=s.is_active?"إخفاء":"إظهار";
  toggle.onclick=async()=>{const {error}=await supabase.from("restaurant_services").update({is_active:!s.is_active}).eq("id",s.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg($("#service-admin-msg"),error.message,true);return;}await loadServiceManager();};
  const del=document.createElement("button");del.type="button";del.className="delete-btn small-action";del.textContent="حذف";
  del.onclick=async()=>{if(!confirm("حذف الخدمة من واجهة الزبون؟ لن تُحذف الطلبات القديمة."))return;const {error}=await supabase.from("restaurant_services").delete().eq("id",s.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg($("#service-admin-msg"),error.message,true);return;}await loadServiceManager();};
  row.append(title,state,edit,toggle,del);box.append(row);
 });
}
function resetServiceAdminForm(){$("#service-admin-form").reset();$("#service-admin-id").value="";$("#service-admin-key").disabled=false;$("#service-admin-active").checked=true;}
$("#service-admin-form").addEventListener("submit",async e=>{
 e.preventDefault();const id=$("#service-admin-id").value;
 const payload={restaurant_id:RESTAURANT_ID,service_key:$("#service-admin-key").value.trim(),title:$("#service-admin-title").value.trim(),icon:$("#service-admin-icon").value.trim(),is_active:$("#service-admin-active").checked};
 const result=id?await supabase.from("restaurant_services").update({title:payload.title,icon:payload.icon,is_active:payload.is_active}).eq("id",id).eq("restaurant_id",RESTAURANT_ID):await supabase.from("restaurant_services").insert({...payload,sort_order:Date.now()});
 if(result.error){msg($("#service-admin-msg"),"تعذر حفظ الخدمة: "+result.error.message,true);return;}
 resetServiceAdminForm();msg($("#service-admin-msg"),"تم حفظ الخدمة.");await loadServiceManager();
});
$("#service-admin-reset").addEventListener("click",resetServiceAdminForm);
const serviceStatusNames={pending:"قيد الانتظار",in_progress:"قيد التنفيذ",completed:"مكتمل",cancelled:"ملغي"};
async function loadTableServiceRequests(){
 const box=$("#table-services-list");if(!box)return;
 const [reqRes,tableRes,serviceRes]=await Promise.all([
  supabase.from("table_service_requests").select("id,table_id,request_type,status,created_at,completed_at").eq("restaurant_id",RESTAURANT_ID).order("created_at",{ascending:false}).limit(100),
  supabase.from("restaurant_tables").select("id,table_number,label").eq("restaurant_id",RESTAURANT_ID),
  supabase.from("restaurant_services").select("service_key,title,icon").eq("restaurant_id",RESTAURANT_ID)
 ]);
 if(reqRes.error){box.textContent="تعذر تحميل الطلبات: "+reqRes.error.message;return;}
 const tables=new Map((tableRes.data||[]).map(t=>[t.id,t.label||"طاولة "+t.table_number]));
 const services=new Map((serviceRes.data||[]).map(s=>[s.service_key,s.icon+" "+s.title]));
 const rows=reqRes.data||[];$("#services-badge").textContent=digits(rows.filter(x=>x.status==="pending").length);box.innerHTML="";
 if(!rows.length){box.textContent="لا توجد طلبات خدمات طاولة حالياً.";return;}
 rows.forEach(r=>{
  const card=document.createElement("article");card.className="order-card";
  const head=document.createElement("div");head.className="order-card-head";
  const title=document.createElement("strong");title.textContent=(services.get(r.request_type)||r.request_type)+" — "+(tables.get(r.table_id)||"طاولة غير معروفة");
  const date=document.createElement("small");date.textContent=new Date(r.created_at).toLocaleString("ar-IQ");head.append(title,date);
  const foot=document.createElement("div");foot.className="order-card-foot";
  const state=document.createElement("strong");state.textContent=serviceStatusNames[r.status]||r.status;
  const select=document.createElement("select");select.className="status-select";
  Object.entries(serviceStatusNames).forEach(([v,label])=>{const o=document.createElement("option");o.value=v;o.textContent=label;select.append(o);});
  select.value=r.status;select.onchange=async()=>{const next=select.value;const {error}=await supabase.from("table_service_requests").update({status:next,completed_at:next==="completed"?new Date().toISOString():null}).eq("id",r.id).eq("restaurant_id",RESTAURANT_ID);if(error){msg(box,error.message,true);select.value=r.status;}else loadTableServiceRequests();};
  foot.append(state,select);card.append(head,foot);box.append(card);
 });
}
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
$("#refresh-messages").addEventListener("click",loadMessages);
$("#refresh-table-services").addEventListener("click",loadTableServiceRequests);
setInterval(()=>{if(!dashboard.classList.contains("hidden")){loadOrders();if(!$("#page-table-services").classList.contains("hidden"))loadTableServiceRequests();}},20000);
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
loadDashboard();
