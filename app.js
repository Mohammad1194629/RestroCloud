import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const SUPABASE_URL="https://ajnmwemjpofmbbuoaiqp.supabase.co";
const SUPABASE_KEY="sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP";
const RESTAURANT_ID="9c9143d1-27cf-41ac-ad6b-cc67ca08dd69";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const notice=$("#notice"),categoriesEl=$("#category-list"),productsEl=$("#product-grid");
const cartCount=$("#cart-count"),cartSummary=$("#cart-summary"),cartItems=$("#cart-items");
const cartView=$("#cart-view"),serviceView=$("#service-view");
let activeService="captain";
const checkoutPanel=$("#checkout-panel"),checkoutMessage=$("#checkout-message");
let products=[],tables=[],activeCategory="all",orderingEnabled=false,tableLoadFailed=false,searchTerm="",showFavorites=false;
const cart=new Map();
function saveCart(){try{localStorage.setItem("restrocloud-cart",JSON.stringify([...cart.values()].map(i=>({id:i.id,quantity:i.quantity}))));}catch{}}
function restoreCart(){try{const saved=JSON.parse(localStorage.getItem("restrocloud-cart")||"[]");saved.forEach(row=>{const p=products.find(x=>x.id===row.id);const q=Math.max(0,Math.min(99,Number(row.quantity)||0));if(p&&q)cart.set(p.id,{id:p.id,name:p.name,price:Number(p.price),quantity:q});});}catch{}}
let favorites=new Set();
try{favorites=new Set(JSON.parse(localStorage.getItem("restrocloud-favorites")||"[]"));}catch{favorites=new Set();}
const money=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0))+" د.ع";
function renderCart(){
 const qty=[...cart.values()].reduce((s,i)=>s+i.quantity,0);
 const total=[...cart.values()].reduce((s,i)=>s+i.price*i.quantity,0);
 cartCount.textContent="السلة "+new Intl.NumberFormat("ar-IQ").format(qty);
 $("#header-cart-count").textContent=new Intl.NumberFormat("ar-IQ").format(qty);
 $("#cart-preview").textContent=qty?[...cart.values()].slice(0,2).map(i=>i.name+" · "+money(i.price)).join(" | ")+(cart.size>2?" …":""):"سلتك فارغة";
 $("#cart-panel").classList.toggle("cart-panel-visible",qty>0);
 cartSummary.textContent=qty?qty+" صنف · المجموع "+money(total):"لم تضف أي صنف بعد.";
 $("#checkout-total").textContent=money(total);
 cartItems.innerHTML="";saveCart();
 if(!qty){cartItems.innerHTML='<p class="empty-cart">السلة فارغة. أضف الأصناف التي تريدها من القائمة.</p>';return;}
 const table=document.createElement("table");table.className="cart-table";
 const thead=document.createElement("thead"),headRow=document.createElement("tr");
 ["الصنف","سعر الوحدة","الكمية","المجموع"].forEach(label=>{const th=document.createElement("th");th.textContent=label;headRow.append(th);});
 thead.append(headRow);table.append(thead);
 const tbody=document.createElement("tbody");
 cart.forEach(item=>{
  const row=document.createElement("tr");
  const nameCell=document.createElement("td");nameCell.textContent=item.name;
  const priceCell=document.createElement("td");priceCell.textContent=money(item.price);
  const quantityCell=document.createElement("td");
  const controls=document.createElement("div");controls.className="quantity-controls";
  const minus=document.createElement("button");minus.type="button";minus.textContent="−";minus.setAttribute("aria-label","تقليل الكمية");minus.onclick=()=>changeQty(item.id,-1);
  const count=document.createElement("b");count.textContent=String(item.quantity);
  const plus=document.createElement("button");plus.type="button";plus.textContent="+";plus.setAttribute("aria-label","زيادة الكمية");plus.onclick=()=>changeQty(item.id,1);
  controls.append(minus,count,plus);quantityCell.append(controls);
  const totalCell=document.createElement("td");totalCell.className="cart-line-total";totalCell.textContent=money(item.price*item.quantity);
  row.append(nameCell,priceCell,quantityCell,totalCell);tbody.append(row);
 });
 table.append(tbody);cartItems.append(table);
}
function changeQty(id,delta){const item=cart.get(id);if(!item)return;item.quantity+=delta;if(item.quantity<1)cart.delete(id);else cart.set(id,item);renderCart();}
function renderCategories(cats){
 categoriesEl.innerHTML="";
 const addChip=(id,label)=>{const b=document.createElement("button");b.className="category-chip"+(activeCategory===id?" active":"");b.textContent=label;b.onclick=()=>{activeCategory=id;renderCategories(cats);renderProducts();};categoriesEl.append(b);};
 addChip("all","الكل");cats.forEach(c=>addChip(c.id,c.name));
}
function renderProducts(){
 productsEl.innerHTML="";
 const visible=products.filter(p=>(activeCategory==="all"||p.category_id===activeCategory)&&(!searchTerm||(p.name+" "+(p.description||"")).toLocaleLowerCase("ar").includes(searchTerm))&&(!showFavorites||favorites.has(p.id)));
 if(!visible.length){productsEl.innerHTML='<div class="notice">لا توجد أصناف منشورة في هذا القسم حالياً.</div>';return;}
 visible.forEach(p=>{
  const card=document.createElement("article");card.className="product-card";
  const image=document.createElement("div");image.className="product-image";
  if(p.image_url){
   const img=document.createElement("img");img.src=p.image_url;img.alt="صورة "+p.name;img.loading="lazy";img.decoding="async";
   img.onerror=()=>{image.innerHTML="";image.classList.add("image-fallback");image.textContent="🍽️";};
   image.append(img);
  }else{image.classList.add("image-fallback");image.textContent="🍽️";}
  const body=document.createElement("div");body.className="product-body";
  const titleRow=document.createElement("div");titleRow.className="product-title-row";
  const title=document.createElement("h3");title.textContent=p.name;
  const favorite=document.createElement("button");favorite.type="button";favorite.className="favorite-btn"+(favorites.has(p.id)?" is-favorite":"");favorite.textContent=favorites.has(p.id)?"♥":"♡";favorite.setAttribute("aria-label",favorites.has(p.id)?"إزالة من المفضلة":"إضافة للمفضلة");favorite.onclick=()=>{if(favorites.has(p.id))favorites.delete(p.id);else favorites.add(p.id);try{localStorage.setItem("restrocloud-favorites",JSON.stringify([...favorites]));}catch{}renderProducts();};
  titleRow.append(title,favorite);
  const desc=document.createElement("p");desc.textContent=p.description||"";
  if(p.is_spicy){const tag=document.createElement("span");tag.className="spicy-badge";tag.textContent="🌶️ حار";body.append(tag);}
  const bottom=document.createElement("div");bottom.className="product-bottom";
  const price=document.createElement("span");price.className="price";price.textContent=money(p.price);
  const add=document.createElement("button");add.className="add-btn";add.type="button";add.textContent="أضف للسلة";
  add.onclick=()=>{const item=cart.get(p.id)||{id:p.id,name:p.name,price:Number(p.price),quantity:0};item.quantity++;cart.set(p.id,item);renderCart();add.textContent="أضيف";setTimeout(()=>add.textContent="أضف للسلة",800);};
  bottom.append(price,add);body.append(titleRow,desc,bottom);card.append(image,body);productsEl.append(card);
 });
}
function updateOrderFields(){
 const type=$("#order-type").value;
 const dineIn=type==="dine_in";
 const delivery=type==="delivery";
 $("#table-field").classList.toggle("hidden",!dineIn);
 $("#address-field").classList.toggle("hidden",!delivery);
 $("#phone-field").classList.toggle("hidden",dineIn);
 $("#customer-name").required=true;
 $("#customer-phone").required=!dineIn;
 $("#delivery-address").required=delivery;
 $("#table-id").required=dineIn;
 $("#checkout-submit").disabled=!orderingEnabled||(dineIn&&tables.length===0);
 if(!dineIn) $("#table-id").value="";
 if(!delivery) $("#delivery-address").value="";
}
async function loadMenu(){
 const [catRes,itemRes,settingRes,tableRes]=await Promise.all([
  supabase.from("categories").select("id,name,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("sort_order"),
  supabase.from("products").select("id,category_id,name,description,price,image_url,is_available,is_spicy,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_available",true).order("sort_order"),
  supabase.from("restaurant_settings").select("ordering_enabled,welcome_text,description,cover_url,phone,address,reservation_phone,opening_time,closing_time").eq("restaurant_id",RESTAURANT_ID).maybeSingle(),
  supabase.from("restaurant_tables").select("id,table_number,label").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("table_number")
 ]);
 if(catRes.error){notice.textContent="تعذر تحميل الأقسام: "+catRes.error.message;return;}
 if(itemRes.error){notice.textContent="تعذر تحميل المنتجات: "+itemRes.error.message;return;}
 if(tableRes.error){
  console.error("تعذر تحميل الطاولات",tableRes.error);
  tables=[];tableLoadFailed=true;
  notice.textContent="تعذر تحميل أرقام الطاولات حالياً. يمكنك اختيار التوصيل أو الاستلام، أو إعادة تحميل الصفحة.";
  notice.classList.remove("hidden");
 }else{tables=tableRes.data||[];tableLoadFailed=false;}
 products=(itemRes.data||[]).filter(p=>(catRes.data||[]).some(c=>c.id===p.category_id));restoreCart();renderCart();
 orderingEnabled=settingRes.data?.ordering_enabled===true;
 if(settingRes.data?.welcome_text)$("#welcome-text").textContent=settingRes.data.welcome_text;
 if(settingRes.data?.description)$("#restaurant-description").textContent=settingRes.data.description;
 if(settingRes.data?.cover_url){const cover=settingRes.data.cover_url.trim();if(cover.startsWith("https://"))document.querySelector(".hero").style.backgroundImage="linear-gradient(110deg,rgba(26,20,16,.84),rgba(26,20,16,.62)),url("+cover+")";}
 if(settingRes.data?.phone)$("#footer-phone").textContent="للتواصل: "+settingRes.data.phone;
  $("#restaurant-address").textContent=settingRes.data?.address||"تلعفر";
  $("#reservation-phone").textContent=settingRes.data?.reservation_phone||settingRes.data?.phone||"يُحدّد من إدارة المطعم";
  const open=settingRes.data?.opening_time,close=settingRes.data?.closing_time;
  $("#working-hours").textContent=open&&close?String(open).slice(0,5)+" – "+String(close).slice(0,5):"يُحدّد من إدارة المطعم";
 $("#checkout-submit").disabled=!orderingEnabled;
 $("#ordering-disabled-note").classList.toggle("hidden",orderingEnabled);
 $("#checkout-submit").textContent=orderingEnabled?"إرسال الطلب إلى المطعم":"الطلبات غير مفعّلة حالياً";
 const tableSelect=$("#table-id");tableSelect.innerHTML='<option value="">اختر رقم الطاولة</option>';
 tables.forEach(t=>{const opt=document.createElement("option");opt.value=t.id;opt.textContent=t.label||("طاولة "+t.table_number);tableSelect.append(opt);});
  const serviceTable=$("#service-table-id");serviceTable.innerHTML='<option value="">اختر الطاولة</option>';
  tables.forEach(t=>{const opt=document.createElement("option");opt.value=t.id;opt.textContent=t.label||("طاولة "+t.table_number);serviceTable.append(opt);});
 tableSelect.disabled=tables.length===0;
 updateOrderFields();
 if(!tables.length && $("#order-type").value==="dine_in" && orderingEnabled){
  checkoutMessage.textContent="لا توجد طاولات متاحة للاختيار حالياً. اختر التوصيل أو الاستلام.";
 }
 const params=new URLSearchParams(location.search);const qrTable=params.get("table")||params.get("table_number");if(qrTable){const match=tables.find(t=>String(t.table_number)===String(qrTable));if(match){tableSelect.value=match.id;$("#service-table-id").value=match.id;$("#order-type").value="dine_in";updateOrderFields();}}
 if(!products.length){notice.textContent="المنيو قيد التجهيز. ستظهر الأصناف هنا بعد إضافتها.";return;}
 if(!tableLoadFailed)notice.classList.add("hidden");renderCategories(catRes.data||[]);renderProducts();
}
$("#order-type").addEventListener("change",updateOrderFields);
$("#menu-search").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLocaleLowerCase("ar");renderProducts();});
$("#favorites-toggle").addEventListener("click",()=>{showFavorites=!showFavorites;$("#favorites-toggle").classList.toggle("active",showFavorites);$("#favorites-toggle").setAttribute("aria-pressed",String(showFavorites));$("#favorites-toggle").textContent=showFavorites?"♥ عرض الكل":"♡ المفضلة";renderProducts();});
function openCartView(){cartView.classList.remove("hidden");document.body.classList.add("modal-open");}
function closeCartView(){cartView.classList.add("hidden");document.body.classList.remove("modal-open");}
$("#checkout-open").addEventListener("click",openCartView);
$("#header-cart-open").addEventListener("click",openCartView);
$("#checkout-close").addEventListener("click",closeCartView);
cartView.addEventListener("click",e=>{if(e.target===cartView)closeCartView();});
$("#cart-clear").addEventListener("click",()=>{cart.clear();renderCart();});
const serviceNames={captain:"طلب نادل",water:"طلب ماء",cleaning:"طلب تنظيف",bill:"طلب الفاتورة"};
document.querySelectorAll("[data-service]").forEach(button=>button.addEventListener("click",()=>{
 activeService=button.dataset.service;
 $("#service-modal-title").textContent=serviceNames[activeService]||"طلب خدمة";
 $("#service-selected-label").textContent="سيتم إرسال: "+serviceNames[activeService]+" إلى الطاولة التي تختارها.";
 $("#service-message").textContent="";
 serviceView.classList.remove("hidden");document.body.classList.add("modal-open");
}));
function closeServiceView(){serviceView.classList.add("hidden");document.body.classList.remove("modal-open");}
$("#service-close").addEventListener("click",closeServiceView);
serviceView.addEventListener("click",e=>{if(e.target===serviceView)closeServiceView();});
$("#service-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const tableId=$("#service-table-id").value;
 const table=tables.find(t=>t.id===tableId);
 const status=$("#service-message"),button=e.currentTarget.querySelector('button[type="submit"]');
 if(!table){status.textContent="اختر رقم الطاولة أولاً.";return;}
 button.disabled=true;status.textContent="جارٍ إرسال الطلب...";
 const {error}=await supabase.from("table_service_requests").insert({restaurant_id:RESTAURANT_ID,table_id:tableId,request_type:activeService});
 button.disabled=false;
 if(error){status.textContent="تعذر إرسال الطلب: "+error.message;return;}
 status.textContent="تم إرسال "+serviceNames[activeService]+" للطاولة "+(table.label||table.table_number)+".";
 e.currentTarget.reset();
 setTimeout(closeServiceView,1300);
});
$("#checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!cart.size){checkoutMessage.textContent="السلة فارغة. أضف وجبة أولاً.";return;}
 if(!orderingEnabled){checkoutMessage.textContent="استقبال الطلبات متوقف حالياً. يرجى التواصل مع المطعم.";return;}
 const form=e.currentTarget;
 if(!form.reportValidity())return;
 const type=$("#order-type").value;
 const tableId=type==="dine_in"?$("#table-id").value:null;
 const phone=$("#customer-phone").value.trim();
 const address=$("#delivery-address").value.trim();
 if(type==="dine_in"&&(!tableId||!tables.some(t=>t.id===tableId))){
  checkoutMessage.textContent="اختر رقم الطاولة من القائمة قبل إرسال الطلب.";$("#table-id").focus();return;
 }
 if(type==="delivery"&&(!phone||!address)){
  checkoutMessage.textContent="للتوصيل، أدخل رقم الهاتف وعنوان التوصيل.";return;
 }
 if(type==="pickup"&&!phone){
  checkoutMessage.textContent="أدخل رقم هاتف للتواصل بشأن طلب الاستلام.";$("#customer-phone").focus();return;
 }
 const items=[...cart.values()].map(i=>({product_id:i.id,quantity:i.quantity}));
 const submit=$("#checkout-submit");submit.disabled=true;checkoutMessage.textContent="جارٍ إرسال الطلب إلى المطعم...";
 try{
  const {data,error}=await supabase.rpc("submit_restaurant_order",{
   p_restaurant_id:RESTAURANT_ID,p_order_type:type,
   p_table_id:tableId,
   p_customer_name:$("#customer-name").value.trim(),
   p_customer_phone:phone||null,
   p_delivery_address:deliveryAddressOrNull(type,address),
   p_notes:$("#order-notes").value.trim()||null,p_items:items
  });
  if(error)throw error;
  if(!data||!data.order_number)throw new Error("لم يصل تأكيد من قاعدة البيانات. لا تعِد إرسال الطلب قبل مراجعة المطعم.");
  cart.clear();renderCart();try{localStorage.removeItem("restrocloud-cart");}catch{}
  form.reset();$("#order-type").value="dine_in";updateOrderFields();
  checkoutMessage.textContent="تم استلام طلبك بنجاح. رقم الطلب: "+data.order_number+" — المجموع: "+money(data.total)+". احتفظ برقم الطلب.";
 }catch(err){
  console.error("Order submission failed",err);
  const detail=[err.message,err.details,err.hint].filter(Boolean).join(" — ");
  checkoutMessage.textContent="تعذر إرسال الطلب: "+(detail||"حدث خطأ غير متوقع")+". لم يتم تأكيد الطلب.";
 }finally{
  submit.disabled=!orderingEnabled || (type==="dine_in"&&tables.length===0);
 }
});
function deliveryAddressOrNull(type,address){return type==="delivery"?address:null;}
$("#contact-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const button=e.target.querySelector("button[type=submit]");
 const status=$("#contact-status");
 const payload={restaurant_id:RESTAURANT_ID,name:$("#contact-name").value.trim(),phone:$("#contact-phone").value.trim()||null,message:$("#contact-message").value.trim()};
 if(payload.name.length<2||payload.message.length<2){status.textContent="يرجى كتابة الاسم والرسالة بشكل صحيح.";return;}
 button.disabled=true;status.textContent="جارٍ إرسال رسالتك...";
 const {error}=await supabase.from("contact_messages").insert(payload);
 button.disabled=false;
 if(error){status.textContent="تعذر إرسال الرسالة حالياً: "+error.message;return;}
 e.target.reset();status.textContent="وصلت رسالتك إلى إدارة المطعم، شكراً لتواصلك.";
});
updateOrderFields();renderCart();loadMenu();
