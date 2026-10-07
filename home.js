(() => {
  // Per aggiungere una nuova categoria in futuro basta inserire una riga qui.
  const categories = [
    { key:'copricapi', label:'Copricapi', href:'copricapi/', image:'assets/home_v2/copricapi.png' },
    { key:'collane', label:'Collane', href:'collane/', image:'assets/home_v2/collane.png' },
    { key:'abiti', label:'Abiti', href:'abiti/', image:'assets/home_v2/abiti.png' },
    { key:'cinture', label:'Cinture', href:'cinture/', image:'assets/home_v2/cinture.png' },
    { key:'pantaloni', label:'Pantaloni', href:'pantaloni/', image:'assets/home_v2/pantaloni.png' },
    { key:'scarpe', label:'Scarpe', href:'scarpe/', image:'assets/home_v2/scarpe.png' },
    { key:'armi_fuoco', label:'Armi fuoco', href:'armi_fuoco/', image:'assets/home_v2/armi_fuoco.png' },
    { key:'armi_contusione', label:'Armi contusione', href:'armi_contusione/', image:'assets/home_v2/armi_contusione.png' },
    { key:'fucili', label:'Fucili', href:'fucili/', image:'assets/home_v2/fucili.png' },
    { key:'animali', label:'Animali', href:'animali/', image:'assets/home_v2/animali.png' },
    { key:'prodotti', label:'Prodotti', href:'prodotti/', image:'assets/home_v2/prodotti.png' },
    { key:'set', label:'SET', href:'set/', image:'assets/home_v2/set.png' }
  ];

  function chunks(list){
    const rows=[];
    if(list.length){ rows.push(list.slice(0,6)); }
    for(let i=6;i<list.length;i+=3){ rows.push(list.slice(i,i+3)); }
    return rows;
  }

  const root=document.getElementById('menuRows');
  chunks(categories).forEach(rowItems => {
    const row=document.createElement('div');
    row.className='menu-row';
    row.dataset.count=String(rowItems.length === 6 ? 6 : 3);
    rowItems.forEach(item => {
      const a=document.createElement('a');
      a.className='category-card';
      a.dataset.key=item.key;
      a.href=item.href;
      a.title=item.label;
      a.setAttribute('aria-label',`Apri ${item.label}`);
      a.innerHTML=`<span class="category-art"><img src="${item.image}" alt="" loading="eager"></span><span class="category-label">${item.label}</span>`;
      row.appendChild(a);
    });
    root.appendChild(row);
  });
})();
