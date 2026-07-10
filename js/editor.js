// ════════════════════════════════════════════════════════════
// editor.js — proposition, écriture, éditeur de blocs
// ════════════════════════════════════════════════════════════

// ═══════════════ PROPOSITION D'ARTICLE ═══════════════
async function submitRequest(){
  const first=document.getElementById('r-first').value.trim();
  const last =document.getElementById('r-last').value.trim();
  const email=document.getElementById('r-email').value.trim().toLowerCase();
  const job  =document.getElementById('r-job').value.trim();
  const cat  =document.getElementById('r-cat').value;
  const subj =document.getElementById('r-subject').value.trim();
  const why  =document.getElementById('r-why').value.trim();
  if(!first||!last||!email||!cat||!subj){ showToast('Remplissez les champs obligatoires (*).'); return; }
  const btn=document.querySelector('.reg-submit');
  if(btn){ btn.disabled=true; btn.textContent='Envoi…'; }
  const id=`${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const proposal={first,last,email,job,cat,subj,why,ts:Date.now(),status:'pending'};
  await dbSet(`proposals/${id}`, proposal);
  await emailNotifyOwnerOfProposal(proposal);
  document.getElementById('reg-email-shown').textContent=email;
  document.getElementById('reg-success').style.display='block';
  ['r-first','r-last','r-email','r-job','r-cat','r-subject','r-why'].forEach(fid=>{
    const el=document.getElementById(fid); if(el) el.value='';
  });
  if(btn){ btn.disabled=false; btn.textContent='Envoyer ma proposition →'; }
}

// ═══════════════ GATE (connexion + code d'accès) ═══════════════
let _writeUnlocked=false;
let editorBlocks=[];
let _coverData='';

function renderWritePage(){
  document.getElementById('write-login-gate').style.display='none';
  document.getElementById('code-gate').style.display='none';
  document.getElementById('write-form').style.display='none';

  if(!currentUser){
    document.getElementById('write-login-gate').style.display='block';
    return;
  }
  if(!_writeUnlocked){
    document.getElementById('code-gate').style.display='block';
    document.getElementById('gate-err').style.display='none';
    document.getElementById('access-code').value='';
    return;
  }
  document.getElementById('write-form').style.display='block';
  if(editorBlocks.length===0){
    document.getElementById('f-author').value = `${currentUser.first} ${currentUser.last}`;
    editorBlocks=[{type:'paragraph',html:''}];
    renderBlocks();
  }
}

async function checkCode(){
  const input=document.getElementById('access-code');
  const val=input.value.trim();
  const errEl=document.getElementById('gate-err');
  errEl.style.display='none';
  if(!val){ errEl.textContent='Entrez un code.'; errEl.style.display='block'; return; }

  if(VALID_CODES.includes(val)){ _writeUnlocked=true; renderWritePage(); return; }

  const codes=await dbGet(ONE_TIME_CODES_PATH);
  let key=null, entry=null;
  if(codes){
    for(const [k,v] of Object.entries(codes)){ if(v.code===val){ key=k; entry=v; break; } }
  }
  if(!entry || (entry.used||0)>=(entry.max||2)){
    errEl.textContent='Code incorrect ou épuisé.'; errEl.style.display='block'; return;
  }
  await dbSet(`${ONE_TIME_CODES_PATH}/${key}`, {...entry, used:(entry.used||0)+1});
  _writeUnlocked=true;
  renderWritePage();
}

// ═══════════════ ÉDITEUR DE BLOCS ═══════════════
function blockHtml(b,i){
  let inner='';
  switch(b.type){
    case 'paragraph':
      inner=`<div class="block-content"><div class="block-para" contenteditable="true" data-placeholder="Écrivez un paragraphe…" oninput="updateBlockText(${i},this)" onmouseup="showFmtToolbar()" onkeyup="showFmtToolbar()">${b.html||''}</div></div>`; break;
    case 'h2':
      inner=`<div class="block-content"><div class="block-h2" contenteditable="true" data-placeholder="Sous-titre H2…" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'h3':
      inner=`<div class="block-content"><div class="block-h3" contenteditable="true" data-placeholder="Sous-titre H3…" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'quote':
      inner=`<div class="block-content"><div class="block-quote" contenteditable="true" data-placeholder="Citation…" oninput="updateBlockText(${i},this)" onmouseup="showFmtToolbar()" onkeyup="showFmtToolbar()">${b.html||''}</div></div>`; break;
    case 'infobox':
      inner=`<div class="block-content"><span class="block-infobox-label">Encadré d'information</span><div class="block-infobox" contenteditable="true" data-placeholder="Texte de l'encadré…" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'sources':
      inner=`<div class="block-content"><span class="block-sources-label">Sources</span><textarea class="block-sources" placeholder="Une source par ligne…" oninput="updateBlockValue(${i},this)">${b.text||''}</textarea></div>`; break;
    case 'credits':
      inner=`<div class="block-content"><span class="block-credits-label">Crédits</span><textarea class="block-credits" placeholder="Rédigé par…, sources…" oninput="updateBlockValue(${i},this)">${b.text||''}</textarea></div>`; break;
    case 'separator':
      inner=`<div class="block-content"><div class="block-sep">···</div></div>`; break;
    case 'image':
      inner=`<div class="block-content"><div class="block-img-wrap"><img src="${b.src}" alt=""><input type="text" class="block-img-caption" placeholder="Légende (optionnel)" value="${(b.caption||'').replace(/"/g,'&quot;')}" oninput="updateBlockValue(${i},this)"></div></div>`; break;
  }
  return `<div class="block-wrap">${inner}<button type="button" class="block-del" title="Supprimer" onclick="deleteBlock(${i})">✕</button></div>`;
}
function renderBlocks(){
  document.getElementById('article-blocks').innerHTML = editorBlocks.map((b,i)=>blockHtml(b,i)).join('');
  updateWordCount();
}
function updateBlockText(i,el){ editorBlocks[i].html = el.innerHTML; updateWordCount(); }
function updateBlockValue(i,el){
  if(editorBlocks[i].type==='image') editorBlocks[i].caption = el.value;
  else editorBlocks[i].text = el.value;
}
function deleteBlock(i){
  editorBlocks.splice(i,1);
  if(!editorBlocks.length) editorBlocks=[{type:'paragraph',html:''}];
  renderBlocks();
}
function insertBlock(type){
  editorBlocks.push({type, html:'', text:''});
  renderBlocks();
  setTimeout(()=>{
    const editable=document.querySelectorAll('#article-blocks .block-content [contenteditable], #article-blocks .block-content textarea');
    const last=editable[editable.length-1]; if(last) last.focus();
  },30);
}
function triggerInlineImg(){ document.getElementById('inline-img-input').click(); }
function handleInlineImage(e){
  const file=e.target.files[0]; if(!file)return;
  if(file.size>2*1024*1024){ showToast('Image trop lourde (max 2Mo)'); return; }
  const r=new FileReader();
  r.onload=ev=>{ editorBlocks.push({type:'image', src:ev.target.result, caption:''}); renderBlocks(); };
  r.readAsDataURL(file);
  e.target.value='';
}
function applyFormat(cmd){ document.execCommand(cmd,false,null); }
function showFmtToolbar(){
  const sel=window.getSelection();
  const toolbar=document.getElementById('fmt-toolbar');
  if(!sel || sel.isCollapsed || !sel.toString().trim()){ toolbar.classList.remove('show'); return; }
  const rect=sel.getRangeAt(0).getBoundingClientRect();
  toolbar.style.left = Math.max(8, rect.left + rect.width/2 - 30)+'px';
  toolbar.style.top = Math.max(8, rect.top - 38)+'px';
  toolbar.classList.add('show');
}
document.addEventListener('mousedown', e=>{
  if(!e.target.closest('.fmt-toolbar') && !e.target.closest('[contenteditable]')){
    const tb=document.getElementById('fmt-toolbar'); if(tb) tb.classList.remove('show');
  }
});

function stripHtml(html){ const d=document.createElement('div'); d.innerHTML=html||''; return d.textContent||''; }
function updateWordCount(){
  const words = editorBlocks.filter(b=>['paragraph','quote','infobox','h2','h3'].includes(b.type))
    .map(b=>stripHtml(b.html)).join(' ').trim().split(/\s+/).filter(Boolean).length;
  const el=document.getElementById('bc'); if(el) el.textContent = `${words} mot${words>1?'s':''}`;
}
function updateCount(inputId,countId,max){
  const val=document.getElementById(inputId).value;
  document.getElementById(countId).textContent = `${val.length} / ${max}`;
}

// ═══════════════ IMAGE DE COUVERTURE ═══════════════
function showCoverPreview(src){
  document.getElementById('cover-placeholder').style.display='none';
  const img=document.getElementById('cover-preview'); img.src=src; img.style.display='block';
}
function hideCoverPreview(){
  document.getElementById('cover-placeholder').style.display='flex';
  document.getElementById('cover-preview').style.display='none';
}
function handleCoverUpload(e){
  const file=e.target.files[0]; if(!file)return;
  if(file.size>2*1024*1024){ showToast('Image trop lourde (max 2Mo)'); return; }
  const r=new FileReader();
  r.onload=ev=>{ _coverData=ev.target.result; showCoverPreview(_coverData); document.getElementById('f-img').value=''; };
  r.readAsDataURL(file);
  e.target.value='';
}
function handleCoverUrl(url){
  url=url.trim();
  if(!url){ _coverData=''; hideCoverPreview(); return; }
  _coverData=url; showCoverPreview(url);
}

// ═══════════════ PUBLICATION ═══════════════
function blockToHtml(b){
  switch(b.type){
    case 'paragraph': return `<p>${b.html||''}</p>`;
    case 'h2': return `<h2>${b.html||''}</h2>`;
    case 'h3': return `<h3>${b.html||''}</h3>`;
    case 'quote': return `<blockquote>${b.html||''}</blockquote>`;
    case 'separator': return `<div class="art-sep">⁂</div>`;
    case 'infobox': return `<div class="art-info-box"><div class="art-info-box-title">Info</div><div class="art-info-box-body">${b.html||''}</div></div>`;
    case 'sources': return `<div class="art-sources-box"><div class="art-sources-title">Sources</div><div class="art-sources-body">${(b.text||'').replace(/\n/g,'<br>')}</div></div>`;
    case 'credits': return `<div class="art-credits-box"><div class="art-credits-title">Crédits</div><div class="art-credits-body">${(b.text||'').replace(/\n/g,'<br>')}</div></div>`;
    case 'image': return `<div class="art-inline-img"><img src="${b.src}" alt="">${b.caption?`<div class="art-inline-caption">${b.caption}</div>`:''}</div>`;
    default: return '';
  }
}
async function publishArticle(){
  const title =document.getElementById('f-title').value.trim();
  const deck  =document.getElementById('f-deck').value.trim();
  const cat   =document.getElementById('f-cat').value;
  const author=document.getElementById('f-author').value.trim();
  if(!title||!deck||!cat||!author){ showToast('Remplissez tous les champs obligatoires.'); return; }
  const bodyText = editorBlocks.filter(b=>['paragraph','quote','infobox','h2','h3'].includes(b.type))
    .map(b=>stripHtml(b.html)).join('\n\n').trim();
  if(!bodyText){ showToast("Ajoutez du contenu à l'article."); return; }
  const bodyHtml = editorBlocks.map(blockToHtml).join('\n');
  const id = articles.length ? Math.max(...articles.map(a=>a.id))+1 : 1;
  const a = { id, title, deck, cat, author, img:_coverData||'', body:bodyText, bodyHtml, date:today(), reads:0 };
  const btn=document.getElementById('btn-publish'); btn.disabled=true;
  articles.push(a);
  await saveArticle(a);
  lastPublishedId=id;
  document.getElementById('success-msg').style.display='block';
}
function goToNewArticle(){
  if(!lastPublishedId)return;
  editorBlocks=[]; _coverData='';
  document.getElementById('success-msg').style.display='none';
  document.getElementById('btn-publish').disabled=false;
  openArticle(lastPublishedId);
}
