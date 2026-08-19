const state={terms:[],letter:'',query:'',author:'',century:'',theme:''};
const base=(document.body.dataset.base||'');
const collator=new Intl.Collator('es',{sensitivity:'base',numeric:true});

function norm(s){
  return (s||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase();
}

function firstLetter(s){
  const ch=(s||'').trim().charAt(0).toLocaleUpperCase('es');

  if(ch==='Ñ') return 'Ñ';

  return ch
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');
}

/*
  NORMALIZACIÓN EXCLUSIVA PARA EL FILTRO DE AUTORES.

  No modifica:
  - las Fichas Madre;
  - las citas;
  - authors_text;
  - las atribuciones históricas completas.

  Únicamente evita que una misma autoridad principal
  aparezca repetida en el selector por traductor,
  edición o variante nominal.
*/
const authorAliases=new Map([
  ['andrea palladio','Andrea Palladio'],

  ['iacome de vignola','Jacopo Barozzi da Vignola'],
  ['jacopo barozzi da vignola','Jacopo Barozzi da Vignola'],

  ['leon battista alberti','León Battista Alberti'],
  ['león battista alberti','León Battista Alberti'],

  ['sebastiano serlio','Sebastiano Serlio'],
  ['sebastián serlio','Sebastiano Serlio'],

  ['bails','Benito Bails'],
  ['benito bails','Benito Bails'],

  ['rejon de silva','Diego Antonio Rejón de Silva'],
  ['rejón de silva','Diego Antonio Rejón de Silva'],
  ['diego antonio rejon de silva','Diego Antonio Rejón de Silva'],
  ['diego antonio rejón de silva','Diego Antonio Rejón de Silva'],

  ['jose ortiz y sanz','Joseph Ortiz y Sanz'],
  ['josé ortiz y sanz','Joseph Ortiz y Sanz'],
  ['joseph ortiz y sanz','Joseph Ortiz y Sanz'],
  ['ortiz y sanz','Joseph Ortiz y Sanz']
]);

function canonicalAuthor(raw){
  /*
    Si la atribución es:
    "Andrea Palladio / Joseph Francisco Ortiz y Sanz"
    para el filtro se toma:
    "Andrea Palladio".

    La atribución completa permanece intacta en los datos
    y en la ficha individual.
  */
  const principal=(raw||'').split('/')[0].trim();

  return authorAliases.get(norm(principal))||principal;
}

function canonicalAuthors(term){
  return [
    ...new Set(
      (term.authors||[])
        .map(canonicalAuthor)
        .filter(Boolean)
    )
  ];
}

function fillSelect(id,vals,label){
  const el=document.getElementById(id);

  if(!el) return;

  el.innerHTML=
    `<option value="">${label}</option>`+
    [...vals]
      .sort((a,b)=>collator.compare(a,b))
      .map(v=>`<option>${v}</option>`)
      .join('');
}

function renderAlphabet(){
  const el=document.getElementById('alphabet');

  if(!el) return;

  const letters=[
    ...new Set(
      state.terms
        .map(t=>firstLetter(t.term))
        .filter(Boolean)
    )
  ].sort((a,b)=>collator.compare(a,b));

  const all=['Todas',...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'];

  el.innerHTML=all.map(l=>{
    const key=l==='Todas'?'':l;
    const disabled=l!=='Todas'&&!letters.includes(l);

    return `
      <button
        type="button"
        data-letter="${key}"
        ${disabled?'disabled':''}
        class="${state.letter===key?'active':''}"
      >${l}</button>
    `;
  }).join('');

  el.querySelectorAll('button:not([disabled])').forEach(b=>{
    b.addEventListener('click',()=>{
      state.letter=b.dataset.letter;
      renderAlphabet();
      renderTerms();
    });
  });
}

function renderTerms(){
  const out=document.getElementById('term-list');

  if(!out) return;

  const q=norm(state.query);

  const found=state.terms
    .filter(t=>{
      const searchable=norm([
        t.term,
        t.variants,
        t.authors_text,
        (t.works||[]).join(' '),
        t.search_text
      ].join(' '));

      return(
        (!state.letter||firstLetter(t.term)===state.letter)
        &&
        (!q||searchable.includes(q))
        &&
        (!state.author||canonicalAuthors(t).includes(state.author))
        &&
        (!state.century||(t.centuries||[]).includes(state.century))
        &&
        (!state.theme||(t.themes||[]).includes(state.theme))
      );
    })

    /*
      ORDEN ALFABÉTICO GLOBAL EN ESPAÑOL.
      Elimina el antiguo efecto:
      P-000 → P-001 → P-002 → ...
    */
    .sort((a,b)=>collator.compare(a.term,b.term));

  const counter=document.getElementById('result-count');

  if(counter){
    counter.textContent=
      `${found.length} término${found.length===1?'':'s'} `+
      `disponible${found.length===1?'':'s'}`;
  }

  out.innerHTML=found.length
    ?found.map(t=>`
      <article class="term-card">

        <div class="meta">
          Ficha ${String(t.num).padStart(2,'0')}
          · ${(t.centuries||[]).join(', ')}
        </div>

        <h3>${t.term}</h3>

        <p>${t.sense}</p>

        <p class="meta">
          ${(t.themes||[]).join(' · ')}
        </p>

        <a
          class="stretched"
          href="${base}${t.url}"
        >
          Consultar término
        </a>

      </article>
    `).join('')

    :`
      <div class="empty">
        No se encontraron términos con los criterios seleccionados.
      </div>
    `;
}

/*
  Sustituye automáticamente cifras fijas del tipo:
  "29 términos incorporados"

  por el número real leído desde data/terminos.json.
*/
function updateAccumulatedCount(){
  document.querySelectorAll('.stat').forEach(el=>{
    if(/términos incorporados/i.test(el.textContent||'')){
      el.textContent=
        `${state.terms.length} términos incorporados`;
    }
  });
}

async function init(){
  const dataUrl=
    document.body.dataset.data||
    `${base}data/terminos.json`;

  state.terms=await fetch(dataUrl).then(r=>{
    if(!r.ok){
      throw new Error(
        `No se pudo cargar ${dataUrl}: ${r.status}`
      );
    }

    return r.json();
  });

  /*
    AUTORES:
    ya no usa literalmente todas las cadenas originales
    como opciones independientes.
  */
  fillSelect(
    'author',
    [
      ...new Set(
        state.terms.flatMap(t=>canonicalAuthors(t))
      )
    ],
    'Todos los autores'
  );

  fillSelect(
    'century',
    [
      ...new Set(
        state.terms.flatMap(t=>t.centuries||[])
      )
    ],
    'Todos los siglos'
  );

  fillSelect(
    'theme',
    [
      ...new Set(
        state.terms.flatMap(t=>t.themes||[])
      )
    ],
    'Todos los temas'
  );

  [
    ['search','query'],
    ['author','author'],
    ['century','century'],
    ['theme','theme']
  ].forEach(([id,k])=>{

    const e=document.getElementById(id);

    if(e){
      e.addEventListener(
        id==='search'?'input':'change',
        ()=>{
          state[k]=e.value;
          renderTerms();
        }
      );
    }
  });

  updateAccumulatedCount();
  renderAlphabet();
  renderTerms();
}

document.addEventListener(
  'DOMContentLoaded',
  init
);