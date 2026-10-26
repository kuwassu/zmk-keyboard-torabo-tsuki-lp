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
const names = ['基本配列','Bluetooth管理','記号・矢印','数字・テンキー','F・ジェスチャ','スクロール・メディア'];
const triggers = ['通常入力','J＋K＋L＋Enter → 離す → 選択','右下段Bspcを長押し','Spaceを長押し','Spaceの右隣を長押し','Enterを長押し'];
const descriptions = [
  'S＋D＋F → 離す → 次の1キーにShift。Z・/は150ms長押しでShift（文字優先）。親指Shiftは1回で次の1キー、2回でCaps Lock。',
  'Y〜Pで接続先、A〜Gで切断。EnterかEscで戻ります。',
  '矢印・編集・記号。Z位置は短押しUndo／長押しShift、/位置は右Shift。R位置はWin：F2、Mac：Enter。',
  'Spaceは150ms未満で空白・変換、150ms長押しで数字レイヤー。上段に数字、右手にテンキー。ボールは通常のポインター移動です。',
  'F1〜F12と右ボールのジェスチャー。A＋S＋DでWin：Alt＋F4、Mac：Cmd＋Q。',
  '右ボールでスクロール。J：縦のみ、K：横のみ、H：縦横自由。Enterを離すと解除。'
];
const flows = [
  ['いつもの配列','文字入力・クリックのコンボ','長押しキーやJ＋K＋L＋Enterで別レイヤーへ'],
  ['入力を200ms休める → J＋K＋L＋Enterを50ms以内に押す → 全部離す','Y〜P：接続先0〜4 ／ A〜G：切断0〜4','選択すると自動で戻る。切断・削除後はEnterかEscで戻る'],
  ['右下段Bspcを押したまま','矢印・記号・コピーなどの編集','Bspcを離す'],
  ['Spaceを押したまま','上段の数字・右手のテンキー','Spaceを離す'],
  ['Spaceの右隣を押したまま','F1〜F12・ボールでジェスチャ','押していたキーを離す'],
  ['Enterを押したまま','J：↕ 縦のみ ／ K：↔ 横のみ ／ H：自由','Enterを離す。次回は自由スクロール']
];
let os = 'win', group = 0, showPositions = false, comboScope = 'current', selectedCombo = null;
const layerId = (g = group, system = os) => [[0,1],[2,2],[4,5],[6,7],[8,9],[10,11]][g][+(system === 'mac')];
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
  if (behavior === '&thumb_shift') return {label:'Shift¹',sub:'2回 Caps',kind:'mod'};
  if (behavior === '&mt' || behavior === '&z_mt') return {label:keyName(args[1]),sub:'長押し '+keyName(args[0]),kind:'mod'};
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
    keys += `<g class="${cls}" transform="translate(${x},${y})"><title>位置${pos}（${esc(baseLabel)}）: ${esc(raw)}${inherited?' → '+esc(binding):''}</title><rect width="64" height="72" rx="9"/>${showPositions&&!mini?`<text class="key-pos" x="5" y="13">${pos}</text>`:''}${id>1&&!mini?`<text class="key-base" x="59" y="13">${esc(baseLabel)}</text>`:''}<text class="key-label" x="32" y="${sub?32:41}"${label.length>8?' textLength="57" lengthAdjust="spacingAndGlyphs"':''}>${esc(label)}</text>${sub?`<text class="key-sub" x="32" y="55">${esc(sub)}</text>`:''}</g>`;
  }));
  const selectedLabel = selected.map(p => describe(KEYMAP.layers[base].bindings[p]).label).join(' と ');
  return `<svg class="keyboard" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 402" role="img" aria-label="${esc(mini?selectedLabel+' の同時押し位置図':(os==='win'?'Windows':'Mac')+' L'+id+' '+KEYMAP.layers[id].name+' 配列図')}"><text class="hand" x="12" y="16">LEFT</text><text class="hand" x="840" y="16">RIGHT</text>${keys}</svg>`;
}
const comboInfo = {
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
  if (c.name.endsWith('_close')) return 'Fレイヤーで入力を150ms以上休め、A＋S＋Dを50ms以内にそろえて押します。';
  if (c.name==='sticky_shift_combo') return 'S＋D＋Fを50ms以内に押して離し、1500ms以内に次のキーを押すとShiftが付きます。待ち時間なし。S＋Fだけなら英数です。';
  if (c.name==='eisu') return '左手の薬指＋人差し指（S＋F）で英数へ。間のDは押しません。';
  if (c.name==='kana') return '右手の人差し指＋薬指（J＋L）でかなへ。間のKは押しません。基本配列ではJ＋K＋Lが中クリックです。';
  if (c.name==='bt_select_layer') return '入力を200ms以上休めて、4キーを50ms以内にそろえて押し、全部離します。L2では同じコンボで閉じます。';
  if (c.name.startsWith('bt_clear')) return 'J＋K＋L＋EnterでL2を開き、全部離してから同時押し。'+(c.name==='bt_clear_all'?'全スロット':'現在選択中のスロット')+'の登録を削除します。削除後もL2です。EnterかEscで戻ります。';
  if (c.name.endsWith('_layout')) return 'L0・L1の両方で有効。Q＋WでWindows、Q＋W＋EでMacへ。接続先を変えずに配列だけ切り替えます。';
  return '';
}
function renderNearby() {
  const available = osCombos(), active = available.filter(isCurrentCombo);
  const priority = ['sticky_shift_combo','eisu','kana','left_click','right_click','middle_click','bt_select_layer'];
  const visible = [...(comboScope==='current' ? active : available)].sort((a,b)=>(priority.includes(a.name)?priority.indexOf(a.name):99)-(priority.includes(b.name)?priority.indexOf(b.name):99));
  $('#nearby-summary').textContent = `L${layerId()}で有効：${active.length}件。キー名は基本配列での位置名です。`;
  $('#nearby-list').innerHTML = visible.map(c => `<button type="button" class="combo-chip ${isCurrentCombo(c)?'is-active':'is-other'}" data-combo="${c.name}" aria-pressed="${selectedCombo===c.name}"><span class="chip-keys">${esc(comboKeyNames(c).join(' ＋ '))}</span><span>${esc(comboInfo[c.name][0])}</span><small>${isCurrentCombo(c)?'● L'+layerId()+'で有効':'別レイヤー'}</small></button>`).join('') || '<p class="empty">このレイヤーのコンボはありません。</p>';
  document.querySelectorAll('[data-scope]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scope===comboScope)));
  previewCombo(selectedCombo);
}
function previewCombo(name) {
  const combo = KEYMAP.combos.find(c => c.name===name);
  $('#main-board').innerHTML = board(layerId(), combo?combo.positions:[]);
  if (!combo) {
    $('#combo-preview').textContent = 'コンボを選ぶと、配列図で押す位置と操作を確認できます。';
    return;
  }
  const enabled = combo.layers.filter(layerVisible).map(l=>'L'+l).join('・');
  const target = combo.layers.find(layerVisible);
  $('#combo-preview').innerHTML = `${esc(comboKeyNames(combo).join(' ＋ '))} → <strong>${esc(comboInfo[combo.name][0])}</strong> ／ ${isCurrentCombo(combo)?'このレイヤーで有効':'現在は無効。有効：'+enabled}。 ${esc(comboHint(combo))}${!isCurrentCombo(combo)?` <button type="button" data-jump="${target}">L${target}の配列を見る</button>`:''}`;
}
function renderPointer() {
  const panel = $('#layer-pointer');
  if (group === 4) {
    const directions = os === 'win'
      ? [['↑','最大化','Win＋↑'],['←','左へ配置','Win＋←'],['→','右へ配置','Win＋→'],['↓','最小化など','Win＋↓']]
      : [['↑','Ctrl＋Caps＋F',''],['←','Ctrl＋Caps＋←',''],['→','Ctrl＋Caps＋→',''],['↓','Ctrl＋Caps＋C','']];
    panel.innerHTML = '<h3>右ボール：4方向のジェスチャー</h3><p>Spaceの右隣を押したまま動かします。この間はポインター移動が止まります。</p><div class="gesture-directions">'+directions.map(([arrow,label,keys])=>'<div><b>'+arrow+'</b><span>'+label+'</span>'+(keys?'<small>'+keys+'</small>':'')+'</div>').join('')+'</div><p class="muted">方向はポインター座標基準です。'+(os==='mac'?'CapsはCaps Lockの送信キー。<a href="#reference">Globeへの割り当て設定</a>を確認してください。':'')+'</p>';
  } else if (group === 5) {
    panel.innerHTML = '<h3>右ボール：スクロール</h3><p><kbd>H</kbd> 縦横自由 ／ <kbd>J</kbd> 縦のみ ／ <kbd>K</kbd> 横のみ。1回押して選択し、Enterを離すまで保持。次回は自由スクロールです。</p><p class="muted">U / O：明るさ−・明るさ＋。M / , / .：音量−・ミュート・音量＋。左ミニトラックパッドはこの軸制限の対象外です。</p>';
  } else if (group === 0) {
    panel.innerHTML = '<h3>右ボール：ポインター移動</h3><p><kbd>J＋K</kbd> 左クリック ／ <kbd>K＋L</kbd> 右クリック ／ <kbd>J＋K＋L</kbd> 中クリック。押したまま動かすとドラッグ。</p><p class="muted">M＋,：戻る ／ ,＋.：進む。押す位置はコンボを選ぶと図に表示します。</p>';
  } else {
    panel.innerHTML = '';
  }
  panel.hidden = !panel.innerHTML;
}
function render() {
  document.querySelectorAll('[data-os]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.os===os)));
  const focusedGroup = document.activeElement?.dataset.group;
  $('#layer-buttons').innerHTML = names.map((n,g)=>`<button type="button" data-group="${g}" aria-pressed="${group===g}"${layerEnabled(layerId(g))?'':' disabled'}><span><b>L${layerId(g)}</b> ${n}</span><small>${triggers[g]}</small></button>`).join('');
  if (focusedGroup) $(`[data-group="${focusedGroup}"]`).focus({preventScroll:true});
  const id = layerId();
  $('#layer-description').innerHTML = `<div class="layer-intro"><h3>${names[group]}</h3><span class="pill">L${id} · ${id===2?'OS共通':os==='win'?'Windows':'Mac'}</span></div><p>${descriptions[group]}</p>${group ? `<ol class="layer-flow">${flows[group].map((text,i)=>`<li><b>${['入る','使う','戻る'][i]}</b><span>${esc(text)}</span></li>`).join('')}</ol>` : ''}`;
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
window.addEventListener('beforeprint',()=>{const d=$('details');detailsWasOpen=d.open;d.open=true;});
window.addEventListener('afterprint',()=>{$('details').open=detailsWasOpen;});
render();
