// ════════════════════════════════════════════════════════════
// editor.js — proposition, écriture, éditeur de blocs
// ════════════════════════════════════════════════════════════

// ═══════════════ PROPOSITION D'ARTICLE ═══════════════
let proposalSubmitting=false;
function initProposalContact(){
  if(!currentUser)return;
  const first=document.getElementById('r-first');
  const last=document.getElementById('r-last');
  if(first && !first.value)first.value=currentUser.first||'';
  if(last && !last.value)last.value=currentUser.last||'';
}

async function submitRequest(){
  if(proposalSubmitting)return;
  if(!currentUser){
    showToast(t('toast_login_required'));
    openModal('login');
    return;
  }
  const { user: authUser, error: authError } = await ensureValidAuthSession();
  if(authError || !authUser?.id){
    renderNav();
    showPage('home');
    showToast(authError?.message || t('toast_login_required'));
    return;
  }
  const first=document.getElementById('r-first').value.trim();
  const last =document.getElementById('r-last').value.trim();
  const email=document.getElementById('r-email').value.trim().toLowerCase();
  const job  =document.getElementById('r-job').value.trim();
  const cat  =document.getElementById('r-cat').value;
  const subj =document.getElementById('r-subject').value.trim();
  const why  =document.getElementById('r-why').value.trim();
  if(!first||!last||!email||!cat||!subj){ showToast(t('toast_required_fields_proposal')); return; }
  proposalSubmitting=true;
  const btn=document.querySelector('.reg-submit');
  if(btn){ btn.disabled=true; btn.textContent='Envoi…'; }
  const id=`${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const proposal={first,last,email,job,cat,subj,why,lang:_lang,ts:Date.now(),status:'pending'};
  const saveError=await dbSet(`proposals/${id}`, proposal);
  if(saveError){
    showToast(`${t('toast_submit_error')} ${saveError.message||t('toast_save_error')}`,6000);
      proposalSubmitting=false;
    if(btn){ btn.disabled=false; btn.textContent=t('propose_submit'); }
    return;
  }
  await emailNotifyOwnerOfProposal(proposal);
  document.getElementById('reg-email-shown').textContent=email;
  document.getElementById('reg-success').style.display='block';
  ['r-first','r-last','r-email','r-job','r-cat','r-subject','r-why'].forEach(fid=>{
    const el=document.getElementById(fid); if(el) el.value='';
  });
  proposalSubmitting=false;
  if(btn){ btn.disabled=false; btn.textContent=t('propose_submit'); }
  showToast(t('toast_submit_success'));
}

// ═══════════════ GATE (connexion + code d'accès) ═══════════════
let _writeUnlocked=false;
let editorBlocks=[];
let _coverData='';
let writerSyncTimer=null;
let writerStateWrite=Promise.resolve();

function writerStatePath(){
  return currentUser?.id?`${WRITER_SESSIONS_PATH}/${currentUser.id}`:null;
}
async function getWriterState(){
  const path=writerStatePath();
  return path?await dbGet(path):null;
}
function persistWriterState(value){
  const path=writerStatePath();
  if(!path)return Promise.resolve(new Error(t('toast_user_error')));
  writerStateWrite=writerStateWrite.then(()=>dbSet(path,value));
  return writerStateWrite;
}
async function syncSubmittedWriterState(){
  if(!_writeUnlocked||isOwner())return;
  const state=await getWriterState();
  if(state?.status==='submitted'){
    _writeUnlocked=false;
    saveWriteUnlocked(false);
    if(document.getElementById('page-write')?.classList.contains('active'))renderWritePage();
  }
}

function draftStorageKey(){
  if(!currentUser||!currentUser.email) return null;
  return `draft_article_${currentUser.email.toLowerCase()}`;
}
function loadDraft(){
  const key = draftStorageKey();
  if(!key) return null;
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}
function currentDraft(){
  return {
    cat: document.getElementById('f-cat')?.value || '',
    author: document.getElementById('f-author')?.value || '',
    title: document.getElementById('f-title')?.value || '',
    deck: document.getElementById('f-deck')?.value || '',
    cover: _coverData || '',
    blocks: editorBlocks
  };
}
function saveDraft(){
  return;
}
async function saveDraftNow(){
  if(!_writeUnlocked || !currentUser){
    showToast(t('toast_login_required'));
    return;
  }
  const btn=document.getElementById('btn-save-draft');
  if(btn){btn.disabled=true;btn.textContent=t('write_saving_draft');}
  const draft=currentDraft();
  const key=draftStorageKey();
  const error=await persistWriterState({status:'draft',draft,updatedAt:Date.now()});
  if(!error && key){
    try{localStorage.setItem(key,JSON.stringify(draft));}catch(e){}
  }
  if(btn){btn.disabled=false;btn.textContent=t('write_save_draft');}
  showToast(error?t('toast_save_error'):t('toast_draft_saved'),6000);
}
function clearDraft(){
  const key = draftStorageKey();
  if(!key) return;
  try{ localStorage.removeItem(key); }catch(e){}
}
function writeUnlockedStorageKey(){
  if(!currentUser||!currentUser.email) return null;
  return `draft_write_unlocked_${currentUser.email.toLowerCase()}`;
}
function loadWriteUnlocked(){
  const key = writeUnlockedStorageKey();
  if(!key) return false;
  try{ return localStorage.getItem(key) === '1'; }catch(e){ return false; }
}
function saveWriteUnlocked(value){
  const key = writeUnlockedStorageKey();
  if(!key) return;
  try{
    if(value) localStorage.setItem(key,'1'); else localStorage.removeItem(key);
  }catch(e){}
}

async function renderWritePage(){
  document.getElementById('write-login-gate').style.display='none';
  document.getElementById('code-gate').style.display='none';
  document.getElementById('write-form').style.display='none';

  if(!currentUser){
    document.getElementById('write-login-gate').style.display='block';
    return;
  }
  const { user: authUser, error: authError } = await ensureValidAuthSession();
  if(authError || !authUser?.id){
    renderNav();
    document.getElementById('write-login-gate').style.display='block';
    return;
  }
  if(isOwner())_writeUnlocked=true;
  if(!_writeUnlocked){
    if(loadWriteUnlocked()){
      _writeUnlocked = true;
    }
  }
  const writerState=await getWriterState();
  if(writerState?.status==='draft'){
    _writeUnlocked=true;
    saveWriteUnlocked(true);
  }
  if(!isOwner() && writerState?.status==='submitted'){
    _writeUnlocked=false;
    saveWriteUnlocked(false);
    document.getElementById('code-gate').style.display='block';
    document.getElementById('gate-err').textContent=t('code_exhausted');
    return;
  }
  if(!_writeUnlocked){
    document.getElementById('code-gate').style.display='block';
    document.getElementById('gate-err').style.display='none';
    document.getElementById('access-code').value='';
    return;
  }
  document.getElementById('write-form').style.display='block';
  if(writerSyncTimer)clearInterval(writerSyncTimer);
  writerSyncTimer=setInterval(syncSubmittedWriterState,5000);
  if(editorBlocks.length===0){
    const draft = writerState?.draft||loadDraft();
    if(draft && Array.isArray(draft.blocks) && draft.blocks.length){
      editorBlocks = draft.blocks;
      document.getElementById('f-cat').value = draft.cat || '';
      document.getElementById('f-author').value = draft.author || `${currentUser.first} ${currentUser.last}`;
      document.getElementById('f-title').value = draft.title || '';
      document.getElementById('f-deck').value = draft.deck || '';
      _coverData = draft.cover || '';
      if(_coverData){
        showCoverPreview(_coverData);
      } else {
        hideCoverPreview();
      }
    } else {
      document.getElementById('f-cat').value = '';
      document.getElementById('f-author').value = `${currentUser.first} ${currentUser.last}`;
      document.getElementById('f-title').value = '';
      document.getElementById('f-deck').value = '';
      _coverData = '';
      hideCoverPreview();
      editorBlocks=[];
    }
    renderBlocks();
    updateWordCount();
    updateCount('f-title','tc',80);
    updateCount('f-deck','dc',250);
  }
}

async function checkCode(){
  const input=document.getElementById('access-code');
  const val=input.value.trim();
  const errEl=document.getElementById('gate-err');
  errEl.style.display='none';
  if(!val){ errEl.textContent=t('toast_enter_code'); errEl.style.display='block'; return; }

  const codes = await dbGet(ONE_TIME_CODES_PATH);
  let entry = null;
  if(codes && typeof codes === 'object' && !Array.isArray(codes)){
    if(codes.code !== undefined){
      if(codes.code === val){ entry = codes; }
    } else {
      for(const [k,v] of Object.entries(codes)){
        if(v && v.code === val){ entry = v; break; }
      }
    }
  }

  if(!entry){
    errEl.textContent=t('code_invalid'); errEl.style.display='block';
    return;
  }

  if(entry.forEmail && currentUser && entry.forEmail.toLowerCase() !== currentUser.email.toLowerCase()){
    errEl.textContent=t('code_unassigned');
    errEl.style.display='block';
    return;
  }

  if((entry.used||0) >= (entry.max||2)){
    errEl.textContent=t('code_exhausted'); errEl.style.display='block';
    return;
  }

  const { data: consumeResult, error: consumeError } = await _sb.rpc('consume_access_code', { p_code: val });
  if(consumeError || !consumeResult?.ok){
    errEl.textContent=consumeResult?.error||consumeError?.message||t('toast_save_error');
    errEl.style.display='block';
    return;
  }

  const stateError=await persistWriterState({status:'draft',draft:null,updatedAt:Date.now()});
  if(stateError){
    errEl.textContent=t('toast_save_error');
    errEl.style.display='block';
    return;
  }
  _writeUnlocked=true;
  saveWriteUnlocked(true);
  renderWritePage();
}

// ═══════════════ ÉDITEUR DE BLOCS ═══════════════
function blockHtml(b,i){
  let inner='';
  switch(b.type){
    case 'paragraph':
      inner=`<div class="block-content"><div class="block-para" contenteditable="true" data-placeholder="${t('editor_para_ph')}" oninput="updateBlockText(${i},this)" onmouseup="showFmtToolbar()" onkeyup="showFmtToolbar()">${b.html||''}</div></div>`; break;
    case 'h1':
      inner=`<div class="block-content"><div class="block-h1" contenteditable="true" data-placeholder="${t('editor_h1_ph')}" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'h2':
      inner=`<div class="block-content"><div class="block-h2" contenteditable="true" data-placeholder="${t('editor_h2_ph')}" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'h3':
      inner=`<div class="block-content"><div class="block-h3" contenteditable="true" data-placeholder="${t('editor_h3_ph')}" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'quote':
      inner=`<div class="block-content"><div class="block-quote" contenteditable="true" data-placeholder="${t('editor_quote_ph')}" oninput="updateBlockText(${i},this)" onmouseup="showFmtToolbar()" onkeyup="showFmtToolbar()">${b.html||''}</div></div>`; break;
    case 'infobox':
      inner=`<div class="block-content"><span class="block-infobox-label">${t('editor_info_label')}</span><div class="block-infobox" contenteditable="true" data-placeholder="${t('editor_info_ph')}" oninput="updateBlockText(${i},this)">${b.html||''}</div></div>`; break;
    case 'sources':
      inner=`<div class="block-content"><span class="block-sources-label">${t('editor_sources')}</span><textarea class="block-sources" placeholder="${t('editor_sources_ph')}" oninput="updateBlockValue(${i},this)">${b.text||''}</textarea></div>`; break;
    case 'credits':
      inner=`<div class="block-content"><span class="block-credits-label">${t('editor_credits')}</span><textarea class="block-credits" placeholder="${t('editor_credits_ph')}" oninput="updateBlockValue(${i},this)">${b.text||''}</textarea></div>`; break;
    case 'separator':
      inner=`<div class="block-content"><div class="block-sep">···</div></div>`; break;
    case 'image':
      inner=`<div class="block-content"><div class="block-img-wrap"><img src="${b.src}" alt=""><input type="text" class="block-img-caption" placeholder="${t('editor_caption_ph')}" value="${(b.caption||'').replace(/"/g,'&quot;')}" oninput="updateBlockValue(${i},this)"></div></div>`; break;
  }
  return `<div class="block-wrap">${inner}<div class="block-actions"><button type="button" class="block-type-btn" title="${t('editor_choose')}" onclick="toggleBlockTypePicker(${i})">${t('editor_type')}</button><button type="button" class="block-del" title="${t('editor_delete')}" onclick="deleteBlock(${i})">✕</button><div class="block-type-picker" id="block-type-picker-${i}" style="display:none">${blockPickerOptionsHtml('change',i)}</div></div></div>`;
}
function renderBlocks(){
  const editor=document.getElementById('article-blocks');
  let html=blockInsertPointHtml(0,!editorBlocks.length);
  editorBlocks.forEach((b,i)=>{ html+=blockHtml(b,i)+blockInsertPointHtml(i+1); });
  editor.innerHTML=html;
  updateWordCount();
}
function blockPickerOptionsHtml(action,index){
  const call=type=>action==='change'?`changeBlockType(${index},'${type}')`:`insertBlockAt('${type}',${index})`;
  const button=(type,label,title)=>`<button type="button" class="tb-btn" title="${title}" onclick="${call(type)}">${label}</button>`;
  return `${button('paragraph',`¶ ${t('editor_paragraph')}`,t('editor_add_paragraph'))}${button('h1','H1',t('editor_add_h1'))}${button('h2','H2',t('editor_add_h2'))}${button('h3','H3',t('editor_add_h3'))}${button('quote',`« ${t('editor_quote')}`,t('editor_add_quote'))}${button('separator',`— — ${t('editor_separator')}`,t('editor_add_separator'))}${button('infobox',`ℹ ${t('editor_info')}`,t('editor_add_info'))}${button('sources',`🔗 ${t('editor_sources')}`,t('editor_add_sources'))}${button('credits',`✍ ${t('editor_credits')}`,t('editor_add_credits'))}`;
}
function blockInsertPointHtml(index,isOpen=false){
  return `<div class="block-insert-point"><button type="button" class="add-inline-block-btn" title="${t('editor_add_title')}" onclick="toggleInsertPicker(${index})">${t('editor_add_here')}</button><div class="block-picker-inline" id="block-picker-inline-${index}" style="display:${isOpen?'flex':'none'}"><div class="block-picker-prompt">${t('editor_choose')}</div><div class="block-picker-options">${blockPickerOptionsHtml('insert',index)}<button type="button" class="tb-btn" title="${t('editor_add_image')}" onclick="triggerInlineImg(${index})">🖼 ${t('editor_image')}</button></div></div></div>`;
}
function updateBlockText(i,el){ editorBlocks[i].html = el.innerHTML; updateWordCount(); saveDraft(); }
function updateBlockValue(i,el){
  if(editorBlocks[i].type==='image') editorBlocks[i].caption = el.value;
  else editorBlocks[i].text = el.value;
  saveDraft();
}
function deleteBlock(i){
  editorBlocks.splice(i,1);
  renderBlocks();
  saveDraft();
}
function toggleInsertPicker(index){
  const picker=document.getElementById(`block-picker-inline-${index}`); if(!picker)return;
  document.querySelectorAll('.block-picker-inline').forEach(el=>{if(el!==picker)el.style.display='none';});
  picker.style.display=picker.style.display==='none'?'flex':'none';
}
function toggleBlockTypePicker(index){
  const picker=document.getElementById(`block-type-picker-${index}`); if(!picker)return;
  picker.style.display=picker.style.display==='none'?'flex':'none';
}
function closeBlockPicker(){
  document.querySelectorAll('.block-picker-inline,.block-type-picker').forEach(el=>{el.style.display='none';});
}
function insertBlock(type){
  insertBlockAt(type,editorBlocks.length);
}
function insertBlockAt(type,index){
  editorBlocks.splice(index,0,{type, html:'', text:''});
  closeBlockPicker();
  renderBlocks();
  saveDraft();
  setTimeout(()=>{
    const editable=document.querySelectorAll('#article-blocks .block-content [contenteditable], #article-blocks .block-content textarea');
    const last=editable[editable.length-1]; if(last) last.focus();
  },30);
}
function changeBlockType(index,type){
  if(!editorBlocks[index])return;
  editorBlocks[index].type=type;
  closeBlockPicker();
  renderBlocks();
  saveDraft();
}
let pendingImageInsertIndex=null;
function triggerInlineImg(index=editorBlocks.length){
  pendingImageInsertIndex=index;
  document.getElementById('inline-img-input').click();
}
function handleInlineImage(e){
  const file=e.target.files[0]; if(!file)return;
  if(file.size>4*1024*1024){ showToast(t('toast_image_too_large')); return; }
  const r=new FileReader();
  r.onload=ev=>{ editorBlocks.splice(pendingImageInsertIndex??editorBlocks.length,0,{type:'image', src:ev.target.result, caption:''}); pendingImageInsertIndex=null; closeBlockPicker(); renderBlocks(); saveDraft(); };
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
function escapeHtml(value){
  return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function sourceToHtml(value){
  let html=escapeHtml(value);
  html=html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html=html.replace(/(^|[\s>])(https?:\/\/[^\s<]+)/g,'$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return html.replace(/\n/g,'<br>');
}
function updateWordCount(){
  const words = editorBlocks.filter(b=>['paragraph','quote','infobox','h1','h2','h3'].includes(b.type))
    .map(b=>stripHtml(b.html)).join(' ').trim().split(/\s+/).filter(Boolean).length;
  const el=document.getElementById('bc'); if(el) el.textContent = `${words} mot${words>1?'s':''}`;
}
function updateCount(inputId,countId,max){
  const val=document.getElementById(inputId).value;
  document.getElementById(countId).textContent = `${val.length} / ${max}`;
  saveDraft();
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
  if(file.size>4*1024*1024){ showToast(t('toast_image_too_large')); return; }
  const r=new FileReader();
  r.onload=ev=>{ _coverData=ev.target.result; showCoverPreview(_coverData); document.getElementById('f-img').value=''; saveDraft(); };
  r.readAsDataURL(file);
  e.target.value='';
}
function handleCoverUrl(url){
  url=url.trim();
  if(!url){ _coverData=''; hideCoverPreview(); saveDraft(); return; }
  _coverData=url; showCoverPreview(url); saveDraft();
}

// ═══════════════ PUBLICATION ═══════════════
function blockToHtml(b){
  switch(b.type){
    case 'paragraph': return `<p>${b.html||''}</p>`;
    case 'h1': return `<h1>${b.html||''}</h1>`;
    case 'h2': return `<h2>${b.html||''}</h2>`;
    case 'h3': return `<h3>${b.html||''}</h3>`;
    case 'quote': return `<blockquote>${b.html||''}</blockquote>`;
    case 'separator': return `<div class="art-sep">⁂</div>`;
    case 'infobox': return `<div class="art-info-box"><div class="art-info-box-title">Info</div><div class="art-info-box-body">${b.html||''}</div></div>`;
    case 'sources': return `<div class="art-sources-box"><div class="art-sources-title">Sources</div><div class="art-sources-body">${sourceToHtml(b.text)}</div></div>`;
    case 'credits': return `<div class="art-credits-box"><div class="art-credits-title">Crédits</div><div class="art-credits-body">${(b.text||'').replace(/\n/g,'<br>')}</div></div>`;
    case 'image': return `<div class="art-inline-img"><img src="${b.src}" alt="">${b.caption?`<div class="art-inline-caption">${b.caption}</div>`:''}</div>`;
    default: return '';
  }
}
function previewArticle(){
  const title=document.getElementById('f-title').value.trim();
  const deck=document.getElementById('f-deck').value.trim();
  const cat=document.getElementById('f-cat').value;
  const author=document.getElementById('f-author').value.trim();
  if(!title||!deck||!cat||!author){showToast(t('toast_required_fields'));return;}
  const bodyText=editorBlocks.filter(b=>['paragraph','quote','infobox','h1','h2','h3'].includes(b.type)).map(b=>stripHtml(b.html)).join(' ').trim();
  if(!bodyText){showToast(t('toast_add_content'));return;}
  document.getElementById('preview-cat').textContent=tCat(cat);
  document.getElementById('preview-title').textContent=title;
  document.getElementById('preview-deck').textContent=deck;
  document.getElementById('preview-meta').textContent=`${t('home_par')} ${author}`;
  const coverWrap=document.getElementById('preview-cover-wrap');
  coverWrap.style.display=_coverData?'block':'none';
  if(_coverData)document.getElementById('preview-cover').src=_coverData;
  document.getElementById('preview-body').innerHTML=editorBlocks.map(blockToHtml).join('\n');
  document.getElementById('article-preview-modal').classList.add('open');
}
function closeArticlePreview(){
  document.getElementById('article-preview-modal').classList.remove('open');
}
function notifyPublishError(error, fallback=''){
  const detail=error?.message||fallback;
  showToast(detail?`${t('toast_publish_error')} ${detail}`:t('toast_publish_error'),6000);
}
async function publishArticle(){
  const title =document.getElementById('f-title').value.trim();
  const deck  =document.getElementById('f-deck').value.trim();
  const cat   =document.getElementById('f-cat').value;
  const author=document.getElementById('f-author').value.trim();
  if(!title||!deck||!cat||!author){ showToast(t('toast_required_fields')); return; }
  const bodyText = editorBlocks.filter(b=>['paragraph','quote','infobox','h1','h2','h3'].includes(b.type))
    .map(b=>stripHtml(b.html)).join('\n\n').trim();
  if(!bodyText){ showToast(t('toast_add_content')); return; }
  const bodyHtml = editorBlocks.map(blockToHtml).join('\n');
  if(!_sb?.auth){
    notifyPublishError(null,t('toast_user_error'));
    return;
  }

  const { user: authUser, error: authSessionError } = await ensureValidAuthSession();
  if(authSessionError || !authUser?.id){
    notifyPublishError(authSessionError || new Error(t('toast_user_error')));
    renderNav();
    showPage('home');
    return;
  }

  const profileError=await ensureAuthProfile(authUser);
  if(profileError){
    notifyPublishError(profileError,t('toast_save_error'));
    return;
  }
  const {data:id,error:idError}=await _sb.rpc('next_article_id');
  if(idError||!id){
    notifyPublishError(idError,t('toast_id_error'));
    console.error('next_article_id',idError);
    return;
  }
  const isAdmin=isOwner();
  const a = { id, owner_id:authUser.id, title, deck, cat, author, img:_coverData||'', body:bodyText, bodyHtml, date:today(), reads:0, status:isAdmin?'published':'pending', lang:_lang };
  const btn=document.getElementById('btn-publish'); btn.disabled=true;
  let saveError;
  try{
    saveError=await saveArticle(a);
  }catch(error){
    saveError=error;
    console.error('publishArticle',error);
  }
  if(saveError){
    notifyPublishError(saveError,t('toast_save_error'));
    btn.disabled=false;
    return;
  }
  articles.push(a);
  clearDraft();
  const stateError=await persistWriterState({status:'submitted',updatedAt:Date.now()});
  if(stateError)console.error('publishArticle state',stateError);
  if(writerSyncTimer)clearInterval(writerSyncTimer);
  editorBlocks=[];
  _coverData='';
  document.getElementById('f-cat').value='';
  document.getElementById('f-author').value=`${currentUser.first} ${currentUser.last}`;
  document.getElementById('f-title').value='';
  document.getElementById('f-deck').value='';
  document.getElementById('f-img').value='';
  hideCoverPreview();
  renderBlocks();
  updateWordCount();
  updateCount('f-title','tc',80);
  updateCount('f-deck','dc',250);
  lastPublishedId=id;
  _writeUnlocked=isAdmin;
  saveWriteUnlocked(isAdmin);
  showToast(t('write_published'),6000);
  document.getElementById('write-form').style.display='none';
  document.getElementById('code-gate').style.display=isAdmin?'none':'block';
  document.getElementById('gate-err').style.display='none';
}
function startNewArticle(){
  editorBlocks=[]; _coverData='';
  document.getElementById('btn-publish').disabled=false;
  document.getElementById('write-form').style.display='none';
  renderWritePage();
  showPage('write');
}
