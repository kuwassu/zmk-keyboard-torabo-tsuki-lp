/* Offline manual. Position numbers always refer to the 66-entry source keymap. */
'use strict';
const $ = selector => document.querySelector(selector);
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows = [
  [13,14,15,16,17,18,19,20,21,22],
  [25,26,27,28,29,32,33,34,35,36],
  [39,40,41,42,43,44,45,46,47,48,49,50],
  [53,54,55,56,57,58,59,60,61,62,63,64]
];
const names = ['基本配列','接続先','タブ切替','記号・矢印','数字','Fキー','スクロール'];
const triggers = ['通常入力','J＋K＋L＋Enter','親指Shift 長押し','Bspc 長押し','Space 長押し','Space右隣 長押し','Enter 長押し'];
const descriptions = [
  '短押しで文字を入力。長押しの動作はキー下段に表示。',
  'Y / U / I / O / P / H / Jで接続先0〜6を選択。EnterかEscで戻る。',
  'キーは基本配列を引継ぎ。左親指Shiftを離すと解除。',
  '矢印・記号・編集。ZはUndo／Shift、/は右Shift。RはWin：F2、Mac：Enter。',
  '上段：1〜0。右手：テンキー。Spaceを離すと基本配列へ。',
  'F1〜F12とウィンドウ操作。押していた親指キーを離すと解除。',
  'H：自由、J：縦のみ、K：横のみ。Enterを離すと解除。'
];
let os = 'win', group = 0, showPositions = false, comboScope = 'current', selectedCombo = null;
const layerId = (g = group, system = os) => [[0,1],[2,2],[3,3],[4,5],[6,7],[8,9],[10,11]][g][+(system === 'mac')];
const aliases = {LEFT_SHIFT:'Shift',RIGHT_SHIFT:'Shift',LSHIFT:'Shift',LCTRL:'Ctrl',RCTRL:'右Ctrl',RIGHT_CONTROL:'右Ctrl',LGUI:'Win',LEFT_GUI:'Win',LEFT_ALT:'Alt',LALT:'Alt',BSPC:'Bspc',ENTER:'Enter',SPACE:'Space',TAB:'Tab',ESC:'Esc',DELETE:'Delete',GRAVE:'Grave',HOME:'Home',END:'End',LEFT:'←',RIGHT:'→',UP:'↑',DOWN:'↓',CAPS:'Caps',PRINTSCREEN:'PrtSc',COMMA:',',PERIOD:'.',DOT:'.',FSLH:'/',SLASH:'/',MINUS:'-',EQUAL:'^',LBKT:'@',RIGHT_BRACKET:'[',BSLH:']',INT1:'\\',INT3:'¥',SEMI:';',SEMICOLON:';',APOS:':',LANGUAGE_1:'かな',LANG2:'英数',C_BRI_DN:'明るさ−',C_BRI_UP:'明るさ＋',C_VOL_DN:'音量−',C_VOL_UP:'音量＋',C_MUTE:'ミュート',C_PLAY_PAUSE:'再生/停止'};
function keyName(code) {
  if (/^N\d$/.test(code)) return code.slice(1);
  const shifted = {'N1':'!','N2':'"','N3':'#','N4':'$','N5':'%','N6':'&','N7':"'",'N8':'(','N9':')','EQUAL':'~','INT1':'_','RIGHT_BRACKET':'{','BSLH':'}','SEMI':'+','SEMICOLON':'+','APOS':'*'};
  const wrapped = code.match(/^(LS|LC|RC|LG|LA)\((.*)\)$/);
  if (wrapped) {
    if (wrapped[1] === 'LS' && shifted[wrapped[2]]) return shifted[wrapped[2]];
    return ({LS:'Shift',LC:'Ctrl',RC:'右Ctrl',LG:os === 'mac'?'Cmd':'Win',LA:'Alt'}[wrapped[1]]) + '+' + keyName(wrapped[2]);
  }
  const name = aliases[code] || code;
  return os === 'mac' && (code === 'LGUI' || code === 'LEFT_GUI') ? 'Cmd' : name;
}
function describe(binding) {
  const [behavior,...args] = binding.split(' ');
  if (behavior === '&scroll_mode') return {label:['自由 ↕↔','縦のみ ↕','横のみ ↔'][+args[0]],sub:'1回押して選択',kind:'layer'};
  if (behavior === '&none') return {label:'—',sub:'',kind:'inactive'};
  if (behavior === '&kp') return {label:keyName(args[0]),sub:'',kind:''};
  if (behavior === '&thumb_shift') return {label:'Shift¹ / Caps²',sub:'長押し タブ',kind:'layer'};
  if (behavior === '&mt' || behavior === '&z_mt' || behavior === '&slash_mt') return {label:keyName(args[1]),sub:'長押し '+keyName(args[0]),kind:'mod'};
  if (behavior === '&lt' || behavior === '&space_lt') return {label:keyName(args[1]),sub:'長押し L'+args[0],kind:'layer'};
  if (behavior === '&mo') return {label:'L'+args[0],sub:'押している間',kind:'layer'};
  if (behavior === '&tog') return {label:'キャンセル',sub:'元の配列へ',kind:'layer'};
  if (behavior === '&mkp') return {label:({LCLK:'左クリック',MCLK:'中クリック',RCLK:'右クリック',MB4:'戻る',MB5:'進む'}[args[0]]),sub:'',kind:''};
  if (behavior === '&bt') return {label:args[0] === 'BT_DISC'?'切断 '+args[1]:args[0] === 'BT_PRV'?'前のBT':'次のBT',sub:'',kind:''};
  if (/^&(win|mac)_bt\d$/.test(behavior)) return {label:'BT '+behavior.slice(-1),sub:behavior.startsWith('&win')?'→ Windows':'→ Mac',kind:'layer'};
  return {label:binding,sub:'',kind:''};
}
function board(id, selected = [], mini = false) {
  const base = os === 'mac' ? 1 : 0;
  let keys = '';
  rows.forEach((row,r) => row.forEach((pos,c) => {
    let x;
    if (r < 2) x = c < 5 ? 12+c*70 : 572+(c-5)*70;
    else x = c < 6 ? 12+c*70 : 502+(c-6)*70;
    const stagger = r < 3 ? [24,10,0,6,12][c < (r<2?5:6)?Math.min(c,4):Math.min(row.length-1-c,4)] : 0;
    const y = 30+r*88+stagger+(r===3?16:0);
    const raw = KEYMAP.layers[id].bindings[pos];
    const inherited = raw === '&trans';
    const binding = inherited ? KEYMAP.layers[base].bindings[pos] : raw;
    const {label,sub,kind} = describe(binding);
    const active = selected.includes(pos);
    const cls = ['key',kind,inherited?'inherited':'',active?'selected':''].join(' ');
    const baseLabel = describe(KEYMAP.layers[base].bindings[pos]).label;
    const tip = showPositions ? `位置${pos}（${baseLabel}）: ${raw}${inherited?' → '+binding:''}` : `${baseLabel}：短押し ${label}${sub?'、'+sub:''}${inherited?'（基本配列から引継ぎ）':''}`;
    keys += `<g class="${cls}" transform="translate(${x},${y})"><title>${esc(tip)}</title><rect width="64" height="72" rx="9"/>${showPositions&&!mini?`<text class="key-pos" x="5" y="13">${pos}</text>`:''}${id>1&&!mini?`<text class="key-base" x="59" y="13">${esc(baseLabel)}</text>`:''}<text class="key-label" x="32" y="${sub?32:41}"${label.length>7?' textLength="57" lengthAdjust="spacingAndGlyphs"':''}>${esc(label)}</text>${sub?`<text class="key-sub" x="32" y="55"${sub.length>6?' textLength="57" lengthAdjust="spacingAndGlyphs"':''}>${esc(sub)}</text>`:''}</g>`;
  }));
  const selectedLabel = selected.map(p => describe(KEYMAP.layers[base].bindings[p]).label).join(' と ');
  return `<svg class="keyboard" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 402" role="img" aria-label="${esc(mini?selectedLabel+' の同時押し位置図':(os==='win'?'Windows':'Mac')+' L'+id+' '+KEYMAP.layers[id].name+' 配列図')}"><text class="hand" x="12" y="16">LEFT</text><text class="hand" x="840" y="16">RIGHT</text>${keys}</svg>`;
}
const comboInfo = {
  question_mark:['? を入力','symbol'],
  win_close:['ウィンドウを閉じる（Alt＋F4）','system'],mac_close:['アプリを終了（Cmd＋Q）','system'],
  sticky_shift_combo:['次の1キーにShift','system'],
  bt_select_layer:['Bluetooth管理を開く／閉じる','system'],
  bt_clear:['現在のBT登録を削除','system'],bt_clear_all:['すべてのBT登録を削除','system'],mac_layout:['Mac配列へ切替','system'],win_layout:['Windows配列へ切替','system'],
  left_kakko:['( を入力','symbol'],right_kakko:[') を入力','symbol'],left_namikakko:['{ を入力','symbol'],right_namikakko:['} を入力','symbol'],left_kakukakko:['[ を入力','symbol'],right_kakukako:['] を入力','symbol'],plus:['+ を入力','symbol'],asterisk:['* を入力','symbol'],
  left_click:['左クリック','mouse'],right_click:['右クリック','mouse'],middle_click:['中クリック','mouse'],undo_click:['戻る（ボタン4）','mouse'],redo_click:['進む（ボタン5）','mouse'],kana:['かな入力へ','system'],eisu:['英数入力へ','system'],left_win_win:['Winキー（左手）','system'],right_win_win:['Winキー（右手）','system'],left_mac_ctrl:['右Ctrl（左手）','system'],right_mac_ctrl:['右Ctrl（右手）','system']
};
const layerEnabled = id => KEYMAP.layers[id].enabled !== false;
const layerVisible = id => layerEnabled(id) && (KEYMAP.layers[id].os==='both' || KEYMAP.layers[id].os===os);
const isCurrentCombo = combo => layerEnabled(layerId()) && combo.layers.includes(layerId());
const osCombos = () => KEYMAP.combos.filter(c => c.layers.some(layerVisible));
const comboKeyNames = c => c.positions.map(p => describe(KEYMAP.layers[+(os==='mac')].bindings[p]).label);
function comboHint(c) {
  if (c.name==='question_mark') return 'Zと右小指の/（JISの「・」）を重ねて押します。文字として順に打つときは、いったんキーを離してください。';
  if (c.name.endsWith('_close')) return 'Fキーの配列で入力を止め、A＋S＋Dをほぼ同時に押します。';
  if (c.name==='sticky_shift_combo') return 'S＋D＋Fを同時に押して離すと、次の1キーにShiftが付きます。S＋Fだけなら英数なので、Dも押してください。';
  if (c.name==='eisu') return '左手の薬指＋人差し指（S＋F）で英数へ。間のDは押しません。';
  if (c.name==='kana') return '右手の人差し指＋薬指（J＋L）でかなへ。間のKは押しません。基本配列ではJ＋K＋Lが中クリックです。';
  if (c.name==='bt_select_layer') return '入力を止めて4キーをほぼ同時に押し、すべて離します。接続管理では同じコンボで閉じます。';
  if (c.name.startsWith('bt_clear')) return 'J＋K＋L＋EnterでL2を開き、全部離してから同時押し。'+(c.name==='bt_clear_all'?'全スロット':'現在選択中のスロット')+'の登録を削除します。削除後もL2です。EnterかEscで戻ります。';
  if (c.name.endsWith('_layout')) return 'L0・L1の両方で有効。Q＋WでWindows、Q＋W＋EでMacへ。接続先を変えずに配列だけ切り替えます。';
  return '';
}
function comboCategory(combo) {
  if (combo.name.endsWith('_close')) return 'ウィンドウ';
  if (combo.name.startsWith('bt_') || combo.name.endsWith('_layout')) return '接続・配列';
  if (comboInfo[combo.name][1] === 'mouse') return 'クリック・戻る／進む';
  if (combo.name === 'sticky_shift_combo' || /_(win|ctrl)$/.test(combo.name)) return '修飾キー';
  return '文字・入力切替';
}
function renderNearby() {
  const available = osCombos(), active = available.filter(isCurrentCombo);
  const visible = comboScope==='current' ? active : available;
  const categories = ['文字・入力切替','修飾キー','クリック・戻る／進む','接続・配列','ウィンドウ'];
  $('#nearby-summary').textContent = `L${layerId()}で有効：${active.length}件。キー名は基本配列での位置。`;
  $('#nearby-list').innerHTML = categories.map(category => {
    const combos = visible.filter(c => comboCategory(c) === category);
    if (!combos.length) return '';
    return `<section class="combo-category"><h4>${category}</h4><div>${combos.map(c => `<button type="button" class="combo-chip ${isCurrentCombo(c)?'is-active':'is-other'}" data-combo="${c.name}" aria-pressed="${selectedCombo===c.name}"><span class="chip-keys">${esc(comboKeyNames(c).join('＋'))}</span><span>${esc(comboInfo[c.name][0])}${!isCurrentCombo(c)?'<small>別配列</small>':''}</span></button>`).join('')}</div></section>`;
  }).join('') || '<p class="empty">この配列のコンボはありません。</p>';
  document.querySelectorAll('[data-scope]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scope===comboScope)));
  previewCombo(selectedCombo);
}
function previewCombo(name) {
  const combo = KEYMAP.combos.find(c => c.name===name);
  $('#main-board').innerHTML = board(layerId(), combo?combo.positions:[]);
  if (!combo) {
    $('#combo-preview').textContent = 'コンボを選ぶと、押すキーが配列上で光ります。';
    return;
  }
  const enabled = combo.layers.filter(layerVisible).map(l=>'L'+l).join('・');
  const target = combo.layers.find(layerVisible);
  const hint = comboHint(combo);
  $('#combo-preview').innerHTML = `<span>${esc(comboKeyNames(combo).join(' ＋ '))} → <strong>${esc(comboInfo[combo.name][0])}</strong></span>${!isCurrentCombo(combo)?` <span>有効：${enabled}</span> <button type="button" data-jump="${target}">対象の配列を見る</button>`:''}${hint?`<details><summary>押し方</summary><p>${esc(hint)}</p></details>`:''}`;
}
function renderPointer() {
  const ctrl = os === 'mac' ? '右Ctrl' : '左Ctrl';
  const windowLayer = os === 'mac' ? 9 : 8;
  const scrollLayer = os === 'mac' ? 11 : 10;
  const hold = (key, timing) => `<div class="gesture-trigger"><span class="hold-key"><kbd>${key}</kbd><small>${timing}</small></span><span class="gesture-join">＋</span><span class="ball-symbol" role="img" aria-label="右ボール"></span></div>`;
  const directions = items => '<dl class="direction-list">'+items.map(([arrow,label,keys])=>`<div><dt>${arrow}</dt><dd>${label}${keys?`<small>${keys}</small>`:''}</dd></div>`).join('')+'</dl>';
  const card = (title, layer, trigger, content) => `<article class="gesture-card ${layerId()===layer?'is-current':''}" data-gesture-layer="${layer}"><div class="gesture-card-heading"><h4>${title}</h4><span class="pill">L${layer}</span></div>${trigger}${content}</article>`;
  const windowKeys = os === 'win'
    ? [['←','左へ配置','Win＋←'],['→','右へ配置','Win＋→'],['↑','最大化','Win＋↑'],['↓','最小化など','Win＋↓']]
    : [['←','左へ配置','右Ctrl＋Caps＋←'],['→','右へ配置','右Ctrl＋Caps＋→'],['↑','画面を埋める','右Ctrl＋Caps＋F'],['↓','中央へ配置','右Ctrl＋Caps＋C']];
  $('#layer-pointer').innerHTML =
    card('タブ切替',3,hold('左親指Shift','長押し'),directions([['←','前のタブ',ctrl+'＋Shift＋Tab'],['→','次のタブ',ctrl+'＋Tab']])+'<p class="card-note">上下は未割当</p>')
    + card('ウィンドウ配置',windowLayer,hold('Spaceの右隣','長押し'),directions(windowKeys)+(os==='mac'?'<a class="card-note" href="#reference">Caps → Globeの設定が必要</a>':''))
    + card('スクロール',scrollLayer,hold('Enter','長押し'),directions([['↕↔','H：縦横自由',''],['↕','J：縦のみ',''],['↔','K：横のみ','']])+'<p class="card-note">H／J／Kは1回押して選択</p>');
}

function render() {
  document.querySelectorAll('[data-os]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.os===os)));
  const focusedGroup = document.activeElement?.dataset.group;
  $('#layer-buttons').innerHTML = names.map((n,g)=>`<button type="button" data-group="${g}" aria-pressed="${group===g}"${layerEnabled(layerId(g))?'':' disabled'}><span><b>L${layerId(g)}</b> ${n}</span><small>${triggers[g]}</small></button>`).join('');
  if (focusedGroup) $(`[data-group="${focusedGroup}"]`).focus({preventScroll:true});
  const id = layerId();
  $('#layer-description').innerHTML = `<div class="layer-intro"><h3>${names[group]}</h3><span class="pill">L${id} · ${KEYMAP.layers[id].os==='both'?'OS共通':os==='win'?'Windows':'Mac'}</span></div>${group?`<p>${descriptions[group]}</p>`:''}`;
  renderNearby();
  renderPointer();
  const previousOS = os;
  $('#all-layers').innerHTML = KEYMAP.layers.map((layer,id) => {
    if (!layerEnabled(id)) return '';
    os = layer.os==='both' ? previousOS : layer.os;
    return `<article class="print-layer"><h3>L${id} · ${esc(layer.name)}${layerEnabled(id)?'':'（未使用・自動切替無効）'}</h3><div class="board-scroll">${board(id)}</div></article>`;
  }).join('');
  os = previousOS;
}
document.querySelectorAll('[data-os]').forEach(b => b.addEventListener('click',()=>{os=b.dataset.os;selectedCombo=null;render();}));
$('#layer-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b&&!b.disabled){group=+b.dataset.group;selectedCombo=null;render();}});
document.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click',()=>{comboScope=b.dataset.scope;selectedCombo=null;renderNearby();}));
$('#nearby-list').addEventListener('click',e=>{const b=e.target.closest('[data-combo]');if(b){const name=b.dataset.combo;selectedCombo=selectedCombo===name?null:name;renderNearby();$(`[data-combo="${name}"]`).focus({preventScroll:true});}});
$('#combo-preview').addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(b){group=names.findIndex((_,g)=>layerId(g)===+b.dataset.jump);render();$(`[data-group="${group}"]`).focus({preventScroll:true});}});
$('#positions').addEventListener('change',e=>{showPositions=e.target.checked;render();});
$('#print').addEventListener('click',()=>window.print());
let detailsWasOpen;
window.addEventListener('beforeprint',()=>{const d=$('#print-layers');detailsWasOpen=d.open;d.open=true;});
window.addEventListener('afterprint',()=>{$('#print-layers').open=detailsWasOpen;});
render();
