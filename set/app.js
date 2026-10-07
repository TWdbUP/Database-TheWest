(() => {
'use strict';
const DB=window.TWDB_SET_DATA;
if(!DB) throw new Error('data.js SET non caricato');
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const PERCENT=new Set(['experience','dollar','luck','regen','drop','speed']);
const ATTRS=new Set(['strength','flexibility','dexterity','charisma']);
const SKILLS=new Set(['build','punch','tough','endurance','health','ride','reflex','dodge','hide','swim','aim','shot','pitfall','finger_dexterity','repair','leadership','tactic','trade','animal','appearance']);
const LABELS={strength:'Forza',flexibility:'Agilità',dexterity:'Destrezza',charisma:'Carisma',build:'Costruzione',punch:'Vigore',tough:'Robustezza',endurance:'Energia',health:'Punti vita',ride:'Cavalcata',reflex:'Riflessi',dodge:'Schivata',hide:'Nascosto',swim:'Nuoto',aim:'Mira',shot:'Sparare',pitfall:'Trappole',finger_dexterity:'Precisione',repair:'Riparazione',leadership:'Comando',tactic:'Tattica',trade:'Negoziazione',animal:'Rapporto con gli animali',appearance:'Aspetto',experience:'Esperienza',dollar:'Soldi',luck:'Fortuna',regen:'Rigenerazione',drop:'Trova prodotti',speed:'Velocità',pray:'Prega',damage:'Danni'};
const TYPE_LABEL={head:'Copricapo',neck:'Collana',body:'Abito',belt:'Cintura',pants:'Pantaloni',foot:'Scarpe',left_arm:'Fucile',right_arm:'Arma',animal:'Animale',yield:'Prodotto / sella'};
let selectedKey='';
let filtered=[];
let active=new Set();
let selectedByType=new Map();
const upgrades=new Map();
let popupItemId=null;
let popupLastEvent=null;

function fmt(v,max=3){const n=Number(v);if(!Number.isFinite(n))return '—';if(Math.abs(n-Math.round(n))<1e-10)return String(Math.round(n));return n.toFixed(max).replace(/0+$/,'').replace(/\.$/,'').replace('.',',')}
function roundNative(x,m){switch(m){case'round':return Math.round(x);case'ceil':return Math.ceil(x);case'floatceil':return Math.ceil(100*x)/100;case'floor':return Math.floor(x);default:return x}}
function calcItemLevelBonus(level,value){level=Number(level)||0;value=Number(value)||0;if(!level||!value)return 0;if(value<1)return Math.round(Math.max(1,value*1000*level))/10000;return Math.round(Math.max(1,value*level/10))}
function characterLevel(){const n=Number($('#level').value);return Number.isFinite(n)&&n>0?Math.floor(n):0}
function upgradeDirectObject(obj,up){const out=clone(obj||{});function walk(node){if(!node||Array.isArray(node)||typeof node!=='object')return;for(const k of Object.keys(node)){const v=node[k];if(Array.isArray(v))continue;if(v&&typeof v==='object')walk(v);else if(typeof v==='number')node[k]=v+calcItemLevelBonus(up,v)}}if(up)walk(out);return out}
function itemBonusValue(bonus,up,modifier=null,roundingMethod=null){if(!bonus||typeof bonus.value!=='number')return null;let value=modifier?modifier(bonus.value):bonus.value;if(up&&bonus.type!=='speed')value+=calcItemLevelBonus(up,value);else if(up&&bonus.type==='speed')value+=Math.round((value*up/10)*100)/100;if(roundingMethod)value=roundNative(value,roundingMethod);return value}
function characterEntryValue(entry,up,level){if(!entry||entry.type!=='character'||!entry.bonus)return null;if(entry.key==='level'){if(!level)return null;if(entry.bonus.type==='damage'&&typeof entry.bonus.value==='number'){const raw=entry.bonus.value*level;return Math.round(raw)+calcItemLevelBonus(up,raw)}const method=entry.roundingMethod;return itemBonusValue(entry.bonus,up,val=>roundNative(val*level,method),method)}return itemBonusValue(entry.bonus,up)}
function upgradedTravelSpeed(speed,up){if(!speed||speed===1)return speed;if(!up)return speed;let s=(1/speed)-1;s=Math.round(s*10000);s+=calcItemLevelBonus(up,s);s/=10000;return 1/(s+1)}
function travelSpeedPercent(item,up){const s=upgradedTravelSpeed(item.speed,up);if(!s)return 0;return Math.round((1/s)*100-100)}

function metricId(inner){
  if(!inner)return 'misc';
  if(inner.type==='attribute'||inner.type==='skill')return `${inner.type}:${inner.name}`;
  if(inner.type==='job')return `job:${inner.job??'all'}`;
  if(inner.type==='fortbattle')return `fort:${inner.isSector?'sector':'battle'}:${inner.name}`;
  return `type:${inner.type}${inner.name?':'+inner.name:''}`;
}
function metricLabel(inner,desc=''){
  if(inner.type==='attribute'||inner.type==='skill')return LABELS[inner.name]||inner.name;
  if(inner.type==='job'){
    const m=String(desc||'').match(/Punt[oi] lavoro(?: verso)?\s*(.*)$/i);
    return inner.job==='all'||inner.job==null?'Punti lavoro':(m&&m[1]?`Lavoro: ${m[1]}`:`Punti lavoro #${inner.job}`);
  }
  if(inner.type==='fortbattle'){
    const a={defense:'Difesa',offense:'Attacco',resistance:'Resistenza',damage:'Danni'}[inner.name]||inner.name;
    return `${inner.isSector?'Settore':'Forte'} — ${a}`;
  }
  return LABELS[inner.type]||inner.type;
}
function addMetric(map,inner,value,desc='',source='item'){
  if(value==null||!Number.isFinite(Number(value))||Math.abs(Number(value))<1e-12)return;
  const id=metricId(inner); const old=map.get(id);
  if(old) old.value+=Number(value); else map.set(id,{id,inner:clone(inner),label:metricLabel(inner,desc),value:Number(value),source});
}
function itemMetrics(item,up,level){
  const out=new Map(); const b=upgradeDirectObject(item.bonus||{},up);
  for(const [k,v] of Object.entries(b.attributes||{}))addMetric(out,{type:'attribute',name:k},v,'','item');
  for(const [k,v] of Object.entries(b.skills||{}))addMetric(out,{type:'skill',name:k},v,'','item');
  const fb=b.fortbattle||{}; for(const k of ['defense','offense','resistance'])if(fb[k])addMetric(out,{type:'fortbattle',name:k,isSector:false},fb[k],'','item');
  const fs=b.fortbattlesector||{}; for(const k of ['defense','offense','damage'])if(fs[k])addMetric(out,{type:'fortbattle',name:k,isSector:true},fs[k],'','item');
  const tsp=travelSpeedPercent(item,up); if(tsp)addMetric(out,{type:'speed'},tsp/100,'','item');
  for(const e of (item.bonus?.item||[])){
    let inner=e,value=null;
    if(e.type==='character'){inner=e.bonus||{};value=characterEntryValue(e,up,level)}else value=itemBonusValue(e,up);
    if(value!=null)addMetric(out,inner,value,e.desc||'','item');
  }
  return out;
}

function rawMergeKey(e){const inner=e.type==='character'?(e.bonus||{}):e;return [e.type==='character'?'character':'direct',e.key||'',inner.type||'',inner.name||'',inner.job??'',inner.isSector?'1':'0',e.roundingMethod||''].join('|')}
function mergedSetEntries(set,count){
  const groups=new Map();
  const thresholds=Object.keys(set.bonus||{}).map(Number).filter(n=>n<=count).sort((a,b)=>a-b);
  for(const n of thresholds){for(const e of (set.bonus[String(n)]||[])){
    const key=rawMergeKey(e); const v=e.type==='character'?e.bonus?.value:e.value; if(typeof v!=='number')continue;
    if(!groups.has(key))groups.set(key,clone(e)); else {const g=groups.get(key);if(g.type==='character')g.bonus.value+=v;else g.value+=v;}
  }}
  return [...groups.values()];
}
function setEntryValue(e,level){
  if(e.type==='character'){
    if(!e.bonus||typeof e.bonus.value!=='number')return null;
    if(e.key==='level'){
      if(!level)return null;
      const raw=e.bonus.value*level;
      if(e.bonus.type==='damage')return Math.round(raw);
      return roundNative(raw,e.roundingMethod);
    }
    return e.bonus.value;
  }
  return typeof e.value==='number'?e.value:null;
}
function setMetrics(set,count,level){const out=new Map();for(const e of mergedSetEntries(set,count)){const inner=e.type==='character'?(e.bonus||{}):e;const value=setEntryValue(e,level);if(value!=null)addMetric(out,inner,value,e.desc||'','set')}return out}
function thresholdMetrics(set,n,level){const out=[];for(const e of mergedSetEntries(set,n)){const inner=e.type==='character'?(e.bonus||{}):e;const value=setEntryValue(e,level);out.push({inner,label:metricLabel(inner,e.desc||''),value,desc:e.desc||''})}return out}
function shownValue(inner,value){if(PERCENT.has(inner.type))return `${Math.round(Number(value)*100)}%`;return fmt(value,2)}
function metricSort(a,b){
 const order=['attribute','skill','experience','dollar','luck','regen','drop','speed','job','fortbattle','pray','damage'];
 const ai=order.indexOf(a.inner.type),bi=order.indexOf(b.inner.type);if(ai!==bi)return (ai<0?99:ai)-(bi<0?99:bi);return a.label.localeCompare(b.label,'it');
}
function currentSet(){return DB.sets.find(s=>s.key===selectedKey)||null}
function itemOf(id){return DB.items[String(id)]}
const SLOT_ORDER=['neck','head','right_arm','body','left_arm','animal','pants','belt','yield','foot'];
const APPAREL=new Set(['head','neck','body','belt','pants','foot']);
function slotGroups(set){
  const m=new Map();
  for(const id0 of (set?.items||[])){
    const id=Number(id0),it=itemOf(id); if(!it)continue;
    if(!m.has(it.type))m.set(it.type,[]);
    m.get(it.type).push(id);
  }
  return m;
}
function selectedIdForType(set,type){
  const ids=slotGroups(set).get(type)||[];
  const saved=Number(selectedByType.get(type));
  return ids.includes(saved)?saved:(ids[0]||null);
}
function selectedItems(set){
  const out=[];
  for(const [type] of slotGroups(set)){
    const id=selectedIdForType(set,type);
    if(id!=null&&active.has(id)){
      const it=itemOf(id); if(it)out.push(it);
    }
  }
  return out;
}
function wornCount(set){return selectedItems(set).length}
function slotCount(set){return slotGroups(set).size}

function initActive(set){
  active=new Set(); selectedByType=new Map(); upgrades.clear();
  for(const [type,ids] of slotGroups(set)){
    const id=ids[0]; if(id==null)continue;
    selectedByType.set(type,id); active.add(id);
  }
}
function renderList(){
  const q=$('#search').value.trim().toLocaleLowerCase('it');
  filtered=DB.sets.filter(s=>!q||s.name.toLocaleLowerCase('it').includes(q)||s.key.toLowerCase().includes(q));
  $('#resultCount').textContent=`${filtered.length} / ${DB.sets.length} set`;
  $('#count').textContent=`${DB.sets.length} set · ${DB.meta.unique_item_count} oggetti collegati`;
  $('#setList').innerHTML=filtered.map(s=>{
    const slots=slotCount(s),alts=Math.max(0,s.items.length-slots);
    return `<button class="set-row${s.key===selectedKey?' active':''}" data-key="${esc(s.key)}"><b>${esc(s.name)}</b><small>${slots} pezzi${alts?` · ${alts} alternative`:''} · bonus ${s.bonusThresholds.length?s.bonusThresholds.join('/'): '—'} pz</small></button>`;
  }).join('');
  for(const b of document.querySelectorAll('.set-row'))b.addEventListener('click',()=>selectSet(b.dataset.key));
}
function selectSet(key){selectedKey=key;const s=currentSet();if(!s)return;initActive(s);renderList();renderDetail();}
function toggleSlot(type){
  const set=currentSet();if(!set)return;
  const id=selectedIdForType(set,type);if(id==null)return;
  if(active.has(id))active.delete(id);else active.add(id);
  renderDetail();
}
function cycleVariant(type){
  const set=currentSet();if(!set)return;
  const ids=slotGroups(set).get(type)||[];if(ids.length<2)return;
  const cur=selectedIdForType(set,type);const idx=Math.max(0,ids.indexOf(cur));const next=ids[(idx+1)%ids.length];
  const wasActive=active.has(cur);
  active.delete(cur);selectedByType.set(type,next);if(wasActive)active.add(next);
  renderDetail();
}
function changeUp(id,delta){
  const it=itemOf(Number(id));if(!it||!it.upgradeable)return;
  const cur=Math.max(0,Math.min(5,Number(upgrades.get(it.base_id)||0)));
  const next=Math.max(0,Math.min(5,cur+Number(delta||0)));
  if(next)upgrades.set(it.base_id,next);else upgrades.delete(it.base_id);
  renderDetail();
}
function totalMetrics(set){
  const level=characterLevel(); const out=new Map();
  for(const it of selectedItems(set)){
    const up=Math.max(0,Math.min(5,Number(upgrades.get(it.base_id)||0)));
    for(const m of itemMetrics(it,up,level).values())addMetric(out,m.inner,m.value,m.label,'item');
  }
  for(const m of setMetrics(set,wornCount(set),level).values())addMetric(out,m.inner,m.value,m.label,'set');
  return [...out.values()].sort(metricSort);
}
function upgradeOverlay(it,id){
  if(!it?.upgradeable)return'';
  const up=Math.max(0,Math.min(5,Number(upgrades.get(it.base_id)||0)));
  return `<span class="upgrade_controls" data-lvl="${up}">
    <span class="item_level"><span class="icon_level"></span></span>
    <button class="upgrade upgrade-step" type="button" data-up-id="${id}" data-up-delta="1" title="Migliora di 1 livello" aria-label="Migliora ${esc(it.name)} di 1 livello"></button>
    <span class="upgrade_level_value level">${up}</span>
    <button class="downgrade upgrade-step" type="button" data-up-id="${id}" data-up-delta="-1" title="Riduci di 1 livello" aria-label="Riduci ${esc(it.name)} di 1 livello"></button>
  </span>`;
}
function renderSlot(set,type,{placeholder=true}={}){
  const ids=slotGroups(set).get(type)||[];
  if(!ids.length){
    if(!placeholder)return'';
    return `<div class="equip-slot empty-slot slot-${type}" title="${esc(TYPE_LABEL[type]||type)}" aria-label="${esc(TYPE_LABEL[type]||type)} vuoto"></div>`;
  }
  const id=selectedIdForType(set,type),it=itemOf(id);if(!it)return'';
  const on=active.has(id),names=ids.map(x=>itemOf(x)?.name).filter(Boolean);
  const title=`${it.name}${ids.length>1?` · ${ids.length} alternative`:''}`;
  return `<article class="equip-slot item-slot slot-${type}${on?'':' inactive'}" title="${esc(title)}">
    <div class="game-item-box" data-item-id="${id}">
      <img class="slot-item-img" src="${esc(it.image||'')}" alt="${esc(it.name)}">
      ${upgradeOverlay(it,id)}
      ${ids.length>1?`<button class="variant-btn" type="button" data-cycle="${esc(type)}" title="Cambia oggetto: ${esc(names.join(' / '))}" aria-label="Cambia ${esc(TYPE_LABEL[type]||type)}">↻</button>`:''}
      <button class="slot-active-btn${on?'':' off'}" type="button" data-toggle-type="${esc(type)}" title="${on?'Escludi dal totale':'Riattiva nel totale'}" aria-label="${on?'Escludi':'Riattiva'} ${esc(it.name)}">${on?'✓':'×'}</button>
    </div>
  </article>`;
}
function popupEntryHtml(entry,up,level){
  if(!entry)return'';
  let inner=entry,value=null;
  if(entry.type==='character'){
    inner=entry.bonus||{};
    value=characterEntryValue(entry,up,level);
  }else{
    value=itemBonusValue(entry,up);
  }
  if(value==null && entry.type==='character' && !level)return `<p class="popup_bonus">${esc(entry.desc||'Bonus per livello')}</p>`;
  const label=metricLabel(inner,entry.desc||'');
  const shown=PERCENT.has(inner.type)?`${Math.round(Number(value)*100)}%`:fmt(value,2);
  return `<p class="popup_bonus">+ ${shown} ${esc(label)}</p>`;
}
function popupHtml(it){
  if(!it)return'';
  const level=characterLevel();
  const up=Math.max(0,Math.min(5,Number(upgrades.get(it.base_id)||0)));
  const b=upgradeDirectObject(it.bonus||{},up);
  let h=`<div class="popup_image">${up?`<div class="item_level_popup"><span class="popup_icon_level"></span><span class="popup_level_value">${up}</span></div>`:''}<img src="${esc(it.image||'')}" alt=""></div>`;
  h+=`<div class="popup_divider"></div><p class="popup_name">${esc(it.name)}</p><p class="popup_type">${esc(TYPE_LABEL[it.type]||it.type)}</p>`;
  for(const [k,v] of Object.entries(b.attributes||{}))if(v)h+=`<p class="bonus_attr">+ ${fmt(v,2)} ${esc(LABELS[k]||k)}</p>`;
  for(const [k,v] of Object.entries(b.skills||{}))if(v)h+=`<p class="bonus_skill">+ ${fmt(v,2)} ${esc(LABELS[k]||k)}</p>`;
  for(const e of (it.bonus?.item||[]))h+=popupEntryHtml(e,up,level);
  const tsp=travelSpeedPercent(it,up);if(tsp)h+=`<p class="popup_bonus">+ ${fmt(tsp,2)}% Velocità</p>`;
  const fb=b.fortbattle||{};for(const k of ['defense','offense','resistance'])if(fb[k])h+=`<p class="bonus_fort">+ ${fmt(fb[k],2)} ${esc({defense:'Difesa',offense:'Attacco',resistance:'Resistenza'}[k])} (Bonus battaglia per il forte)</p>`;
  const fs=b.fortbattlesector||{};for(const k of ['defense','offense','damage'])if(fs[k])h+=`<p class="bonus_fort">+ ${fmt(fs[k],2)} ${esc({defense:'Difesa',offense:'Attacco',damage:'Danni'}[k])} (Bonus settore battaglia per il forte)</p>`;
  const set=currentSet();if(set)h+=`<p class="popup_set">${esc(set.name)}</p>`;
  h+=`<div class="popup_meta">Livello oggetto <b>${fmt(it.level||0)}</b> · ${it.upgradeable?'Migliorabile':'Non migliorabile'}</div>`;
  h+=`<div class="popup_meta popup_id">[item=<b>${Number(it.base_id)*1000}${up?` → ${Number(it.base_id)*1000+up}`:''}</b>]</div>`;
  return h;
}
function positionPopup(ev){
  const p=$('#popup_window');if(!p||!ev)return;
  p.style.display='block';
  const r=p.getBoundingClientRect(),w=innerWidth,h=innerHeight;
  let left=ev.pageX+18,top=ev.pageY+16;
  if(ev.clientX+r.width+25>w)left=ev.pageX-r.width-18;
  if(ev.clientY+r.height+25>h)top=ev.pageY-r.height-18;
  p.style.left=Math.max(4,left)+'px';p.style.top=Math.max(4,top)+'px';
}
function showPopup(it,ev){
  const p=$('#popup_window'),c=$('#popup_contents');if(!p||!c||!it)return;
  popupItemId=Number(it.base_id);popupLastEvent=ev;c.innerHTML=popupHtml(it);p.setAttribute('aria-hidden','false');positionPopup(ev);
}
function hidePopup(){const p=$('#popup_window');if(!p)return;p.style.display='none';p.setAttribute('aria-hidden','true');popupItemId=null;popupLastEvent=null;}
function bindItemPopups(){
  for(const box of document.querySelectorAll('.game-item-box[data-item-id]')){
    const it=itemOf(Number(box.dataset.itemId));if(!it)continue;
    box.addEventListener('mouseenter',ev=>showPopup(it,ev));
    box.addEventListener('mousemove',ev=>{popupLastEvent=ev;positionPopup(ev)});
    box.addEventListener('mouseleave',hidePopup);
  }
}

function renderEquipment(set){
  const groups=slotGroups(set),types=[...groups.keys()];
  const compact=types.length<=2 && !types.some(t=>APPAREL.has(t));
  if(compact){
    const ordered=SLOT_ORDER.filter(t=>groups.has(t)).concat(types.filter(t=>!SLOT_ORDER.includes(t)));
    return `<div class="compact-equipment">${ordered.map(t=>renderSlot(set,t,{placeholder:false})).join('')}</div>`;
  }
  return `<div class="equipment-board">
    ${SLOT_ORDER.map(t=>renderSlot(set,t,{placeholder:true})).join('')}
  </div>`;
}

function renderWelcome(){
  hidePopup();
  const latestKeys=[
    'oktoberfest_2026_set_1',   // Set abiti di Maximilian
    'oktoberfest_2026_set_10',  // Set abiti di Hofer
    'oktoberfest_2026_set_4',   // Set abiti di Sedlmayr
    'oktoberfest_2026_set_7',   // Set abiti di Elisabetta di Baviera
    'oktoberfest_2026_set_13'   // Set armi dipinte a mano
  ];
  const featured=latestKeys.map(key=>DB.sets.find(s=>s.key===key)).filter(Boolean);
  const cards=featured.map(s=>{
    const imgs=(s.items||[]).slice(0,3).map(id=>itemOf(id)).filter(Boolean).map(it=>`<img src="${esc(it.image||'')}" alt="">`).join('');
    return `<button class="welcome-set-card" type="button" data-welcome-key="${esc(s.key)}"><span class="welcome-set-images">${imgs}</span><b>${esc(s.name)}</b><small>${slotCount(s)} pezzi · bonus ${s.bonusThresholds.join('/')} pz</small></button>`;
  }).join('');
  $('#detail').innerHTML=`
    <section class="welcome-panel">
      <div class="welcome-hero">
        <div class="welcome-kicker">SEZIONE SET</div>
        <h2>Scegli il set che vuoi consultare</h2>
        <p>Usa <b>Cerca set</b> oppure seleziona un nome nell'elenco a sinistra. La scheda mostrerà oggetti, alternative, UP, bonus set e totale calcolato.</p>
        <div class="welcome-stats"><span><b>${DB.sets.length}</b> set</span><span><b>${DB.meta.unique_item_count}</b> oggetti collegati</span></div>
      </div>
      <div class="welcome-legend">
        <span><b>↻</b> cambia variante</span><span><b>+/−</b> cambia UP</span><span><b>✓/×</b> include o esclude</span>
      </div>
      <h3 class="welcome-subtitle">Ultimi set inseriti</h3>
      <div class="welcome-set-grid">${cards}</div>
    </section>`;
  for(const b of document.querySelectorAll('[data-welcome-key]'))b.addEventListener('click',()=>selectSet(b.dataset.welcomeKey));
}
function renderDetail(){
  hidePopup();
  const set=currentSet();if(!set){renderWelcome();return}
  const level=characterLevel(),count=wornCount(set),thresholds=Object.keys(set.bonus||{}).map(Number).sort((a,b)=>a-b);
  const activeThreshold=Math.max(0,...thresholds.filter(n=>n<=count));
  const bonusRows=thresholds.length?thresholds.map(n=>{
    const vals=thresholdMetrics(set,n,level);
    return `<div class="bonus-row${n===activeThreshold?' active-threshold':''}${n<=count?' unlocked':''}"><div class="bonus-threshold">${n}Pz</div><div class="bonus-values">${vals.map(x=>`<span class="bonus-chip">${x.value==null?esc(x.desc||x.label):`+${shownValue(x.inner,x.value)} ${esc(x.label)}`}</span>`).join('')||'<span class="bonus-chip">Nessun bonus</span>'}</div></div>`;
  }).join(''):'<div class="total-empty">Questo set non ha soglie bonus.</div>';
  const totals=totalMetrics(set);
  $('#detail').innerHTML=`
    <div class="detail-head">
      <h2>${esc(set.name)}</h2>
      <div class="piece-counter">Pezzi attivi: ${count}${activeThreshold?` · bonus fino a ${activeThreshold}Pz`:''}</div>
    </div>
    <div class="box total-box"><h3>Totale</h3><div class="total-note">Bonus degli oggetti attivi + bonus set cumulativo. Cambiare alternativa o UP modifica il totale, non la tabella Bonus set.</div><div class="total-values">${totals.length?totals.map(m=>`<span class="total-chip">+${shownValue(m.inner,m.value)} ${esc(m.label)}</span>`).join(''):`<div class="total-empty">${level?'Nessun bonus numerico':'Inserisci il livello per calcolare i bonus “per livello”.'}</div>`}</div></div>
    <div class="detail-grid">
      <div class="box equipment-box"><h3>Oggetti del set</h3>${renderEquipment(set)}<div class="equipment-help">↻ cambia alternativa · +/− sull'oggetto cambia UP · ✓/× include o esclude dal totale</div></div>
      <div class="box"><h3>Bonus set</h3><div class="bonus-table">${bonusRows}</div></div>
    </div>`;
  for(const b of document.querySelectorAll('[data-toggle-type]'))b.addEventListener('click',ev=>{ev.stopPropagation();toggleSlot(b.dataset.toggleType)});
  for(const b of document.querySelectorAll('[data-cycle]'))b.addEventListener('click',ev=>{ev.stopPropagation();cycleVariant(b.dataset.cycle)});
  for(const b of document.querySelectorAll('.upgrade-step'))b.addEventListener('click',ev=>{ev.stopPropagation();changeUp(Number(b.dataset.upId),Number(b.dataset.upDelta))});
  bindItemPopups();
}

$('#search').addEventListener('input',renderList);
$('#level').addEventListener('input',renderDetail);
$('#resetUp').addEventListener('click',()=>{upgrades.clear();renderDetail()});
$('#goTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
$('#goBottom').addEventListener('click',()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'}));
function updateScrollButtons(){const y=window.scrollY,h=window.innerHeight,doc=document.documentElement.scrollHeight;$('#goTop').classList.toggle('show',y>250);$('#goBottom').classList.toggle('show',y+h<doc-250)}
window.addEventListener('scroll',updateScrollButtons,{passive:true});window.addEventListener('resize',updateScrollButtons);
renderList();
renderWelcome();
updateScrollButtons();
})();
