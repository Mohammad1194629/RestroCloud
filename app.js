import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const SUPABASE_URL = "https://ajnmwemjpofmbbuoaiqp.supabase.co";
const SUPABASE_KEY = "sb_publishable_w-Z2T2MWYvRnLn71_qW85Q_o1DPJKaP";
const RESTAURANT_ID = "9c9143d1-27cf-41ac-ad6b-cc67ca08dd69";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notice = document.querySelector("#notice");
const categoriesEl = document.querySelector("#category-list");
const productsEl = document.querySelector("#product-grid");
const cartCount = document.querySelector("#cart-count");
const cartSummary = document.querySelector("#cart-summary");
let products = [];
let activeCategory = "all";
const cart = new Map();

const money = value => new Intl.NumberFormat("ar-IQ").format(Number(value || 0)) + " د.ع";

function renderCart(){
  const qty = [...cart.values()].reduce((sum,item)=>sum+item.quantity,0);
  const total = [...cart.values()].reduce((sum,item)=>sum+item.price*item.quantity,0);
  cartCount.textContent = "السلة " + new Intl.NumberFormat("ar-IQ").format(qty);
  cartSummary.textContent = qty ? `${qty} صنف · المجموع ${money(total)}` : "لم تضف أي صنف بعد.";
}
function renderCategories(categories){
  categoriesEl.innerHTML = "";
  const all = document.createElement("button");
  all.className = "category-chip" + (activeCategory==="all"?" active":"");
  all.textContent = "الكل";
  all.onclick = ()=>{activeCategory="all";renderCategories(categories);renderProducts();};
  categoriesEl.append(all);
  categories.forEach(cat=>{
    const b=document.createElement("button");
    b.className="category-chip"+(activeCategory===cat.id?" active":"");
    b.textContent=cat.name;
    b.onclick=()=>{activeCategory=cat.id;renderCategories(categories);renderProducts();};
    categoriesEl.append(b);
  });
}
function renderProducts(){
  productsEl.innerHTML="";
  const visible=products.filter(p=>activeCategory==="all"||p.category_id===activeCategory);
  if(!visible.length){productsEl.innerHTML='<div class="notice">لا توجد أصناف منشورة في هذا القسم حالياً.</div>';return;}
  visible.forEach(p=>{
    const card=document.createElement("article");card.className="product-card";
    const image=document.createElement("div");image.className="product-image";
    if(p.image_url){const img=document.createElement("img");img.src=p.image_url;img.alt=p.name;img.loading="lazy";image.append(img);}
    else image.textContent="صورة الصنف";
    const body=document.createElement("div");body.className="product-body";
    const title=document.createElement("h3");title.textContent=p.name;
    const desc=document.createElement("p");desc.textContent=p.description||"";
    const bottom=document.createElement("div");bottom.className="product-bottom";
    const price=document.createElement("span");price.className="price";price.textContent=money(p.price);
    const add=document.createElement("button");add.className="add-btn";add.textContent="أضف للسلة";
    add.onclick=()=>{const item=cart.get(p.id)||{name:p.name,price:Number(p.price),quantity:0};item.quantity++;cart.set(p.id,item);renderCart();add.textContent="تمت الإضافة";setTimeout(()=>add.textContent="أضف للسلة",900);};
    bottom.append(price,add);body.append(title,desc,bottom);card.append(image,body);productsEl.append(card);
  });
}
async function loadMenu(){
  const {data:cats,error:catError}=await supabase.from("categories").select("id,name,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_active",true).order("sort_order");
  if(catError){notice.textContent="تعذر تحميل الأقسام. تحقق من اتصال قاعدة البيانات وسياسات القراءة.";return;}
  const {data:items,error:itemError}=await supabase.from("products").select("id,category_id,name,description,price,image_url,is_available,sort_order").eq("restaurant_id",RESTAURANT_ID).eq("is_available",true).order("sort_order");
  if(itemError){notice.textContent="تعذر تحميل المنتجات. حاول مرة أخرى لاحقاً.";return;}
  products=items||[];
  if(!products.length){notice.textContent="المنيو قيد التجهيز. ستظهر الأصناف هنا بعد إضافتها ونشر المطعم.";return;}
  notice.classList.add("hidden");
  renderCategories(cats||[]);renderProducts();
}
document.querySelector("#cart-clear").addEventListener("click",()=>{cart.clear();renderCart();});
renderCart();
loadMenu();
