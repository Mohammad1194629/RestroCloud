import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
const SUPABASE_URL="https://ajnmwemjpofmbbuoaiqp.supabase.co";
const SUPABASE_KEY="sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP";
const RESTAURANT_ID="9c9143d1-27cf-41ac-ad6b-cc67ca08dd69";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const notice=$("#notice"),categoriesEl=$("#category-list"),productsEl=$("#product-grid");
const cartCount=$("#cart-count"),cartSummary=$("#cart-summary"),cartItems=$("#cart-items");
const checkoutPanel=$("#checkout-panel"),checkoutMessage=$("#checkout-message");
let products=[],tables=[],activeCategory="all",orderingEnabled=false,searchTerm="",showFavorites=false;
const cart=new Map();
let favorites=new Set();
try{favorites=new Set(JSON.parse(localStorage.getItem("restrocloud-favorites")||"[]"));}catch{favorites=new Set();}
const money=v=>new Intl.NumberFormat("ar-IQ").format(Number(v||0))+" د.ع";
function renderCart(){
 const qty=[...cart.values()].reduce((s,i)=>s+i.quantity,0);
 const total=[...cart.values()].reduce((s,i)=>s+i.price*i.quantity,0);
 cartCount.textContent="السلة "+new Intl.NumberFormat("ar-IQ").format(qty);
 cartSummary.textContent=qty?qty+" صنف · المجموع "+money(total):"لم تضف أي صنف بعد.";
 $("#checkout-total").textContent=money(total);
 cartItems.innerHTML="";
 if(!qty){cartItems.innerHTML='<p class="empty-cart">السلة فارغة. أضف الأصناف التي تريدها من القائمة.</p>';return;}
 cart.forEach(item=>{
  const row=document.createElement("div");row.className="cart-item-row";
  const info=document.createElement("div");info.className="cart-item-info";
  const name=document.createElement("strong");name.textContent=item.name;
  const sub=document.createElement("small");sub.textContent=money(item.price)+" للواحد";
  info.append(name,sub);
  const controls=document.createElement("div");controls.className="quantity-controls";
  const minus=document.createElement("button");minus.type="button";minus.textContent="−";minus.setAttribute("aria-label","تقليل الكمية");
  minus.onclick=()=>changeQty(item.id,-1);
  const count=document.createElement("b");count.textContent=String(item.quantity);
  const plus=document.createElement("button");plus.type="button";plus.textContent="+";plus.setAttribute("aria-label","زيادة الكمية");
  plus.onclick=()=>changeQty(item.id,1);
  controls.append(minus,count,plus);
  const line=document.createElement("strong");line.className="cart-line-total";line.textContent=money(item.price*item.quantity);
  row.append(info,controls,line);cartItems.append(row);
 });
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
   const img=document.createElement("img");img.src=p.image_url;img.alt="صورة "+p.name;img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
   img.onerror=()=>{image.innerHTML="";image.classList.add("image-fallback");image.textContent="الصورة غير متاحة";};
   image.append(img);
  }else{image.classList.add("image-fallback");image.textContent="لا توجد صورة";}
  const body=document.createElement("div");body.className="product-body";
  const title=document.createElement("h3");title.textContent=p.name;
  const desc=document.createElement("p");desc.textContent=p.description||"";
  if(p.is_spicy){const tag=document.createElement("span");tag.className="spicy-badge";tag.textContent="🌶️ حار";body.append(tag);}
  const bottom=document.createElement("div");bottom.className="product-bottom";
  const price=document.createElement("span");price.className="price";price.textContent=money(p.price);
  const add=document.createElement("button");add.className="add-btn";add.type="button";add.textContent="أضف للسلة";
  add.onclick=()=>{const item=cart.get(p.id)||{id:p.id,name:p.name,price:Number(p.price),quantity:0};item.quantity++;cart.set(p.id,item);renderCart();add.textContent="أضيف";setTimeout(()=>add.textContent="أضف للسلة",800);};
  bottom.append(price,add);body.append(title,desc,bottom);card.append(image,body);productsEl.append(card);
 });
}
function updateOrderFields(){
 const type=$("#order-type").value;
 $("#table-field").classList.toggle("hidden",type!=="dine_in");
 $("#address-field").classList.toggle("hidden",type!=="delivery");
 $("#phone-field").classList.toggle("hidden",type==="dine_in");
 $("#customer-phone").required=type==="delivery";
 $("#delivery-address").required=type==="delivery";
 $("#table-id").required=type==="dine_in";
}
async function loadMenu(){
 const [catRes,itemRes,settingRes,tableRes]=await Promise.all([
  supabase.from("categories").select("id,name,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("sort_order"),
  supabase.from("products").select("id,category_id,name,description,price,image_url,is_available,is_spicy,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_available",true).order("sort_order"),
  supabase.from("restaurant_settings").select("ordering_enabled,welcome_text,description").eq("restaurant_id",RESTAURANT_ID).maybeSingle(),
  supabase.from("restaurant_tables").select("id,table_number,label").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("table_number")
 ]);
 if(catRes.error){notice.textContent="تعذر تحميل الأقسام: "+catRes.error.message;return;}
 if(itemRes.error){notice.textContent="تعذر تحميل المنتجات: "+itemRes.error.message;return;}
 if(tableRes.error)console.warn("تعذر تحميل الطاولات",tableRes.error);
 products=itemRes.data||[];tables=tableRes.data||[];
 orderingEnabled=settingRes.data?.ordering_enabled===true;
 if(settingRes.data?.welcome_text)$("#welcome-text").textContent=settingRes.data.welcome_text;
 if(settingRes.data?.description)$("#restaurant-description").textContent=settingRes.data.description;
 $("#checkout-submit").disabled=!orderingEnabled;
 $("#ordering-disabled-note").classList.toggle("hidden",orderingEnabled);
 $("#checkout-submit").textContent=orderingEnabled?"إرسال الطلب إلى المطعم":"الطلبات غير مفعّلة حالياً";
 const tableSelect=$("#table-id");tableSelect.innerHTML='<option value="">اختر الطاولة</option>';
 tables.forEach(t=>{const opt=document.createElement("option");opt.value=t.id;opt.textContent=t.label||("طاولة "+t.table_number);tableSelect.append(opt);});
 if(!products.length){notice.textContent="المنيو قيد التجهيز. ستظهر الأصناف هنا بعد إضافتها.";return;}
 notice.classList.add("hidden");renderCategories(catRes.data||[]);renderProducts();
}
$("#order-type").addEventListener("change",updateOrderFields);
$("#menu-search").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLocaleLowerCase("ar");renderProducts();});
$("#favorites-toggle").addEventListener("click",()=>{showFavorites=!showFavorites;$("#favorites-toggle").classList.toggle("active",showFavorites);$("#favorites-toggle").setAttribute("aria-pressed",String(showFavorites));$("#favorites-toggle").textContent=showFavorites?"♥ عرض الكل":"♡ المفضلة";renderProducts();});
$("#checkout-open").addEventListener("click",()=>{checkoutPanel.classList.remove("hidden");checkoutPanel.scrollIntoView({behavior:"smooth",block:"start"});});
$("#checkout-close").addEventListener("click",()=>checkoutPanel.classList.add("hidden"));
$("#cart-clear").addEventListener("click",()=>{cart.clear();renderCart();});
$("#checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();
 if(!cart.size){checkoutMessage.textContent="أضف صنفاً واحداً على الأقل إلى السلة.";return;}
 if(!orderingEnabled){checkoutMessage.textContent="استقبال الطلبات غير مفعّل حالياً. يرجى مراجعة المطعم قبل اعتماد الأسعار التجريبية.";return;}
 const type=$("#order-type").value;
 const items=[...cart.values()].map(i=>({product_id:i.id,quantity:i.quantity}));
 const submit=$("#checkout-submit");submit.disabled=true;checkoutMessage.textContent="جارٍ إرسال الطلب...";
 try{
  const {data,error}=await supabase.rpc("submit_restaurant_order",{
   p_restaurant_id:RESTAURANT_ID,p_order_type:type,
   p_table_id:type==="dine_in"?($("#table-id").value||null):null,
   p_customer_name:$("#customer-name").value.trim()||null,
   p_customer_phone:$("#customer-phone").value.trim()||null,
   p_delivery_address:type==="delivery"?$("#delivery-address").value.trim():null,
   p_notes:$("#order-notes").value.trim()||null,p_items:items
  });
  if(error)throw error;
  cart.clear();renderCart();e.target.reset();updateOrderFields();
  checkoutMessage.textContent="تم إرسال طلبك بنجاح. رقم الطلب: "+data.order_number+" — المجموع: "+money(data.total);
 }catch(err){checkoutMessage.textContent="تعذر إرسال الطلب: "+(err.message||"حدث خطأ غير متوقع");}
 finally{submit.disabled=!orderingEnabled;}
});
updateOrderFields();renderCart();loadMenu();
