(() => {
'use strict';
const DB = window.TWDB_DATA;
if (!DB || !Array.isArray(DB.items)) throw new Error('data.js non caricato');
const CURRENT_IDS = new Set(DB.items.map(x=>x.item_id));

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const upgrades = new Map();
const compareSelected = new Set();
const MAX_COMPARE = 4;
let compareOpen = false;
let activeSetFilter = "all";
let activeItem=null;
let lastEvent=null;

const LABELS = {
  strength:'Forza', flexibility:'Agilità', dexterity:'Destrezza', charisma:'Carisma',
  build:'Costruzione', punch:'Vigore', tough:'Robustezza', endurance:'Energia',
  health:'Punti vita', ride:'Cavalcata', reflex:'Riflessi', dodge:'Schivata',
  hide:'Nascosto', swim:'Nuoto', aim:'Mira', shot:'Sparare', pitfall:'Trappole',
  finger_dexterity:'Precisione', repair:'Riparazione', leadership:'Comando',
  tactic:'Tattica', trade:'Negoziazione', animal:'Rapporto con gli animali',
  appearance:'Aspetto', experience:'Esperienza per lavori, duelli e battaglie ai forti',
  dollar:'Soldi da lavori e duelli', luck:'Maggior fortuna', regen:'Rigenerazione',
  drop:'Probabilità di trovare prodotti', speed:'Velocità', pray:'Pregare'
};
const PERCENT = new Set(['experience','dollar','luck','regen','drop','speed']);
const ATTRS = new Set(['strength','flexibility','dexterity','charisma']);
const SKILLS = new Set(['build','punch','tough','endurance','health','ride','reflex','dodge','hide','swim','aim','shot','pitfall','finger_dexterity','repair','leadership','tactic','trade','animal','appearance']);

function fmt(v, max=3){
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n=Number(v);
  if (Math.abs(n-Math.round(n))<1e-10) return String(Math.round(n));
  return n.toFixed(max).replace(/0+$/,'').replace(/\.$/,'').replace('.',',');
}
function roundNative(x, method){
  switch(method){
    case 'round': return Math.round(x);
    case 'ceil': return Math.ceil(x);
    case 'floatceil': return Math.ceil(100*x)/100;
    case 'floor': return Math.floor(x);
    default: return x;
  }
}
function calcItemLevelBonus(level,value){
  level=Number(level)||0; value=Number(value)||0;
  if(!level || !value) return 0;
  if(value < 1) return Math.round(Math.max(1,value*1000*level))/10000;
  return Math.round(Math.max(1,value*level/10));
}
function getUp(item){
  if(!item.upgradeable) return 0;
  return Math.max(0,Math.min(5,Number(upgrades.get(item.base_id) || 0)));
}
function characterLevel(){
  const n=Number($('#level').value);
  return Number.isFinite(n) && n>0 ? Math.floor(n) : 0;
}
function upgradeDirectObject(obj,up){
  const out=clone(obj || {});
  function walk(node){
    if(!node || Array.isArray(node) || typeof node!=='object') return;
    for(const k of Object.keys(node)){
      const v=node[k];
      if(Array.isArray(v)) continue; // identico a Item.parseLvlUp: gli array non vengono percorsi
      if(v && typeof v==='object') walk(v);
      else if(typeof v==='number') node[k]=v+calcItemLevelBonus(up,v);
    }
  }
  if(up) walk(out);
  return out;
}
function upgradedTravelSpeed(speed,up){
  if(!speed || speed===1) return speed;
  if(!up) return speed;
  let s=(1/speed)-1;
  s=Math.round(s*10000);
  s+=calcItemLevelBonus(up,s);
  s=s/10000;
  return 1/(s+1);
}
function itemBonusValue(bonus,up,modifier=null,roundingMethod=null){
  if(!bonus || typeof bonus.value!=='number') return null;
  let value=modifier ? modifier(bonus.value) : bonus.value;
  if(up && bonus.type!=='speed'){
    value += calcItemLevelBonus(up,value);
  }else if(up && bonus.type==='speed'){
    value += Math.round((value*up/10)*100)/100;
  }
  if(roundingMethod) value=roundNative(value,roundingMethod);
  return value;
}
function characterEntryValue(entry,up,level){
  if(!entry || entry.type!=='character' || !entry.bonus) return null;
  if(entry.key==='level'){
    if(!level) return null;
    // west.item.Weapon.getDamageBonus usa una regola propria per i danni per livello.
    if(entry.bonus.type==='damage' && typeof entry.bonus.value==='number'){
      const raw=entry.bonus.value*level;
      return Math.round(raw)+calcItemLevelBonus(up,raw);
    }
    const method=entry.roundingMethod;
    return itemBonusValue(
      entry.bonus,
      up,
      val => roundNative(val*level,method),
      method
    );
  }
  return itemBonusValue(entry.bonus,up);
}
// Per ordinamento/confronto non possiamo azzerare i bonus "per livello"
// quando il campo Livello è vuoto: in quel caso usiamo il coefficiente nativo
// (es. 0,63 Robustezza per livello), applicando comunque l'upgrade M0..M5.
// Se viene inserito un livello, torniamo invece al valore reale calcolato.
function characterEntryMetricValue(entry,up,level){
  if(!entry || entry.type!=='character' || !entry.bonus) return null;
  if(entry.key==='level'){
    if(level) return characterEntryValue(entry,up,level);
    return itemBonusValue(entry.bonus,up);
  }
  return itemBonusValue(entry.bonus,up);
}
function replaceLeadingValue(desc,value,percent=false){
  if(!desc) return null;
  const shown=percent ? String(Math.round(value*100))+'%' : fmt(value);
  return String(desc).replace(/^\s*\+\s*[-+]?\d+(?:[.,]\d+)?%?/, '+ '+shown);
}
function fortLabel(name,isSector){
  const m={defense:'Difesa',offense:'Attacco',resistance:'Resistenza',damage:'Danni'};
  return `${m[name]||name} (${isSector?'Bonus settore battaglia per il forte':'Bonus battaglia per il forte'})`;
}
function displayInner(inner,value,entryDesc=null){
  if(value==null) return entryDesc ? esc(entryDesc) : '';
  const type=inner.type;
  if(type==='attribute' || type==='skill'){
    return `+ ${fmt(value)} ${esc(LABELS[inner.name]||inner.name)}`;
  }
  if(type==='job'){
    if(entryDesc) return esc(replaceLeadingValue(entryDesc,value,false));
    return `+ ${fmt(value)} Punti lavoro`;
  }
  if(type==='fortbattle'){
    return `+ ${fmt(value)} ${esc(fortLabel(inner.name,!!inner.isSector))}`;
  }
  if(PERCENT.has(type)){
    return `+ ${Math.round(value*100)}% ${esc(LABELS[type]||type)}`;
  }
  if(type==='pray') return `+ ${fmt(value)} Prega`;
  if(type==='damage') return `+ ${fmt(value)} Danni`;
  if(entryDesc) return esc(replaceLeadingValue(entryDesc,value,PERCENT.has(type)));
  return `+ ${fmt(value)} ${esc(LABELS[type]||type)}`;
}
function entryHtml(entry,item,up,level){
  if(!entry) return '';
  let inner=entry, value=null;
  if(entry.type==='character'){
    inner=entry.bonus || {};
    value=characterEntryValue(entry,up,level);
  }else{
    value=itemBonusValue(entry,up);
  }

  const name=inner.name;
  let cls='bonus_misc';
  if(inner.type==='attribute' || ATTRS.has(name)) cls='bonus_attr';
  else if(inner.type==='skill' || SKILLS.has(name)) cls='bonus_skill';
  else if(inner.type==='fortbattle') cls='bonus_fort';

  if(value==null && entry.type==='character' && !level){
    return `<p class="${cls}">${esc(entry.desc||'Bonus per livello')}</p>`;
  }

  const txt=displayInner(inner,value,entry.desc);
  if(value!=null && value<0) cls+=' bonus_negative';
  return `<p class="${cls}">${txt}</p>`;
}
function effectiveDirectBonus(item,up){
  return upgradeDirectObject(item.bonus || {}, up);
}
function travelSpeedPercent(item,up){
  const s=upgradedTravelSpeed(item.speed,up);
  if(!s) return 0;
  return Math.round((1/s)*100-100);
}
function weaponDamage(item,up,level){
  const d=item.damage;
  if(!d || typeof d.damage_min!=='number' || typeof d.damage_max!=='number') return null;
  let min=Number(d.damage_min), max=Number(d.damage_max);
  if(up && item.upgradeable){
    min+=calcItemLevelBonus(up,min);
    max+=calcItemLevelBonus(up,max);
  }
  let bonus=0;
  if(level){
    for(const e of (item.bonus?.item||[])){
      if(e?.type==='character' && e?.bonus?.type==='damage' && typeof e.bonus.value==='number'){
        const raw=e.bonus.value*level;
        bonus+=Math.round(raw)+calcItemLevelBonus(up,raw);
      }
    }
  }
  return {min:min+bonus,max:max+bonus};
}
function metric(item,key){
  const up=getUp(item), level=characterLevel();
  if(key==='base_id') return Number(item.base_id)||0;
  if(key==='level') return Number(item.level)||0;
  if(key==='price') return Number(item.price)||0;
  if(key==='name') return item.name||'';
  if(key==='damage_avg' || key==='damage_max'){
    const d=weaponDamage(item,up,level);
    if(!d) return 0;
    return key==='damage_max' ? d.max : (d.min+d.max)/2;
  }

  let total=0;
  const b=effectiveDirectBonus(item,up);
  if(ATTRS.has(key)) total += Number((b.attributes||{})[key]||0);
  if(SKILLS.has(key)) total += Number((b.skills||{})[key]||0);
  if(key==='fbdef') total += Number((b.fortbattle||{}).defense||0);
  if(key==='fboff') total += Number((b.fortbattle||{}).offense||0);
  if(key==='fbres') total += Number((b.fortbattle||{}).resistance||0);
  if(key==='fbdefs') total += Number((b.fortbattlesector||{}).defense||0);
  if(key==='fboffs') total += Number((b.fortbattlesector||{}).offense||0);
  if(key==='fbdmgs') total += Number((b.fortbattlesector||{}).damage||0);
  if(key==='speed') total += travelSpeedPercent(item,up);

  for(const e of (item.bonus?.item || [])){
    let inner=e, value;
    if(e.type==='character'){
      inner=e.bonus||{};
      value=characterEntryMetricValue(e,up,level);
      if(value==null) continue;
    }else{
      value=itemBonusValue(e,up);
    }
    if(value==null) continue;
    if((inner.type==='attribute'||inner.type==='skill') && inner.name===key) total+=value;
    else if(PERCENT.has(key) && inner.type===key) total+=value*100;
    else if(key==='labor_pts' && inner.type==='job') total+=value;
    else if(key==='pray' && inner.type==='pray') total+=value;
    else if(inner.type==='fortbattle'){
      if(!inner.isSector && inner.name==='defense' && key==='fbdef') total+=value;
      if(!inner.isSector && inner.name==='offense' && key==='fboff') total+=value;
      if(!inner.isSector && inner.name==='resistance' && key==='fbres') total+=value;
      if(inner.isSector && inner.name==='defense' && key==='fbdefs') total+=value;
      if(inner.isSector && inner.name==='offense' && key==='fboffs') total+=value;
      if(inner.isSector && inner.name==='damage' && key==='fbdmgs') total+=value;
    }
  }
  return total;
}
function popupHtml(item){
  const up=getUp(item), level=characterLevel();
  const b=effectiveDirectBonus(item,up);
  let h=`<div class="popup_image">${up?`<div class="item_level_popup"><span class="popup_icon_level"></span><span class="popup_level_value">${up}</span></div>`:''}<img src="${esc(item.image)}" alt=""></div>`;
  h+=`<div class="popup_divider"></div><p class="popup_name">${esc(item.name)}</p><p class="popup_type">${esc(DB.meta.title||'Oggetti')}</p>`;
  const wd=weaponDamage(item,up,level);
  if(wd) h+=`<p class="popup_dmg">${fmt(wd.min)}-${fmt(wd.max)} Danni</p>`;

  // bonus diretti
  for(const [k,v] of Object.entries(b.attributes||{})){
    if(v) h+=`<p class="bonus_attr${v<0?' bonus_negative':''}">${v>=0?'+ ':''}${fmt(v)} ${esc(LABELS[k]||k)}</p>`;
  }
  for(const [k,v] of Object.entries(b.skills||{})){
    if(v) h+=`<p class="bonus_skill${v<0?' bonus_negative':''}">${v>=0?'+ ':''}${fmt(v)} ${esc(LABELS[k]||k)}</p>`;
  }

  // bonus item strutturati
  for(const e of (item.bonus?.item||[])) h+=entryHtml(e,item,up,level);

  // speed come proprietà nativa dell'item
  const tsp=travelSpeedPercent(item,up);
  if(tsp) h+=`<p class="bonus_misc">+ ${fmt(tsp)}% Velocità</p>`;

  const fb=b.fortbattle||{};
  if(fb.defense) h+=`<p class="bonus_fort">+ ${fmt(fb.defense)} Difesa (Bonus battaglia per il forte)</p>`;
  if(fb.offense) h+=`<p class="bonus_fort">+ ${fmt(fb.offense)} Attacco (Bonus battaglia per il forte)</p>`;
  if(fb.resistance) h+=`<p class="bonus_fort">+ ${fmt(fb.resistance)} Resistenza (Bonus battaglia per il forte)</p>`;
  const fbs=b.fortbattlesector||{};
  if(fbs.defense) h+=`<p class="bonus_fort">+ ${fmt(fbs.defense)} Difesa (Bonus settore battaglia per il forte)</p>`;
  if(fbs.offense) h+=`<p class="bonus_fort">+ ${fmt(fbs.offense)} Attacco (Bonus settore battaglia per il forte)</p>`;
  if(fbs.damage) h+=`<p class="bonus_fort">+ ${fmt(fbs.damage)} Danni (Bonus settore battaglia per il forte)</p>`;

  if(item.set && DB.sets[item.set]){
    const s=DB.sets[item.set];
    h+=`<p class="popup_set">${esc(s.name||item.set)}</p>`;
    h+=`<ul class="set_members">`;
    for(const m of (s.items||[])) h+=`<li>${esc(m.name)}${CURRENT_IDS.has(m.item_id)?' ◀':''}</li>`;
    h+=`</ul>`;
  }

  const em=item.event_meta||{};
  if(em.event || em.year || (em.icons&&em.icons.length)){
    const codes=(em.icons||[]);
    const primaryCodes=codes.filter(code=>code!=='sale');
    const hasSale=codes.includes('sale');
    const primaryIcons=primaryCodes.map(code=>
      `<img class="event_icon" src="assets/events/${esc(code)}.png" alt="" title="${esc(em.event||code)}">`
    ).join('');
    const saleIcon=hasSale
      ? `<img class="event_icon event_sale_icon" src="assets/events/sale.png" alt="Current Sales" title="Current Sales">`
      : '';
    const eventText=em.text ? esc(em.text) : (em.event ? `${esc(em.event)}${em.year?' · '+esc(em.year):''}` : (em.year?esc(em.year):''));
    h+=`<div class="event_line">${primaryIcons}${eventText?`<span class="event_text">${eventText}</span>`:''}${saleIcon}</div>`;
  }

  if(item.sellable){
    h+=`<div class="popup_prices">`;
    if(item.price!=null) h+=`<span class="popup_price"><img class="price_action_icon" src="assets/ui/buy.png" alt="Acquisto" title="Prezzo di acquisto"><img class="currency_icon" src="assets/ui/dollars.png" alt="$">${fmt(item.price)}</span>`;
    if(item.sell_price!=null) h+=`<span class="popup_price"><img class="price_action_icon" src="assets/ui/sell.png" alt="Vendita" title="Prezzo di vendita"><img class="currency_icon" src="assets/ui/dollars.png" alt="$">${fmt(item.sell_price)}</span>`;
    h+=`</div>`;
  } else {
    h+=`<p class="popup_warn">Non vendibile</p>`;
  }
  h+=`<div class="popup_meta">Livello oggetto <b>${fmt(item.level||0)}</b> · ${item.auctionable&&!up?'Vendibile all’asta':'Non vendibile all’asta'} · ${item.upgradeable?'Migliorabile':'Non migliorabile'}</div>`;
  const baseItemId=Number(item.base_id)*1000; const shownItemId=baseItemId+up; h+=`<div class="popup_meta popup_id">[item=<b>${baseItemId}${up?` → ${shownItemId}`:''}</b>]</div>`;
  return h;
}
function positionPopup(ev){
  const p=$('#popup_window');
  p.style.display='block';
  const r=p.getBoundingClientRect(), w=innerWidth, h=innerHeight;
  let left=ev.pageX+18, top=ev.pageY+16;
  if(ev.clientX+r.width+25>w) left=ev.pageX-r.width-18;
  if(ev.clientY+r.height+25>h) top=ev.pageY-r.height-18;
  p.style.left=Math.max(4,left)+'px';
  p.style.top=Math.max(4,top)+'px';
}
function showPopup(item,ev){
  activeItem=item;
  lastEvent=ev;
  $('#popup_contents').innerHTML=popupHtml(item);
  $('#popup_window').setAttribute('aria-hidden','false');
  positionPopup(ev);
}
function hidePopup(){
  $('#popup_window').style.display='none';
  $('#popup_window').setAttribute('aria-hidden','true');
}
function setUpgrade(item,level){
  const up=Math.max(0,Math.min(5,Number(level)||0));
  upgrades.set(item.base_id,up);

  // Ridisegno necessario: con un miglioramento l'oggetto può superare
  // quello precedente nell'ordinamento corrente.
  render();

  if(activeItem && activeItem.base_id===item.base_id && lastEvent){
    showPopup(item,lastEvent);
  }
}
function makeUpgradeButton(cls,title,item,delta){
  const b=document.createElement('span');
  b.className=cls;
  b.title=title;
  b.setAttribute('role','button');
  b.tabIndex=0;

  const act=e=>{
    e.preventDefault();
    e.stopPropagation();
    setUpgrade(item,getUp(item)+delta);
  };

  b.addEventListener('mousedown',e=>e.stopPropagation());
  b.addEventListener('click',act);
  b.addEventListener('keydown',e=>{
    if(e.key==='Enter' || e.key===' ') act(e);
  });
  return b;
}
const COMPARE_ORDER = [
  'strength','flexibility','dexterity','charisma',
  'build','punch','tough','endurance','health','ride','reflex','dodge','hide','swim','aim','shot','pitfall','finger_dexterity','repair','leadership','tactic','trade','animal','appearance',
  'experience','dollar','luck','regen','drop','speed','labor_pts','pray',
  'fbdef','fboff','fbres','fbdefs','fboffs','fbdmgs','damage_avg','damage_max'
];
const COMPARE_LABELS = {
  labor_pts:'Punti lavoro', pray:'Pregare',
  fbdef:'Difesa (Bonus battaglia per il forte)',
  fboff:'Attacco (Bonus battaglia per il forte)',
  fbres:'Resistenza (Bonus battaglia per il forte)',
  fbdefs:'Difesa (Bonus settore battaglia per il forte)',
  fboffs:'Attacco (Bonus settore battaglia per il forte)',
  fbdmgs:'Danni (Bonus settore battaglia per il forte)',
  damage_avg:'Danno medio', damage_max:'Danno massimo'
};
function populateSecondarySort(){
  const primary=$('#sort'), secondary=$('#sort2');
  if(!primary || !secondary) return;
  for(const opt of primary.options){
    const c=opt.cloneNode(true);
    c.selected=false;
    secondary.appendChild(c);
  }
}
function sortValue(item,key){
  if(!key) return null;
  return metric(item,key);
}
function compareSingleValue(av,bv,key){
  if(key==='name' || typeof av==='string' || typeof bv==='string')
    return String(av??'').localeCompare(String(bv??''),'it',{sensitivity:'base'});
  return (Number(av)||0)-(Number(bv)||0);
}
function sortComparator(a,b){
  const sort1=$('#sort').value;
  const sort2=$('#sort2')?.value || '';
  const mode=$('#sort_mode')?.value || 'priority';
  const order=$('#order').value;
  let cmp=0;

  if(sort2 && mode==='sum' && sort1!=='name' && sort2!=='name'){
    const av=(Number(sortValue(a,sort1))||0)+(Number(sortValue(a,sort2))||0);
    const bv=(Number(sortValue(b,sort1))||0)+(Number(sortValue(b,sort2))||0);
    cmp=av-bv;
    // A parità di somma: criterio 1, poi criterio 2, poi ID.
    if(cmp===0) cmp=compareSingleValue(sortValue(a,sort1),sortValue(b,sort1),sort1);
    if(cmp===0) cmp=compareSingleValue(sortValue(a,sort2),sortValue(b,sort2),sort2);
  }else{
    cmp=compareSingleValue(sortValue(a,sort1),sortValue(b,sort1),sort1);
    if(cmp===0 && sort2) cmp=compareSingleValue(sortValue(a,sort2),sortValue(b,sort2),sort2);
  }
  if(cmp===0) cmp=(a.base_id||0)-(b.base_id||0);
  return order==='asc'?cmp:-cmp;
}
function sortItems(items,{selectedFirst=false}={}){
  const arr=[...items];
  arr.sort((a,b)=>{
    if(selectedFirst){
      const as=compareSelected.has(String(a.base_id));
      const bs=compareSelected.has(String(b.base_id));
      if(as!==bs) return as?-1:1;
    }
    return sortComparator(a,b);
  });
  return arr;
}
const COMBO_KEYS = new Set([
  'strength','flexibility','dexterity','charisma',
  'build','punch','tough','endurance','health','ride','reflex','dodge','hide','swim','aim','shot','pitfall','finger_dexterity','repair','leadership','tactic','trade','animal','appearance',
  'experience','dollar','luck','regen','drop','speed','labor_pts','pray',
  'fbdef','fboff','fbres','fbdefs','fboffs','fbdmgs'
]);
function updateSortModeState(){
  const primary=$('#sort'), secondary=$('#sort2'), mode=$('#sort_mode');
  if(!primary || !secondary || !mode) return;

  // Evitiamo una falsa "combo" dello stesso criterio due volte.
  if(secondary.value && secondary.value===primary.value) secondary.value='';
  for(const opt of secondary.options){
    opt.disabled=!!opt.value && opt.value===primary.value;
  }

  const hasSecond=!!secondary.value;
  mode.disabled=!hasSecond;
  const sumOpt=[...mode.options].find(o=>o.value==='sum');
  const canSum=hasSecond && COMBO_KEYS.has(primary.value) && COMBO_KEYS.has(secondary.value);
  if(sumOpt) sumOpt.disabled=!canSum;
  if(mode.value==='sum' && !canSum) mode.value='priority';
}
function compareLabel(key){ return COMPARE_LABELS[key] || LABELS[key] || key; }
function compareFormat(key,value){
  if(value==null) return '—';
  const isPercent=PERCENT.has(key)||key==='speed';
  const shown=isPercent?Math.round(value):value;
  const sign=shown>0?'+ ':'';
  return sign+fmt(shown)+(isPercent?'%':'');
}
function compareItemHasValue(item,key){
  const v=metric(item,key);
  return Number.isFinite(Number(v)) && Number(v)!==0;
}
function updateCompareBar(){
  const n=compareSelected.size;
  const status=$('#compare_status');
  if(status) status.textContent=n===0?'Seleziona 1–4 oggetti per il confronto':`${n} oggett${n===1?'o':'i'} selezionat${n===1?'o':'i'}`;
  const btn=$('#compare_btn');
  if(btn) btn.disabled=n<1;
}
function renderCompare(){
  const panel=$('#compare_panel');
  if(!panel) return;
  const chosen=sortItems(DB.items.filter(i=>compareSelected.has(String(i.base_id)))).slice(0,MAX_COMPARE);
  if(!compareOpen || chosen.length<1){ panel.hidden=true; panel.innerHTML=''; return; }
  panel.hidden=false;
  const cols=chosen.length;
  let html=`<div class="compare_title">CONFRONTO · ${chosen.length} oggett${chosen.length===1?'o':'i'}</div>`;
  html+=`<div class="compare_multi_head" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">`;
  for(const item of chosen){
    const up=getUp(item);
    html+=`<div class="compare_card"><img src="${esc(item.image)}" alt="${esc(item.name)}"><div class="compare_name">${esc(item.name)}</div><div class="compare_lvl">${up?`<span class="icon_level"></span>${up}`:'Base'}</div></div>`;
  }
  html+='</div>';
  const keys=COMPARE_ORDER.filter(k=>chosen.some(item=>compareItemHasValue(item,k)));
  html+='<table class="compare_table"><tbody>';
  for(const key of keys){
    const vals=chosen.map(item=>{
      const v=metric(item,key);
      return Number.isFinite(Number(v))?Number(v):null;
    });
    const nums=vals.filter(v=>v!=null);
    const max=nums.length?Math.max(...nums):null, min=nums.length?Math.min(...nums):null;
    html+='<tr>';
    for(const v of vals){
      let cls='equal';
      if(v!=null && max!==null && min!==null && max!==min) cls=v===max?'better':v===min?'worse':'equal';
      html+=`<td class="val ${cls}">${compareFormat(key,v)}</td>`;
    }
    html+=`</tr><tr class="compare_label_row"><td colspan="${cols}">${esc(compareLabel(key))}</td></tr>`;
  }
  html+='</tbody></table>';
  const lvlHint=characterLevel()?'' : ' · Senza livello: i bonus per livello sono confrontati sul coefficiente base.';
  html+=`<div class="compare_hint">Verde = valore migliore · Rosso = valore peggiore · Base o migliorato: usa + / − direttamente sull'oggetto selezionato.${lvlHint}</div>`;
  panel.innerHTML=html;
}
function makeCompareCheck(item,box){
  const c=document.createElement('input');
  c.type='checkbox';
  c.className='compare_check';
  c.title='Seleziona per il confronto';
  const id=String(item.base_id);
  c.checked=compareSelected.has(id);
  c.addEventListener('mousedown',e=>e.stopPropagation());
  c.addEventListener('click',e=>e.stopPropagation());
  c.addEventListener('change',e=>{
    if(e.target.checked){
      if(compareSelected.size>=MAX_COMPARE){
        e.target.checked=false;
        return;
      }
      compareSelected.add(id);
      box.classList.add('compare_selected');
    }else{
      compareSelected.delete(id);
      box.classList.remove('compare_selected');
    }
    // Gli oggetti selezionati salgono subito davanti nella griglia.
    render();
  });
  return c;
}
function card(item){
  const wrap=document.createElement('div');
  wrap.className='item_card';

  const box=document.createElement('div');
  box.className='item_container'+(compareSelected.has(String(item.base_id))?' compare_selected':'');
  box.dataset.lvl=String(getUp(item));
  box.innerHTML=`<img loading="lazy" src="${esc(item.image)}" alt="${esc(item.name)}">`;

  if(item.upgradeable){
    const controls=document.createElement('span');
    controls.className='upgrade_controls';
    controls.dataset.lvl=String(getUp(item));

    const badge=document.createElement('span');
    badge.className='item_level';
    badge.innerHTML='<span class="icon_level"></span>';
    controls.appendChild(badge);

    controls.appendChild(makeUpgradeButton('upgrade','Migliora di 1 livello',item,1));

    const levelSpan=document.createElement('span');
    levelSpan.className='upgrade_level_value level';
    levelSpan.textContent=String(getUp(item));
    controls.appendChild(levelSpan);

    controls.appendChild(makeUpgradeButton('downgrade','Riduci di 1 livello',item,-1));
    box.appendChild(controls);
  }

  box.appendChild(makeCompareCheck(item,box));

  box.addEventListener('mouseenter',e=>showPopup(item,e));
  box.addEventListener('mousemove',e=>{
    lastEvent=e;
    if($('#popup_window').style.display==='block') positionPopup(e);
  });
  box.addEventListener('mouseleave',hidePopup);
  wrap.appendChild(box);

  return wrap;
}
function matchesSetFilter(item){
  if(activeSetFilter==="set") return !!item.set;
  if(activeSetFilter==="noset") return !item.set;
  return true;
}
function updateSetFilterButtons(){
  document.querySelectorAll(".set-filter-btn").forEach(b=>{
    b.classList.toggle("active", activeSetFilter===b.dataset.setfilter);
  });
}
function filteredSorted(){
  const q=$('#search').value.trim().toLowerCase();
  const arr=DB.items.filter(item=>{
    if(!matchesSetFilter(item)) return false;
    if(!q) return true;
    return [item.name,item.item_id,item.base_id,item.set,item.set_name,item.short,item.event_meta?.event,item.event_meta?.year]
      .some(v=>String(v??'').toLowerCase().includes(q));
  });
  // Prima sempre gli oggetti selezionati per il confronto; dentro i due gruppi
  // resta attivo l'ordinamento scelto (singolo, doppio o combo).
  return sortItems(arr,{selectedFirst:true});
}
function render(){
  const arr=filteredSorted();
  $('#count').textContent=`${arr.length}/${DB.items.length}`;
  const root=$('#items');
  root.innerHTML='';
  if(!arr.length){
    root.innerHTML=`<div class="empty">${esc(DB.meta.empty_text||'Nessun oggetto trovato.')}</div>`;
    updateCompareBar();
    renderCompare();
    return;
  }
  const frag=document.createDocumentFragment();
  for(const item of arr) frag.appendChild(card(item));
  root.appendChild(frag);
  updateCompareBar();
  renderCompare();
}
populateSecondarySort();
updateSortModeState();
document.querySelectorAll(".set-filter-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    activeSetFilter=btn.dataset.setfilter;
    compareSelected.clear();
    compareOpen=false;
    updateSetFilterButtons();
    render();
  });
});
updateSetFilterButtons();
$('#search').addEventListener('input',render);
$('#sort').addEventListener('change',()=>{ updateSortModeState(); render(); });
$('#sort2').addEventListener('change',()=>{ updateSortModeState(); render(); });
$('#sort_mode').addEventListener('change',render);
$('#order').addEventListener('change',render);
$('#level').addEventListener('input',render);
$('#compare_btn').addEventListener('click',()=>{
  if(compareSelected.size<1) return;
  compareOpen=true;
  renderCompare();
  $('#compare_panel').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('#compare_clear').addEventListener('click',()=>{
  compareSelected.clear();
  compareOpen=false;
  render();
});
render();
})();
