
(function(){
 const data=window.TAH_SEARCH_INDEX||[];
 const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const q=document.getElementById('q'),theme=document.getElementById('theme'),century=document.getElementById('century'),count=document.getElementById('result-count');
 const rows=[...document.querySelectorAll('[data-search-row]')];
 function run(){
  const query=norm(q?.value||''),th=theme?.value||'',ce=century?.value||'';let n=0;
  rows.forEach(row=>{const rec=data.find(x=>x.slug===row.dataset.slug);if(!rec)return;
   const hay=norm([rec.term,rec.sense,rec.theme,...rec.centuries,...rec.authors,...rec.works,...rec.variants,...rec.facets].join(' '));
   const ok=(!query||hay.includes(query))&&(!th||rec.theme===th)&&(!ce||rec.centuries.includes(ce));
   row.classList.toggle('hidden',!ok);if(ok)n++;
  });if(count)count.textContent=n+' '+(n===1?'término':'términos');
 }
 [q,theme,century].forEach(el=>el&&el.addEventListener(el.tagName==='INPUT'?'input':'change',run));
 const params=new URLSearchParams(location.search);if(q&&params.get('q'))q.value=params.get('q');run();
})();
