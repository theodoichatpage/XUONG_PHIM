// Ứng dụng web Xưởng Phim VOX: định tuyến bằng #hash, đọc tap/danh_sach.json, tap/<mã>/tap.json, quy_chuan/*.
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const APP = $('#app');
const CACHE = {};
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
};

async function lay(url, kieu = 'json') {
  if (CACHE[url]) return CACHE[url];
  const r = await fetch(url, {cache: 'no-cache'});
  if (!r.ok) throw new Error(`Không đọc được ${url} (${r.status})`);
  const v = kieu === 'json' ? await r.json() : await r.text();
  CACHE[url] = v;
  return v;
}
const khung = () => lay('quy_chuan/khung_12_nhip.json');

function toast(t) {
  const el = $('#toast');
  el.textContent = t; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, 2200);
}
async function chep(text) {
  try { await navigator.clipboard.writeText(text); toast('Đã chép'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast('Đã chép'); } catch (e2) { toast('Không chép được, hãy bôi đen và chép tay'); }
    ta.remove();
  }
}
function taiFile(ten, noiDung, kieu = 'application/json') {
  const blob = new Blob([noiDung], {type: kieu + ';charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = ten; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (b) chep(b.dataset.copy);
});

// ---------------------------------------------------------------- trang chủ
async function trangChu() {
  let ds = [];
  try { ds = await lay('tap/danh_sach.json'); } catch (e) { /* chưa có danh sách */ }
  let tk = [];
  try { tk = (await lay('tham_khao/danh_sach.json')).sort((a, b) => a.thu_tu - b.thu_tu); } catch (e) { /* chưa có */ }
  const nhap = LS.get('xp_ban_nhap', null);
  APP.innerHTML = `
    <h2>Các tập của Xưởng VOX</h2>
    <div class="grid-cards">
      ${ds.map(t => `<a class="card" href="#/tap/${encodeURIComponent(t.thu_muc || t.ma_tap)}">
          <span class="tag">${esc(t.ma_tap)}</span><h3>${esc(t.tieu_de)}</h3>
          <div class="meta"><span>Dài <b>${XP.tc(t.tong, false)}</b></span><span>Cảnh <b>${t.so_canh}</b></span><span>Shot <b>${t.so_shot}</b></span></div>
          ${t.trang_thai ? `<p class="muted" style="margin:0;font-size:13px">${esc(t.trang_thai)}</p>` : ''}</a>`).join('') || '<p class="muted">Chưa có tập nào trong tap/danh_sach.json.</p>'}
      ${nhap ? `<a class="card" href="#/tap/__nhap__"><span class="tag red">Bản nháp trên máy này</span><h3>${esc(nhap.tieu_de || nhap.ma_tap)}</h3>
          <p class="muted" style="margin:0;font-size:13px">Đang soạn, chưa đưa lên GitHub. Mở để xem như một tập, hoặc vào Soạn tập để sửa tiếp.</p></a>` : ''}
    </div>
    ${tk.length ? `<h2>Phim tham khảo – Việt Sử Kiêu Hùng</h2>
    <div class="grid-cards">${tk.map(t => `<a class="card" href="#/tham-khao/${encodeURIComponent(t.ma)}">
        <span class="tag">Tập ${t.thu_tu} · đăng ${esc(t.dang.split('-').reverse().join('/'))}</span><h3>${esc(t.ten)}</h3>
        <div class="meta"><span>Dài <b>${XP.tc(t.dai_s, false)}</b></span><span>Cảnh <b>${t.so_canh}</b></span><span>Đường dây <b>${t.so_day}</b></span></div>
        <p class="muted" style="margin:0;font-size:13px">${esc(t.boi_canh)}</p></a>`).join('')}
      <a class="card" href="#/tham-khao/so-sanh"><span class="tag">Đối chiếu</span><h3>Hai tập trên cùng khung 12 nhịp</h3>
        <p class="muted" style="margin:0;font-size:13px">So từng nhịp và công thức rút ra cho tuyến phim mới.</p></a></div>` : ''}`;
}

// ---------------------------------------------------------------- trang tập
const TABS = [['tuyen', 'Tuyến phim'], ['kich-ban', 'Kịch bản'], ['phieu-dung', 'Phiếu dựng'], ['prompt', 'Prompt ảnh'],
  ['doc', 'Kịch bản đọc'], ['kiem-tra', 'Kiểm tra'], ['tien-do', 'Tiến độ']];

async function trangTap(ma, tab = 'tuyen', canhMo) {
  const K = await khung();
  const tap = ma === '__nhap__' ? LS.get('xp_ban_nhap', null) : await lay(`tap/${ma}/tap.json`);
  if (!tap) { APP.innerHTML = '<p>Không có bản nháp nào trên máy này.</p>'; return; }
  XP.chuan(tap);
  const r = XP.kiemTra(tap, K);
  APP.innerHTML = `
    <section class="panel">
      <div class="row" style="justify-content:space-between"><span class="tag">${esc(tap.ma_tap)}${ma === '__nhap__' ? ' · bản nháp' : ''}</span>
        <div class="row">
          <button data-act="json">Tải tap.json</button><button data-act="csv">Tải bảng shot (Excel)</button>
          <a class="btn" href="#/soan/${encodeURIComponent(ma)}">Sửa trong trình soạn</a>
        </div></div>
      <h1>${esc(tap.tieu_de)}</h1>
      <div class="meta"><span>Dài <b>${XP.tc(r.tong, false)}</b></span><span>Shot <b>${r.soShot}</b></span><span>Cắt/phút <b>${r.cpm.toFixed(1)}</b></span>
        <span>Trung vị shot <b>${r.trungVi.toFixed(2)} s</b></span><span>Có lời <b>≈${r.loiPct.toFixed(0)}%</b></span><span>Câu thoại <b>${r.soCau}</b></span>
        <span>${r.loi.length ? `<span class="pill err">${r.loi.length} lỗi</span>` : '<span class="pill ok">0 lỗi</span>'} ${r.canhBao.length ? `<span class="pill warn">${r.canhBao.length} cảnh báo</span>` : ''}</span></div>
      ${tap.chu_de ? `<div class="meta"><span>Câu chủ đề: <b style="font-weight:500">${esc(tap.chu_de)}</b></span></div>` : ''}
      ${tap.giong_phan_de ? `<div class="meta"><span>Giọng phản đề: <b style="font-weight:500">${esc(tap.giong_phan_de)}</b></span></div>` : ''}
      <nav class="tabs" role="tablist">${TABS.map(([k, t]) => `<a class="tab" role="tab" aria-selected="${k === tab}" href="#/tap/${encodeURIComponent(ma)}/${k}">${t}</a>`).join('')}</nav>
      <div id="tabbody"></div>
    </section>`;
  APP.querySelector('[data-act="json"]').onclick = () => taiFile('tap.json', JSON.stringify(tap, null, 1));
  APP.querySelector('[data-act="csv"]').onclick = () => taiFile(`${tap.ma_tap}_bang_shot.csv`, XP.csv(tap), 'text/csv');
  const body = $('#tabbody');
  ({tuyen: tabTuyen, 'kich-ban': tabKichBan, 'phieu-dung': tabPhieu, prompt: tabPrompt, doc: tabDoc, 'kiem-tra': tabKiemTra, 'tien-do': tabTienDo}[tab] || tabTuyen)(tap, r, body, ma, canhMo);
}

function tabTuyen(tap, r, body, ma) {
  body.innerHTML = `
    <div class="legend">${VE.chuGiai()}</div>
    <div class="scroll" id="sv"></div>
    <p class="muted" style="font-size:13px;margin:0">Sơ đồ tự vẽ từ kịch bản. Bấm một cảnh để đọc kịch bản cảnh đó. Ô đặc: nhân vật có trong hình; ô mờ: chỉ có giọng.</p>
    <h3>Đường dây gieo → trả</h3>
    <div class="grid-cards" id="gt"></div>
    <h3>Đọc dọc từng cảnh</h3>
    <div style="display:grid;gap:10px">${theCanh(tap, r, ma)}</div>
    <h3>Bảng tóm tắt cảnh</h3>
    <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>Cảnh</th><th>Tên</th><th>Nhịp</th><th class="num">Vào</th><th class="num">Dài</th><th class="num">Shot</th><th class="num">Cắt/phút</th><th class="num">Từ thoại</th><th>Mục đích</th></tr></thead>
    <tbody>${r.bang.map(b => {
      const c = tap.canh.find(x => x.ma === b.ma) || {};
      return `<tr><td><a href="#/tap/${encodeURIComponent(ma)}/kich-ban/${b.ma}">${b.ma}</a></td><td>${esc(b.ten)}</td><td><span class="tag">${esc(b.nhip)}</span></td>
        <td class="num">${XP.tc(b.bd, false)}</td><td class="num">${b.dai.toFixed(0)} s</td><td class="num">${b.ns}</td><td class="num">${(b.cat / b.dai * 60).toFixed(1)}</td><td class="num">${b.tu}</td><td>${esc(c.muc_dich || '')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  $('#sv').append(VE.tuyenPhim(tap, null, cm => {
    const card = document.getElementById(`tc-${cm}`);
    if (card) { card.scrollIntoView({block: 'center'}); card.classList.add('hl'); setTimeout(() => card.classList.remove('hl'), 1600); }
  }));
  $('#gt').innerHTML = r.gt.map(({g, moc}, i) => `<div class="card" style="gap:4px">
      <span class="tag${VE.chinh(tap, g, i) ? ' red' : ''}" style="justify-self:start">${VE.chinh(tap, g, i) ? 'Đường dây chính' : 'Đường dây phụ'}</span>
      <b>${esc(g.mo_ta || g.ma)}</b>
      <span class="muted" style="font-size:12.5px">${moc.map(x => `${{gieo: 'gieo', nhac: 'nhắc', tra: 'trả'}[x.k]} ${x.m} (${XP.tc(x.t, false)})`).join(' → ')}</span></div>`).join('') || '<p class="muted">Chưa khai báo gieo – trả.</p>';
}

// Thẻ "đọc dọc từng cảnh" – cùng kiểu với trang Phim tham khảo, rút điểm nhấn từ các shot
const LOAI_CANH = {mo: ['Mở / tựa', '--c-mo'], tho: ['Gieo / ký ức', '--c-tho'], drama: ['Kịch – đối thoại', '--c-drama'],
  action: ['Hành động', '--c-action'], thuyet: ['Thuyết minh / lịch sử', '--c-thuyet'], ket: ['Móc / credit', '--c-ket']};
function theCanh(tap, r, ma) {
  const K = CACHE['quy_chuan/khung_12_nhip.json'];
  const NHIP = K ? Object.fromEntries(K.nhip.map(n => [n.ma, n])) : {};
  const {tl} = XP.timeline(tap);
  const ten = Object.fromEntries((tap.nhan_vat || []).map(n => [n.ma, n.ten || n.ma]));
  const viTri = Object.fromEntries(tl.map(s => [s.ma, s.bat_dau]));
  const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  return tap.canh.map((c, ci) => {
    const ss = tl.filter(s => s.chi_so_canh === ci && !s._ao);
    if (!ss.length) return '';
    const b = r.bang.find(x => x.ma === c.ma) || {};
    const bd = ss[0].bat_dau, kt = b.kt ?? (bd + ss.reduce((a, s) => a + +s.dai, 0));
    const loai = VE.NHOM[c.nhip] || 'drama';
    const q = NHIP[c.nhip];
    // điểm nhấn: câu thoại, chữ trên hình, shot đỏ sẫm, chuyển cảnh đặc biệt
    const nhan = [];
    ss.forEach(s => {
      s.thoai.forEach(t => nhan.push([s.bat_dau + (+t.luc || 0), `${ten[t.vai] || t.vai}: “${cut(t.loi.replace(/\s*\/\/\s*/g, '… ').replace(/\s*\/\s*/g, ' '), 110)}”`, s.ma]));
      (s.chu || []).forEach(x => nhan.push([s.bat_dau + (+x.luc || 0), `Chữ ${({phuon: 'phướn', the: 'thẻ', tua: 'tựa'})[x.kieu] || x.kieu}: “${(x.dong || []).join(' / ')}”`, s.ma]));
      if (s.do && !s.thoai.length) nhan.push([s.bat_dau, `Đỏ sẫm – ${cut(s.noi_dung || '', 110)}`, s.ma]);
      if (s.loai === 'den' && !s._ao) nhan.push([s.bat_dau, `Màn đen ${(+s.dai).toFixed(1)} s`, s.ma]);
    });
    nhan.sort((a, b) => a[0] - b[0]);
    const nv = [...new Set(ss.flatMap(s => [...(s.nhan_vat || []), ...s.thoai.map(t => t.vai)]))];
    const day = (tap.gieo_tra || []).map((g, i) => {
      const k = ['gieo', 'nhac', 'tra'].flatMap(kk => (g[kk] || []).filter(m => ss.some(s => s.ma === m)).map(() => ({gieo: 'gieo', nhac: 'nhắc', tra: 'trả'})[kk]));
      return k.length ? `<span class="tag${VE.chinh(tap, g, i) ? ' red' : ''}">${esc(g.mo_ta || g.ma)}: ${[...new Set(k)].join(', ')}</span>` : '';
    }).join('');
    const cpm = b.dai ? b.cat / b.dai * 60 : 0, lp = b.dai ? Math.min(100, b.noi / b.dai * 100) : 0;
    const kh = c.khuon;
    return `<article class="scene" id="tc-${c.ma}" tabindex="-1" style="padding:14px;display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px">
      <div class="muted" style="display:grid;gap:3px;align-content:start;font-size:13px;font-variant-numeric:tabular-nums"><span class="sc-no" style="color:var(--ink)">${ci + 1}</span><span>${XP.tc(bd, false)} – ${XP.tc(kt, false)}</span><span>${XP.tc(kt - bd, false)} phút</span><span>${ss.length} shot</span></div>
      <div style="display:grid;gap:6px;min-width:0">
        <div class="row"><span class="pill" style="background:var(${LOAI_CANH[loai][1]});color:${['tho', 'mo'].includes(loai) ? 'var(--ink)' : '#fff'}">${LOAI_CANH[loai][0]}</span>
          <span class="tag">${q ? `Nhịp ${q.so} ${esc(q.ten)}` : esc(c.nhip || '')}</span>
          ${kh ? `<a class="tag" href="#/tham-khao/${encodeURIComponent(kh.tham_khao)}/${kh.canh}">Theo cảnh ${kh.canh} của khuôn ${esc(kh.ten || kh.tham_khao)} ↗</a>` : ''}</div>
        <h3>${esc(c.ten || '')} <span class="muted" style="font-weight:500">(${c.ma})</span></h3>
        ${c.muc_dich ? `<p style="margin:0">${esc(c.muc_dich)}</p>` : ''}
        ${nhan.length ? `<ul style="margin:0;padding-left:18px;display:grid;gap:3px">${nhan.slice(0, 9).map(([t, s, m]) => `<li><span class="muted" style="font-size:12.5px;margin-right:6px;font-variant-numeric:tabular-nums">${XP.tc(t, false)}</span>${esc(s)} <a class="muted" style="font-size:12px" href="#/tap/${encodeURIComponent(ma)}/kich-ban/${c.ma}">${m}</a></li>`).join('')}
          ${nhan.length > 9 ? `<li class="muted"><a href="#/tap/${encodeURIComponent(ma)}/kich-ban/${c.ma}">+ ${nhan.length - 9} điểm nữa trong tab Kịch bản</a></li>` : ''}</ul>` : '<p class="muted" style="margin:0">Cảnh không có thoại hay chữ – kể bằng hình.</p>'}
        ${nv.length ? `<div class="muted" style="font-size:13px">Nhân vật: ${nv.map(m => esc(ten[m] || m)).join(', ')}</div>` : ''}
        <div class="muted" style="font-size:13px">Kịch bản: ${cpm.toFixed(1).replace('.', ',')} cắt/phút · có lời ≈${lp.toFixed(0)}%${q ? ` · mục tiêu nhịp: ${q.cat_phut.join('–')} cắt/phút, ${q.loi_pct.join('–')}% lời` : ''}</div>
        ${day ? `<div class="row">${day}</div>` : ''}
      </div></article>`;
  }).join('');
}

function dongThoai(c, s) {
  return `<div class="line"><span class="who">${esc(c.vai)}${c.cam_xuc ? ` · ${esc(c.cam_xuc)}` : ''} · ${XP.tc(s.bat_dau + (+c.luc || 0))}</span><div>${esc(c.loi)}</div></div>`;
}

function tabKichBan(tap, r, body, ma, canhMo) {
  const {tl} = XP.timeline(tap);
  const ten = Object.fromEntries((tap.nhan_vat || []).map(n => [n.ma, n.ten]));
  body.innerHTML = `<div class="row"><button data-x="mo">Mở tất cả</button><button data-x="dong">Đóng tất cả</button></div>` +
    tap.canh.map((c, ci) => {
      const ss = tl.filter(s => s.chi_so_canh === ci && !s._ao);
      const bd = ss.length ? ss[0].bat_dau : 0;
      return `<details class="scene" id="canh-${c.ma}" ${canhMo === c.ma || (!canhMo && ci === 0) ? 'open' : ''}>
        <summary><span class="sc-no">${c.ma}</span><span><b>${esc(c.ten)}</b><br><span class="muted" style="font-size:13px">${esc(c.muc_dich || '')}</span></span>
          <span class="meta"><span>${XP.tc(bd, false)}</span><span class="tag">${esc(c.nhip || '')}</span><span>${ss.length} shot</span></span></summary>
        <div class="sc-body">${ss.map(s => `<div class="shot">
          <div class="st"><b>${s.ma}</b><span>${XP.tc(s.bat_dau)} · ${(+s.dai).toFixed(1)} s</span><span>${esc(s.co_canh || '')} · ${esc(s.goc || '')}</span><span>${esc(XP.CD_VI[s.chuyen_dong] || s.chuyen_dong)}</span>
            ${s.vao !== 'cat' ? `<span>${esc(XP.VAO_VI[s.vao])}</span>` : ''}${s.do ? '<span class="pill red" style="justify-self:start">đỏ sẫm</span>' : ''}</div>
          <div class="sb${s.do ? ' do-mark' : ''}" ${s.do ? 'style="padding-left:10px"' : ''}>
            <div>${esc(s.noi_dung || '')}</div>
            ${(s.nhan_vat || []).length ? `<div class="muted" style="font-size:13px">Nhân vật: ${s.nhan_vat.map(m => esc(ten[m] || m)).join(', ')}</div>` : ''}
            ${s.thoai.map(c => dongThoai(c, s)).join('')}
            ${(s.chu || []).map(x => `<div class="muted" style="font-size:13px">Chữ (${esc(x.kieu)}): “${esc((x.dong || []).join(' / '))}”</div>`).join('')}
            ${(s.am_thanh || []).length ? `<div class="muted" style="font-size:13px">Âm thanh: ${esc(s.am_thanh.join(', '))}</div>` : ''}
          </div></div>`).join('')}</div></details>`;
    }).join('');
  body.querySelector('[data-x="mo"]').onclick = () => body.querySelectorAll('details').forEach(d => d.open = true);
  body.querySelector('[data-x="dong"]').onclick = () => body.querySelectorAll('details').forEach(d => d.open = false);
  if (canhMo) setTimeout(() => document.getElementById(`canh-${canhMo}`)?.scrollIntoView({block: 'start'}), 50);
}

function tabPhieu(tap, r, body) {
  const {tl, tong} = XP.timeline(tap);
  let cur = null, html = `<p class="muted" style="margin:0">Dự án CapCut: ${tap.rong}×${tap.cao}, ${tap.fps} fps, tổng ${XP.tc(tong)}. Mốc <b>Bắt đầu</b> là vị trí đầu clip trên timeline. Keyframe đặt ở đầu và cuối mỗi clip. Âm lượng: giọng 0 dB, nhạc dưới giọng ≈ −16 dB (bật Ducking).</p>`;
  tl.forEach(s => {
    const c = s.canh;
    if (c.ma !== cur) {
      if (cur) html += '</div></details>';
      cur = c.ma;
      html += `<details class="scene" open><summary><span class="sc-no">${c.ma}</span><span><b>${esc(c.ten)}</b>${c.nhac ? `<br><span class="muted" style="font-size:13px">Nhạc: ${esc(c.nhac.file || '')} · ${c.nhac.am_luong_db ?? -12} dB · ${esc(c.nhac.ghi_chu || '')}</span>` : '<br><span class="muted" style="font-size:13px">Không nhạc</span>'}</span><span class="tag">${esc(c.nhip || '')}</span></summary><div class="sc-body">`;
    }
    if (s._ao) { html += `<div class="shot"><div class="st"><b>${XP.tc(s.bat_dau)}</b></div><div class="sb"><b>${s.loai === 'den' ? 'Màn đen' : 'Màn trắng'} ${(+s.dai).toFixed(1)} s</b><span class="muted">Media → Thư viện → màu ${s.loai === 'den' ? 'Đen' : 'Trắng'}; clip trước: Hoạt hình → Mờ dần ra 0,6 s.</span></div></div>`; return; }
    html += `<div class="shot"><div class="st"><b>${s.ma}</b><span>Bắt đầu ${XP.tc(s.bat_dau)}</span><span>Dài ${(+s.dai).toFixed(2)} s</span><span>${esc(s.co_canh || '')} ${esc(s.goc || '')}</span></div>
      <dl class="kv sb">
        <dt>Hình</dt><dd>${esc(s.noi_dung || '')}${s.do ? ' — <b style="color:var(--red)">có điểm đỏ sẫm</b>' : ''}</dd>
        <dt>File</dt><dd><code>${['den', 'trang'].includes(s.loai) ? `màu ${s.loai === 'den' ? 'đen' : 'trắng'} từ Thư viện` : esc(s.anh || XP.anhMacDinh(s))}</code></dd>
        <dt>Vào bằng</dt><dd>${esc(XP.VAO_VI[s.vao] || s.vao)} ${esc(XP.VAO_HD[s.vao] || '')}</dd>
        <dt>Chuyển động</dt><dd>${esc(XP.CD_VI[s.chuyen_dong] || s.chuyen_dong)}. ${esc(XP.keyframe(s))}</dd>
        ${(s.chu || []).map(x => `<dt>Chữ ${XP.tc(s.bat_dau + (+x.luc || 0))}</dt><dd>“${esc((x.dong || []).join(' / '))}” – ${esc(XP.CHU_HD[x.kieu] || x.kieu)}</dd>`).join('')}
        ${s.thoai.map(c => `<dt>Giọng ${XP.tc(s.bat_dau + (+c.luc || 0))}</dt><dd><code>${esc(c.file || `giong/${s.ma}_${c.vai}.wav`)}</code> ≈${c._dai.toFixed(1)} s – ${esc(c.vai)}: “${esc(c.loi)}”</dd>`).join('')}
        ${(s.am_thanh || []).length ? `<dt>Âm thanh</dt><dd>${esc(s.am_thanh.join(', '))}</dd>` : ''}
        ${(s.sfx || []).map(x => `<dt>SFX ${XP.tc(s.bat_dau + (+x.luc || 0))}</dt><dd><code>${esc(x.file)}</code> ${x.db || 0} dB</dd>`).join('')}
        ${s.ghi_chu ? `<dt>Ghi chú</dt><dd>${esc(s.ghi_chu)}</dd>` : ''}
      </dl></div>`;
  });
  body.innerHTML = html + '</div></details>';
}

function tabPrompt(tap, r, body) {
  const {tl} = XP.timeline(tap);
  const nv = Object.fromEntries((tap.nhan_vat || []).map(n => [n.ma, n]));
  const shots = tl.filter(s => !s._ao && ['anh', 'video'].includes(s.loai) && s.prompt);
  const tatCa = shots.map(s => `[${s.ma}] ${XP.promptDayDu(tap, s)} --ar 16:9`).join('\n\n');
  body.innerHTML = `
    <p class="muted" style="margin:0">Mỗi prompt đã ghép sẵn câu phong cách. Shot có nhân vật: đính kèm ảnh mẫu của nhân vật (Midjourney: <code>--cref &lt;link ảnh&gt; --cw 80</code>). Lưu ảnh đúng tên file ghi bên cạnh.</p>
    <div class="row"><button data-copy="${esc(tatCa)}">Chép tất cả ${shots.length} prompt</button></div>
    <h3>Sổ nhân vật (làm ảnh mẫu trước)</h3>
    <div class="grid-cards">${(tap.nhan_vat || []).filter(n => n.nhan_dang).map(n => {
      const p = `character reference sheet, ${n.nhan_dang}, front view, plain grey background, ${tap.phong_cach_prompt || XP.STYLE} --ar 16:9`;
      return `<div class="card"><b>${esc(n.ten)} <span class="tag">${esc(n.ma)}</span> ${n.loai === 'hư cấu' ? '<span class="tag">hư cấu</span>' : ''}</b>
        <span class="muted" style="font-size:13px">Lưu thành <code>${esc(n.anh_mau || `so_nhan_vat/${n.ma}.png`)}</code></span>
        <div class="prompt">${esc(p)}</div><button class="small" data-copy="${esc(p)}">Chép</button></div>`;
    }).join('')}</div>
    <h3>Prompt từng shot</h3>
    ${shots.map(s => {
      const p = `${XP.promptDayDu(tap, s)} --ar 16:9`;
      const ref = (s.nhan_vat || []).map(m => nv[m] ? `${nv[m].ten} (${nv[m].anh_mau || `so_nhan_vat/${m}.png`})` : m).join(', ');
      return `<div class="shot"><div class="st"><b>${s.ma}</b><span>${esc(s.co_canh || '')} ${esc(s.goc || '')}</span><span>lưu: <code>${esc(s.anh || XP.anhMacDinh(s))}</code></span>${s.do ? '<span class="pill red" style="justify-self:start">đỏ sẫm</span>' : ''}</div>
        <div class="sb"><span class="muted" style="font-size:13px">${esc(s.noi_dung || '')}${ref ? ` · ảnh mẫu: ${esc(ref)}` : ''}</span>
          <div class="prompt">${esc(p)}</div>
          ${s.tach_lop ? '<span class="muted" style="font-size:13px">+ Tạo thêm ảnh chỉ có nền (bỏ nhân vật, thêm "empty scene, no people") để làm parallax.</span>' : ''}
          <div><button class="small" data-copy="${esc(p)}">Chép prompt</button></div></div></div>`;
    }).join('')}`;
}

function tabDoc(tap, r, body) {
  const {tl} = XP.timeline(tap);
  const vai = {};
  tl.forEach(s => s.thoai.forEach(c => (vai[c.vai] = vai[c.vai] || []).push({s, c})));
  const nv = Object.fromEntries((tap.nhan_vat || []).map(n => [n.ma, n]));
  const loc = LS.get('xp_doc_loc', 'tat_ca');
  const ds = loc === 'tat_ca' ? tl.flatMap(s => s.thoai.map(c => ({s, c}))) : (vai[loc] || []);
  body.innerHTML = `
    <p class="muted" style="margin:0">Mỗi câu là một file giọng riêng. Dấu <code>/</code> ngắt 0,3 s, <code>//</code> ngắt 0,8 s. Tên file ghi sẵn; đọc xong lưu đúng tên vào thư mục <code>giong/</code>.</p>
    <div class="row"><label class="f" style="min-width:220px">Lọc theo vai<select id="loc"><option value="tat_ca">Tất cả (${tl.reduce((a, s) => a + s.thoai.length, 0)} câu)</option>
      ${Object.keys(vai).map(v => `<option value="${esc(v)}" ${v === loc ? 'selected' : ''}>${esc(nv[v]?.ten || v)} (${vai[v].length} câu)</option>`).join('')}</select></label></div>
    <div class="grid-cards">${Object.keys(vai).map(v => `<div class="card" style="gap:4px"><b>${esc(nv[v]?.ten || v)} <span class="tag">${esc(v)}</span></b><span class="muted" style="font-size:13px">${esc(nv[v]?.giong || '')}</span><span style="font-size:13px">${vai[v].length} câu · ≈${vai[v].reduce((a, x) => a + x.c._dai, 0).toFixed(0)} s</span></div>`).join('')}</div>
    <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>File</th><th>Vai</th><th class="num">Mốc</th><th>Lời</th><th>Cách đọc</th><th></th></tr></thead><tbody>
    ${ds.map(({s, c}) => `<tr><td><code>${esc(c.file || `giong/${s.ma}_${c.vai}.wav`)}</code></td><td>${esc(c.vai)}</td><td class="num">${XP.tc(s.bat_dau + (+c.luc || 0), false)}</td>
      <td>${esc(c.loi)}</td><td class="muted">${esc(c.cam_xuc || '')}</td><td><button class="small" data-copy="${esc(c.loi.replace(/\s*\/\/\s*/g, '… ').replace(/\s*\/\s*/g, ', '))}">Chép</button></td></tr>`).join('')}
    </tbody></table></div>`;
  $('#loc').onchange = e => { LS.set('xp_doc_loc', e.target.value); tabDoc(tap, r, body); };
}

function tabKiemTra(tap, r, body, ma) {
  const link = m => m && /^C\d+(_S\d+)?$/.test(m) ? `<a href="#/tap/${encodeURIComponent(ma)}/kich-ban/${m.split('_')[0]}">${m}</a>: ` : (m ? `${esc(m)}: ` : '');
  body.innerHTML = `
    <p class="muted" style="margin:0">So kịch bản với khung 12 nhịp đo từ 2 tập mẫu. Thời lượng lời là ước lượng (người dẫn 155 từ/phút, thoại 110 từ/phút); khi có file giọng thật, chạy <code>cong_cu/kiem_tra.py</code> trên máy để đo chính xác.</p>
    ${r.loi.length ? `<h3>Lỗi (phải sửa)</h3><div class="issues">${r.loi.map(x => `<div class="i e">${link(x.ma)}${esc(x.t)}</div>`).join('')}</div>` : '<p><span class="pill ok">0 lỗi</span></p>'}
    ${r.canhBao.length ? `<h3>Cảnh báo (nên xem)</h3><div class="issues">${r.canhBao.map(x => `<div class="i w">${link(x.ma)}${esc(x.t)}</div>`).join('')}</div>` : ''}
    <h3>So với khung 12 nhịp</h3>
    <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>Nhịp</th><th class="num">Vị trí</th><th class="num">Dài</th><th class="num">Cắt/phút (mục tiêu)</th><th class="num">Có lời (mục tiêu)</th><th>Cảnh</th></tr></thead><tbody>
    ${r.nhip.map(x => `<tr><td>${x.q ? `${x.q.so}. ${esc(x.q.ten)}` : esc(x.ma)}</td>
      <td class="num">${XP.tc(x.n.bd, false)} (${x.vt.toFixed(0)}%) ${x.lechVt ? '⚠' : ''}</td><td class="num">${x.n.dai.toFixed(0)} s</td>
      <td class="num">${x.cpm.toFixed(1)} ${x.q ? `(${x.q.cat_phut.join('–')})` : ''} ${x.lechCat ? '⚠' : ''}</td>
      <td class="num">${x.lp.toFixed(0)}% ${x.q ? `(${x.q.loi_pct.join('–')}%)` : ''} ${x.lechLoi ? '⚠' : ''}</td><td>${x.n.canh.join(', ')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function tabTienDo(tap, r, body) {
  const {tl} = XP.timeline(tap);
  const key = `xp_tien_do_${tap.ma_tap}`;
  const td = LS.get(key, {});
  const shots = tl.filter(s => !s._ao);
  const COT = [['anh', 'Ảnh'], ['giong', 'Giọng'], ['dung', 'Đã dựng']];
  const ve = () => {
    const pct = k => shots.length ? Math.round(shots.filter(s => td[s.ma]?.[k]).length / shots.length * 100) : 0;
    body.innerHTML = `
      <p class="muted" style="margin:0">Đánh dấu shot đã xong. Tiến độ lưu trong trình duyệt của máy này; dùng nút Xuất/Nhập để chuyển sang máy khác.</p>
      <div class="grid-cards">${COT.map(([k, t]) => `<div class="card"><b>${t}: ${pct(k)}%</b><div class="progress"><i style="width:${pct(k)}%"></i></div></div>`).join('')}</div>
      <div class="row"><button data-x="xuat">Xuất tiến độ</button><label class="btn">Nhập tiến độ<input type="file" accept=".json" id="nhap" hidden></label></div>
      ${tap.canh.map((c, ci) => {
        const ss = shots.filter(s => s.chi_so_canh === ci);
        const xong = ss.filter(s => COT.every(([k]) => td[s.ma]?.[k])).length;
        return `<details class="scene"><summary><span class="sc-no">${c.ma}</span><span><b>${esc(c.ten)}</b></span><span class="meta"><span>${xong}/${ss.length} shot xong</span></span></summary>
          <div class="sc-body"><table><thead><tr><th>Shot</th><th>Nội dung</th>${COT.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead><tbody>
          ${ss.map(s => `<tr><td>${s.ma}</td><td>${esc(s.noi_dung || '')}</td>${COT.map(([k]) => `<td><input type="checkbox" aria-label="${k} ${s.ma}" data-ma="${s.ma}" data-k="${k}" ${td[s.ma]?.[k] ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}
          </tbody></table></div></details>`;
      }).join('')}`;
    body.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
      td[cb.dataset.ma] = td[cb.dataset.ma] || {};
      td[cb.dataset.ma][cb.dataset.k] = cb.checked;
      LS.set(key, td);
      const open = [...body.querySelectorAll('details')].map(d => d.open);
      ve();
      body.querySelectorAll('details').forEach((d, i) => d.open = open[i]);
    });
    body.querySelector('[data-x="xuat"]').onclick = () => taiFile(`tien_do_${tap.ma_tap}.json`, JSON.stringify(td));
    body.querySelector('#nhap').onchange = async e => {
      try { Object.assign(td, JSON.parse(await e.target.files[0].text())); LS.set(key, td); ve(); toast('Đã nhập tiến độ'); }
      catch (err) { toast('File tiến độ không đọc được'); }
    };
  };
  ve();
}

// ---------------------------------------------------------------- quy chuẩn
const DOCS = [['khung', 'Khung 12 nhịp'], ['huong-dan', 'Hướng dẫn làm video'], ['dinh-dang', 'Định dạng tap.json'], ['quy-trinh', 'Quy trình trên web']];
async function trangQuyChuan(doc = 'khung') {
  APP.innerHTML = `<section class="panel"><h1>Quy chuẩn &amp; hướng dẫn</h1>
    <nav class="tabs">${DOCS.map(([k, t]) => `<a class="tab" aria-selected="${k === doc}" href="#/quy-chuan/${k}">${t}</a>`).join('')}</nav><div id="docbody" class="doc-wrap"></div></section>`;
  const b = $('#docbody');
  if (doc === 'khung') {
    const K = await khung();
    b.innerHTML = `<p class="lead">Mỗi tập đi qua 12 nhịp. Vị trí tính theo % tổng thời lượng; nhịp cắt và % có lời là khoảng đo được từ 2 tập mẫu (Lũy Thầy 20:22, Đa Bang 22:02).</p>
      <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>#</th><th>Nhịp (mã)</th><th class="num">Vị trí</th><th class="num">Cắt/phút</th><th class="num">Có lời</th><th>Việc phải làm</th><th>Đo từ nguồn</th></tr></thead><tbody>
      ${K.nhip.map(n => `<tr><td>${n.so}</td><td><b>${esc(n.ten)}</b><br><code>${n.ma}</code></td><td class="num">${n.vi_tri_pct.join('–')}%</td><td class="num">${n.cat_phut.join('–')}</td><td class="num">${n.loi_pct.join('–')}%</td><td>${esc(n.viec)}</td><td class="muted">${esc(n.nguon)}</td></tr>`).join('')}
      </tbody></table></div>
      <h3>Toàn phim</h3><ul>${Object.entries(K.toan_phim).map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(JSON.stringify(v.muc_tieu || v))}${v.nguon ? ` <span class="muted">(${esc(v.nguon)})</span>` : ''}</li>`).join('')}</ul>`;
  } else if (doc === 'quy-trinh') {
    b.innerHTML = `<div class="doc">${marked.parse(QUY_TRINH)}</div>`;
  } else {
    const f = {'huong-dan': 'quy_chuan/huong_dan_lam_video.md', 'dinh-dang': 'quy_chuan/dinh_dang_tap.md'}[doc];
    b.innerHTML = `<div class="doc">${marked.parse(await lay(f, 'text'))}</div>`;
  }
}
const QUY_TRINH = `
## Làm một tập mới chỉ bằng web

1. **Soạn tập** → *Tạo tập mới*: nhập mã (không dấu, ví dụ \`T02_bach_dang\`), tên tập, số phút. Web dựng sẵn 12 nhịp, mỗi nhịp có số shot và thời lượng gợi ý.
2. Điền **thông tin chung**: câu chủ đề, giọng phản đề, vật dẫn đường, nhân vật (mã viết hoa không dấu, dấu hiệu nhận diện để đưa vào prompt).
3. Viết từng **cảnh** và **shot**: độ dài, cỡ cảnh, góc, chuyển động, nội dung, prompt ảnh (tiếng Anh), thoại (mỗi câu một dòng, \`/\` ngắt 0,3 s, \`//\` ngắt 0,8 s), chữ trên hình.
4. Khai báo **gieo – trả**: mỗi đường dây gồm shot gieo, shot nhắc, shot trả.
5. Nhìn bảng **kiểm tra** bên phải: sửa đến khi *0 lỗi*; cảnh báo về nhịp thì chỉnh độ dài/số shot.
6. **Lưu**: bản nháp tự lưu trong trình duyệt. Bấm *Tải tap.json* để có file.
7. **Đưa lên xưởng**: trên GitHub, mở repo \`XUONG_PHIM\` → thư mục \`tap\` → *Add file → Upload files* → kéo thư mục \`T02_…\` chứa \`tap.json\` (hoặc tạo file \`tap/T02_…/tap.json\` rồi dán nội dung) → *Commit changes*. Vercel tự cập nhật web sau khoảng 1 phút; tập mới hiện ở trang *Các tập*.

## Sản xuất từ một tập đã có

| Bước | Tab trên web |
|---|---|
| Làm ảnh mẫu nhân vật | Prompt ảnh → Sổ nhân vật |
| Thu giọng AI từng câu | Kịch bản đọc (tên file ghi sẵn) |
| Tạo ảnh từng shot | Prompt ảnh |
| Dựng CapCut | Phiếu dựng (mốc, keyframe, chuyển cảnh, chữ, âm thanh) |
| Đánh dấu tiến độ | Tiến độ |
| Kỹ thuật: CapCut, màu, âm thanh, xuất file | Quy chuẩn → Hướng dẫn làm video |

## Việc vẫn cần máy tính (không bắt buộc)

- **Animatic** (video nháp tự ráp từ ảnh + giọng): \`python cong_cu/dung_animatic.py tap/<mã>\` trong repo trên máy.
- **Đo thời lượng giọng thật**: \`python cong_cu/kiem_tra.py tap/<mã>\` (web chỉ ước lượng theo số từ).
`;

// ---------------------------------------------------------------- định tuyến
async function route() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
  document.querySelectorAll('[data-nav]').forEach(a => a.removeAttribute('aria-current'));
  const nav = k => document.querySelector(`[data-nav="${k}"]`)?.setAttribute('aria-current', 'page');
  try {
    if (h[0] === 'tap' && h[1]) { nav('home'); await trangTap(h[1], h[2] || 'tuyen', h[3]); }
    else if (h[0] === 'tham-khao') { nav('tk'); await TK.mo(APP, h[1], h[2]); }
    else if (h[0] === 'soan') { nav('soan'); await SOAN.mo(APP, h[1]); }
    else if (h[0] === 'quy-chuan') { nav('quy'); await trangQuyChuan(h[1] || 'khung'); }
    else { nav('home'); await trangChu(); }
  } catch (e) {
    APP.innerHTML = `<section class="panel"><h2>Không mở được trang</h2><p>${esc(e.message)}</p><p><a href="#/">Về trang chủ</a></p></section>`;
  }
  if (!h[3] && !(h[0] === 'tham-khao' && h[2])) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
