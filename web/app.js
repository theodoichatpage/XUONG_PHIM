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
const khoBienThe = () => lay('quy_chuan/kho_bien_the.json');
// Dữ liệu để so lặp công thức: kho biến thể + mọi tập VOX + phim tham khảo
async function ngoaiKiemTra() {
  const [kho, ds, tk] = await Promise.all([khoBienThe(), lay('tap/danh_sach.json').catch(() => []), lay('tham_khao/danh_sach.json').catch(() => [])]);
  return {kho, khac: [
    ...ds.map(d => ({ma: d.ma_tap, ten: `Tập ${d.ma_tap}`, bien_the: d.bien_the, chuoi_nhip: d.chuoi_nhip})),
    ...tk.map(d => ({ma: 'tk:' + d.ma, ten: `Tham khảo: ${d.ten}`, bien_the: d.bien_the, chuoi_nhip: d.chuoi_nhip}))]};
}

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
    ${[...new Set(tk.map(t => t.series))].map(se => `<h3>${esc(se)}</h3><div class="grid-cards">${tk.filter(t => t.series === se).map(t => `<a class="card" href="#/tham-khao/${encodeURIComponent(t.ma)}">
        <span class="tag">${esc(t.nhan)} · đăng ${esc(t.dang.split('-').reverse().join('/'))}</span><h3>${esc(t.ten)}</h3>
        <div class="meta"><span>Dài <b>${XP.tc(t.dai_s, false)}</b></span><span>Cảnh <b>${t.so_canh}</b></span><span>Đường dây <b>${t.so_day}</b></span></div>
        <p class="muted" style="margin:0;font-size:13px">${esc(t.boi_canh)}</p></a>`).join('')}</div>`).join('')}
      <div class="grid-cards"><a class="card" href="#/tham-khao/so-sanh"><span class="tag">Đối chiếu</span><h3>Hai tập trên cùng khung 12 nhịp</h3>
        <p class="muted" style="margin:0;font-size:13px">Đa Bang Hồi 2 và Lũy Thầy đặt cạnh nhau theo 12 nhịp; công thức rút ra.</p></a></div>` : ''}`;
}

// ---------------------------------------------------------------- trang tập
const TABS = [['tuyen', 'Tuyến phim'], ['kich-ban', 'Kịch bản'], ['phieu-dung', 'Phiếu dựng'], ['goi-anh', 'Gói ảnh'], ['am-thanh', 'Âm thanh'],
  ['doc', 'Kịch bản đọc'], ['kiem-tra', 'Kiểm tra'], ['tien-do', 'Tiến độ']];

async function trangTap(ma, tab = 'tuyen', canhMo) {
  const K = await khung();
  const tap = ma === '__nhap__' ? LS.get('xp_ban_nhap', null) : await lay(`tap/${ma}/tap.json`);
  if (!tap) { APP.innerHTML = '<p>Không có bản nháp nào trên máy này.</p>'; return; }
  XP.chuan(tap);
  const NG = await ngoaiKiemTra();
  const r = XP.kiemTra(tap, K, NG);
  r.kho = NG.kho;
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
  ({tuyen: tabTuyen, 'kich-ban': tabKichBan, 'phieu-dung': tabPhieu, 'goi-anh': tabGoiAnh, 'am-thanh': tabAmThanh, doc: tabDoc, 'kiem-tra': tabKiemTra, 'tien-do': tabTienDo}[tab] || tabTuyen)(tap, r, body, ma, canhMo);
}

function tabTuyen(tap, r, body, ma) {
  body.innerHTML = `
    <div class="legend">${VE.chuGiai()}</div>
    <div class="scroll sodo" id="sv"></div>
    <p class="muted" style="font-size:13px;margin:0">Sơ đồ tự vẽ từ kịch bản. Bấm một cảnh để đọc kịch bản cảnh đó. Ô đặc: nhân vật có trong hình; ô mờ: chỉ có giọng.</p>
    <h3>Đường dây gieo → trả</h3>
    <div class="grid-cards" id="gt"></div>
    <div class="cot2">
    <div class="cot"><h3>Đọc dọc từng cảnh</h3>
    <div style="display:grid;gap:10px">${theCanh(tap, r, ma)}</div></div>
    <div class="cot cot-dinh"><h3>Bảng tóm tắt cảnh</h3>
    <div class="scroll" style="background:var(--paper)"><table class="gon"><thead><tr><th>Cảnh</th><th>Tên</th><th>Nhịp</th><th class="num">Vào</th><th class="num">Dài</th><th class="num">Shot</th><th class="num">Cắt/phút</th><th class="num">Từ thoại</th><th>Mục đích</th></tr></thead>
    <tbody>${r.bang.map(b => {
      const c = tap.canh.find(x => x.ma === b.ma) || {};
      return `<tr><td><a href="#/tap/${encodeURIComponent(ma)}/kich-ban/${b.ma}">${b.ma}</a></td><td>${esc(b.ten)}</td><td><span class="tag">${esc(b.nhip)}</span></td>
        <td class="num">${XP.tc(b.bd, false)}</td><td class="num">${b.dai.toFixed(0)} s</td><td class="num">${b.ns}</td><td class="num">${(b.cat / b.dai * 60).toFixed(1)}</td><td class="num">${b.tu}</td><td>${esc(c.muc_dich || '')}</td></tr>`;
    }).join('')}</tbody></table></div></div></div>`;
  VE.vuaKhung($('#sv'), w => VE.tuyenPhim(tap, null, cm => {
    const card = document.getElementById(`tc-${cm}`);
    if (card) { card.scrollIntoView({block: 'center'}); card.classList.add('hl'); setTimeout(() => card.classList.remove('hl'), 1600); }
  }, w));
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
      html += `<details class="scene" open><summary><span class="sc-no">${c.ma}</span><span><b>${esc(c.ten)}</b>${c.nhac ? `<br><span class="muted" style="font-size:13px">Nhạc: ${esc(c.nhac.file || '')} · ${c.nhac.am_luong_db ?? -12} dB · ${esc(c.nhac.ghi_chu || '')}</span>` : '<br><span class="muted" style="font-size:13px">Không nhạc</span>'}${c.nen_am ? `<br><span class="muted" style="font-size:13px">Nền âm: ${esc(c.nen_am.file || '')} · ${esc(c.nen_am.mo_ta || '')} · ${c.nen_am.am_luong_db ?? -22} dB</span>` : ''}</span><span class="tag">${esc(c.nhip || '')}</span></summary><div class="sc-body">`;
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

function tabGoiAnh(tap, r, body, ma) {
  const g = GOIANH.tao(tap, ma === '__nhap__' ? '' : `${location.origin}/tap/${ma}/tap.json`);
  const link = ma === '__nhap__' ? '' : `${location.origin}/tap/${encodeURIComponent(ma)}/goi_anh.json`;
  const mdShot = s => GOIANH.markdown(Object.assign({}, g, {shot: [s], nhan_vat: []})).split('## Shot')[1].trim();
  body.innerHTML = `
    <p class="muted" style="margin:0">Kịch bản chi tiết từng shot để gửi cho công cụ tạo ảnh (Man). Gói chỉ mô tả <b>nội dung</b>: thấy gì, ai, làm gì, khung hình, bối cảnh, liên tục, tên file và kích thước. Prompt và phong cách do Man tự dựng theo quy định của Man.</p>
    <div class="grid-cards">
      <div class="card"><b>${g.thong_ke.so_shot_can_anh} shot cần ảnh</b><span class="muted" style="font-size:13px">${g.thong_ke.so_nhan_vat} nhân vật · ${g.thong_ke.so_shot_do_sam} shot đỏ sẫm · ${g.thong_ke.so_shot_den_trang} shot đen trắng · ${g.thong_ke.so_anh_nen} ảnh nền tách lớp</span></div>
      <div class="card"><b>Tải gói ảnh</b><div class="row"><button class="primary" data-x="json">JSON (cho Man)</button><button data-x="md">Markdown</button><button data-x="csv">Excel</button></div></div>
      ${link ? `<div class="card"><b>Link cố định cho Man</b><span class="muted" style="font-size:12.5px;overflow-wrap:anywhere">${esc(link)}</span><div class="row"><button class="small" data-copy="${esc(link)}">Chép link</button></div><span class="muted" style="font-size:12px">Luôn khớp với kịch bản mới nhất trên GitHub (Vercel tự xuất lại khi có thay đổi).</span></div>` : '<div class="card"><b>Bản nháp</b><span class="muted" style="font-size:13px">Chưa có link cố định. Tải JSON để gửi, hoặc đưa tap.json lên GitHub.</span></div>'}
    </div>
    <h3>Nhân vật (làm ảnh mẫu trước)</h3>
    <div class="grid-cards">${g.nhan_vat.map(n => `<div class="card" style="gap:4px"><b>${esc(n.ten)} <span class="tag">${esc(n.ma)}</span>${n.loai === 'hư cấu' ? ' <span class="tag">hư cấu</span>' : ''}</b>
      <span class="muted" style="font-size:13px">${n.so_shot} shot · xuất hiện đầu ở ${esc(n.shot_dau_tien || '')} · ảnh mẫu <code>${esc(n.anh_mau)}</code></span><span style="font-size:13px">${esc(n.dac_diem_en)}</span></div>`).join('')}</div>
    <div class="row"><button data-x="mo">Mở tất cả cảnh</button><button data-x="dong">Đóng tất cả</button></div>
    ${tap.canh.map(c => {
      const ss = g.shot.filter(s => s.canh === c.ma);
      if (!ss.length) return '';
      return `<details class="scene"><summary><span class="sc-no">${c.ma}</span><span><b>${esc(c.ten || '')}</b><br><span class="muted" style="font-size:13px">${esc([ss[0].boi_canh.thoi_diem, ss[0].boi_canh.dia_diem].filter(Boolean).join(' · '))}</span></span><span class="meta"><span>${ss.length} ảnh</span></span></summary>
        <div class="sc-body">${ss.map(s => `<div class="shot">
          <div class="st"><b>${s.ma}</b><span>${esc(s.khung_hinh.co_canh)} · ${s.dai_s} s</span><span><code>${esc(s.file)}</code></span><span>khuyên ${esc(s.dung.khuyen)}</span>
            ${s.do_sam ? '<span class="pill red" style="justify-self:start">đỏ sẫm</span>' : ''}${s.den_trang ? '<span class="tag" style="justify-self:start">đen trắng</span>' : ''}</div>
          <dl class="kv sb">
            <dt>Hình</dt><dd>${esc(s.mo_ta)}</dd>
            ${s.noi_dung_en ? `<dt>Nội dung (EN)</dt><dd class="muted">${esc(s.noi_dung_en)}</dd>` : ''}
            <dt>Khung hình</dt><dd>${esc(s.khung_hinh.goc_may)} · ${esc(s.khung_hinh.ong_kinh)}. ${esc(s.khung_hinh.bo_cuc)}</dd>
            ${s.boi_canh.anh_sang ? `<dt>Ánh sáng</dt><dd>${esc(s.boi_canh.anh_sang)}</dd>` : ''}
            ${s.nhan_vat.length ? `<dt>Nhân vật</dt><dd>${s.nhan_vat.map(n => `${esc(n.ten)} (<code>${esc(n.anh_mau)}</code>)`).join(', ')}</dd>` : ''}
            ${s.thoai_trong_shot.length ? `<dt>Thoại (biểu cảm)</dt><dd>${s.thoai_trong_shot.map(esc).join('<br>')}</dd>` : ''}
            ${s.ghi_chu_truyen.length ? `<dt>Ghi chú truyện</dt><dd>${esc(s.ghi_chu_truyen.join(' '))}</dd>` : ''}
            ${s.lien_tuc.ghi_chu.length ? `<dt>Liên tục</dt><dd>${esc(s.lien_tuc.ghi_chu.join(' '))}</dd>` : ''}
            <dt>Dựng</dt><dd>${esc(s.dung.chuyen_dong_may)}. ${esc(s.dung.le_an_toan)}</dd>
            ${s.anh_nen.can ? `<dt>Ảnh nền</dt><dd><code>${esc(s.anh_nen.file)}</code> – ${esc(s.anh_nen.mo_ta)}</dd>` : ''}
            <dt></dt><dd><button class="small" data-copy="${esc(mdShot(s))}">Chép mô tả shot</button></dd>
          </dl></div>`).join('')}</div></details>`;
    }).join('')}`;
  body.querySelector('[data-x="json"]').onclick = () => taiFile(`${tap.ma_tap}_goi_anh.json`, JSON.stringify(g, null, 1));
  body.querySelector('[data-x="md"]').onclick = () => taiFile(`${tap.ma_tap}_goi_anh.md`, GOIANH.markdown(g), 'text/markdown');
  body.querySelector('[data-x="csv"]').onclick = () => taiFile(`${tap.ma_tap}_goi_anh.csv`, GOIANH.csv(g), 'text/csv');
  body.querySelector('[data-x="mo"]').onclick = () => body.querySelectorAll('details').forEach(d => d.open = true);
  body.querySelector('[data-x="dong"]').onclick = () => body.querySelectorAll('details').forEach(d => d.open = false);
}

// ---------------------------------------------------------------- âm thanh: nhạc (prompt Suno), nền âm, hiệu ứng
function goiAmThanh(tap, r) {
  const {tl} = XP.timeline(tap);
  const moc = Object.fromEntries(r.bang.map(b => [b.ma, b]));
  const nhac = (tap.bang_nhac || []).map(n => {
    const dung = tap.canh.filter(c => c.nhac && c.nhac.file === n.file && moc[c.ma]).map(c => {
      const b = moc[c.ma], vao = b.bd + (+c.nhac.luc || 0);
      return {canh: c.ma, ten: c.ten, vao, ra: b.kt, dai: b.kt - vao, db: c.nhac.am_luong_db ?? -12, ghi_chu: c.nhac.ghi_chu || ''};
    });
    return Object.assign({}, n, {dung_o: dung, can_s: Math.ceil(Math.max(0, ...dung.map(d => d.dai)) + 10)});
  });
  const chuaCo = tap.canh.filter(c => c.nhac && c.nhac.file && !nhac.some(n => n.file === c.nhac.file)).map(c => c.nhac.file);
  const nen = tap.canh.filter(c => c.nen_am && moc[c.ma]).map(c => Object.assign({canh: c.ma, ten: c.ten, vao: moc[c.ma].bd, ra: moc[c.ma].kt}, c.nen_am));
  const kho = tap.kho_sfx || {};
  const sfx = [];
  tl.filter(s => !s._ao).forEach(s => (s.sfx || []).forEach(x => sfx.push({t: s.bat_dau + (+x.luc || 0), shot: s.ma, ten: x.ten || x.file, file: x.file, db: x.db ?? 0, tim: (kho[x.ten] || {}).tim || ''})));
  return {nhac, chuaCo, nen, sfx};
}
const timPixabay = k => `https://pixabay.com/sound-effects/search/${encodeURIComponent(k)}/`;
const timFreesound = k => `https://freesound.org/search/?q=${encodeURIComponent(k)}&f=license:%22Creative+Commons+0%22`;

function amThanhMd(tap, A) {
  const F = '```';
  const L = [`# Âm thanh – ${tap.tieu_de}`, '', '## Nhạc (làm bằng Suno, chế độ Custom)', ''];
  A.nhac.forEach(n => {
    L.push(`### ${n.ten} → ${n.file}`, '', `- Dùng ở: ${n.dung_o.map(d => `${d.canh} ${XP.tc(d.vao, false)}–${XP.tc(d.ra, false)} (${Math.round(d.dai)} s, ${d.db} dB)`).join('; ') || 'chưa gắn cảnh'}`,
      `- Cần dài ít nhất: ${n.can_s} s`, `- Cách dùng: ${n.dung || ''}`, `- ${n.khong_loi ? 'Bật Instrumental (không lời)' : 'Có lời – dán phần Lyrics'}`, '', 'Style of Music:', F, n.style, F);
    if (!n.khong_loi && n.loi) L.push('', 'Lyrics:', F, n.loi, F);
    L.push('');
  });
  L.push('## Nền âm từng cảnh (lặp suốt cảnh)', '', '| Cảnh | Mốc | File | Âm | Từ khóa tìm | dB |', '|---|---|---|---|---|---|');
  A.nen.forEach(x => L.push(`| ${x.canh} | ${XP.tc(x.vao, false)}–${XP.tc(x.ra, false)} | ${x.file} | ${x.mo_ta} | ${x.tim || ''} | ${x.am_luong_db ?? -22} |`));
  L.push('', '## Hiệu ứng theo mốc giờ', '', '| Mốc | Shot | Hiệu ứng | File | dB | Từ khóa tìm |', '|---|---|---|---|---|---|');
  A.sfx.forEach(x => L.push(`| ${XP.tc(x.t)} | ${x.shot} | ${x.ten} | ${x.file} | ${x.db} | ${x.tim} |`));
  return L.join('\n') + '\n';
}
function amThanhCsv(A) {
  const rows = [['Mốc', 'Shot', 'Hiệu ứng', 'File', 'dB', 'Từ khóa tìm']].concat(A.sfx.map(x => [XP.tc(x.t), x.shot, x.ten, x.file, x.db, x.tim]));
  return '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

function tabAmThanh(tap, r, body) {
  const A = goiAmThanh(tap, r);
  const tenFile = f => f.split('/').pop();
  const tim = k => k ? `<a href="${timPixabay(k)}" target="_blank" rel="noopener">Pixabay</a> · <a href="${timFreesound(k)}" target="_blank" rel="noopener">Freesound</a>` : '';
  const dsFile = [...new Set(A.sfx.map(x => x.file))];
  body.innerHTML = `
    <p class="muted" style="margin:0">Nhạc, nền âm và hiệu ứng cho từng đoạn, kèm mốc giờ. Nhạc làm bằng Suno theo prompt bên dưới; hiệu ứng và nền âm lấy từ thư viện miễn phí. Đặt file đúng tên vào thư mục <code>am_thanh/</code> của tập thì animatic tự trộn.</p>
    <div class="grid-cards">
      <div class="card"><b>${A.nhac.length} đoạn nhạc</b><span class="muted" style="font-size:13px">${A.nhac.filter(n => !n.khong_loi).length} bài có lời · ${A.nen.length} nền âm · ${dsFile.length} file hiệu ứng (${A.sfx.length} lần dùng)</span></div>
      <div class="card"><b>Tải về</b><div class="row"><button class="primary" data-x="md">Gói âm thanh (Markdown)</button><button data-x="csv">Hiệu ứng (Excel)</button></div></div>
      <div class="card" style="gap:4px"><b>Làm nhạc bằng Suno</b><span style="font-size:13px">Create → Custom → dán <i>Style of Music</i>. Đoạn không lời bật <i>Instrumental</i>; bài có lời dán <i>Lyrics</i>. Tạo 2 bản, chọn bản hợp; thiếu độ dài thì <i>Extend</i>. Tải MP3, đổi tên đúng file.</span>
        <span class="muted" style="font-size:12px">Đăng YouTube có kiếm tiền: tạo bài khi đang dùng gói Suno trả phí (gói miễn phí không cho dùng thương mại). Nên đọc lại điều khoản Suno hiện hành.</span></div>
    </div>
    ${A.chuaCo.length ? `<div class="issues">${A.chuaCo.map(f => `<div class="i w">Cảnh dùng <code>${esc(f)}</code> nhưng bảng nhạc chưa có prompt cho file này.</div>`).join('')}</div>` : ''}
    <h3>Nhạc nền và bài hát</h3>
    <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(min(420px,100%),1fr))">${A.nhac.map(n => `<div class="card" style="gap:6px;align-content:start">
      <div class="row" style="justify-content:space-between"><b>${esc(n.ten)} <code>${esc(tenFile(n.file))}</code></b>
        <span>${n.khong_loi ? '<span class="tag">Không lời · bật Instrumental</span>' : '<span class="pill red">Có lời</span>'} <span class="tag">cần ≥ ${n.can_s} s</span></span></div>
      <div class="muted" style="font-size:13px">${n.dung_o.map(d => `<b>${d.canh}</b> ${XP.tc(d.vao, false)}–${XP.tc(d.ra, false)} · ${Math.round(d.dai)} s · ${d.db} dB`).join('<br>') || 'Chưa gắn vào cảnh nào'}</div>
      <div style="font-size:13.5px">${esc(n.dung || '')}</div>
      <div class="muted" style="font-size:12px;font-weight:600">STYLE OF MUSIC</div><div class="prompt">${esc(n.style)}</div>
      ${!n.khong_loi && n.loi ? `<div class="muted" style="font-size:12px;font-weight:600">LYRICS</div><div class="prompt" style="max-height:260px;overflow:auto">${esc(n.loi)}</div>` : ''}
      <div class="row"><button class="small" data-copy="${esc(n.style)}">Chép Style</button>${!n.khong_loi && n.loi ? `<button class="small" data-copy="${esc(n.loi)}">Chép Lyrics</button>` : ''}<button class="small" data-copy="${esc(n.ten)}">Chép tên bài</button></div>
    </div>`).join('')}</div>
    <div class="cot2">
      <div class="cot"><h3>Nền âm từng cảnh</h3>
        <div class="scroll" style="background:var(--paper)"><table class="gon"><thead><tr><th>Cảnh</th><th class="num">Mốc</th><th>Âm</th><th>File</th><th class="num">dB</th><th>Tìm</th></tr></thead><tbody>
        ${A.nen.map(x => `<tr><td>${x.canh}</td><td class="num">${XP.tc(x.vao, false)}–${XP.tc(x.ra, false)}</td><td>${esc(x.mo_ta)}</td><td><code>${esc(tenFile(x.file))}</code></td><td class="num">${x.am_luong_db ?? -22}</td><td>${tim(x.tim)}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="muted" style="font-size:12.5px;margin:0">Nền âm đặt rất nhỏ (−20 đến −24 dB), lặp suốt cảnh, mờ vào/ra 1 s ở đầu và cuối cảnh.</p></div>
      <div class="cot"><h3>Hiệu ứng theo mốc giờ</h3>
        <div class="scroll" style="background:var(--paper);max-height:620px;overflow:auto"><table class="gon"><thead><tr><th class="num">Mốc</th><th>Shot</th><th>Hiệu ứng</th><th>File</th><th class="num">dB</th><th>Tìm</th></tr></thead><tbody>
        ${A.sfx.map(x => `<tr><td class="num">${XP.tc(x.t)}</td><td>${x.shot}</td><td>${esc(x.ten)}</td><td><code>${esc(tenFile(x.file))}</code></td><td class="num">${x.db}</td><td>${tim(x.tim)}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="muted" style="font-size:12.5px;margin:0">Pixabay: được dùng thương mại, không cần ghi nguồn. Freesound: link đã lọc sẵn CC0; nếu lấy file giấy phép khác thì ghi nguồn ở credit.</p></div>
    </div>`;
  body.querySelector('[data-x="md"]').onclick = () => taiFile(`${tap.ma_tap}_am_thanh.md`, amThanhMd(tap, A), 'text/markdown');
  body.querySelector('[data-x="csv"]').onclick = () => taiFile(`${tap.ma_tap}_hieu_ung.csv`, amThanhCsv(A), 'text/csv');
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
    <p class="muted" style="margin:0">Khung 12 nhịp và các phim tham khảo chỉ để học, không phải khuôn: mỗi tập nên có tổ hợp biến thể và thứ tự nhịp của riêng mình. Độ lệch so với khung chỉ là ghi chú. Thời lượng lời là ước lượng (người dẫn 155 từ/phút, thoại 110 từ/phút); khi có file giọng thật, chạy <code>cong_cu/kiem_tra.py</code> trên máy để đo chính xác.</p>
    ${r.loi.length ? `<h3>Lỗi (phải sửa)</h3><div class="issues">${r.loi.map(x => `<div class="i e">${link(x.ma)}${esc(x.t)}</div>`).join('')}</div>` : '<p><span class="pill ok">0 lỗi</span></p>'}
    ${r.canhBao.length ? `<h3>Cảnh báo (nên xem)</h3><div class="issues">${r.canhBao.map(x => `<div class="i w">${link(x.ma)}${esc(x.t)}</div>`).join('')}</div>` : ''}
    ${bangLap(tap, r)}
    ${r.ghiChu.length ? `<h3>Ghi chú so với khung 12 nhịp (tham khảo, không bắt buộc)</h3><div class="issues">${r.ghiChu.map(x => `<div class="i">${link(x.ma)}${esc(x.t)}</div>`).join('')}</div>` : ''}
    <h3>So với khung 12 nhịp (tham khảo)</h3>
    <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>Nhịp</th><th class="num">Vị trí</th><th class="num">Dài</th><th class="num">Cắt/phút (mục tiêu)</th><th class="num">Có lời (mục tiêu)</th><th>Cảnh</th></tr></thead><tbody>
    ${r.nhip.map(x => `<tr><td>${x.q ? `${x.q.so}. ${esc(x.q.ten)}` : esc(x.ma)}</td>
      <td class="num">${XP.tc(x.n.bd, false)} (${x.vt.toFixed(0)}%) ${x.lechVt ? '⚠' : ''}</td><td class="num">${x.n.dai.toFixed(0)} s</td>
      <td class="num">${x.cpm.toFixed(1)} ${x.q ? `(${x.q.cat_phut.join('–')})` : ''} ${x.lechCat ? '⚠' : ''}</td>
      <td class="num">${x.lp.toFixed(0)}% ${x.q ? `(${x.q.loi_pct.join('–')}%)` : ''} ${x.lechLoi ? '⚠' : ''}</td><td>${x.n.canh.join(', ')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

// Bảng biến thể của tập + mức lặp với tập khác / phim tham khảo
function bangLap(tap, r) {
  if (!r.kho) return '';
  const bt = tap.bien_the || {};
  const ten = (c, m) => (c.lua_chon.find(x => x.ma === m) || {ten: m}).ten;
  const giaTri = c => { const v = bt[c.ma]; if (!v || (Array.isArray(v) && !v.length)) return '<span class="muted">chưa chọn</span>'; return [].concat(v).map(m => esc(ten(c, m))).join(', '); };
  const lap = r.lap.filter(x => x.ma);
  return `<h3>Biến thể của tập</h3>
    <div class="scroll" style="background:var(--paper)"><table><tbody>${r.kho.chieu.map(c => `<tr><td><b>${esc(c.ten)}</b></td><td>${giaTri(c)}</td></tr>`).join('')}</tbody></table></div>
    ${lap.length ? `<h3>Lặp công thức với tập khác / phim tham khảo</h3>
    <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>So với</th><th class="num">Trùng biến thể</th><th>Chiều trùng</th><th class="num">Thứ tự nhịp giống</th></tr></thead><tbody>
    ${lap.map(x => `<tr><td>${x.canhBao ? '⚠ ' : ''}${esc(x.ten)}</td><td class="num">${x.trung.length}/${x.soChieu}</td><td>${esc(x.chieuTrung.join(', ')) || '–'}</td><td class="num">${x.ct.toFixed(0)}%</td></tr>`).join('')}
    </tbody></table></div>` : ''}
    <p class="muted" style="font-size:13px">Cảnh báo khi trùng từ ${r.kho.nguong.canh_bao_so_chieu_trung} chiều trở lên, trùng cặp nguy hiểm (giọng phản đề đi cùng món nợ hoặc kết tuyến), hoặc thứ tự nhịp giống từ ${(r.kho.cau_truc || {}).canh_bao_tu_pct || 75}%. Xem <a href="#/quy-chuan/bien-the">Kho biến thể</a>.</p>`;
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
const DOCS = [['khung', 'Khung 12 nhịp'], ['bien-the', 'Kho biến thể'], ['huong-dan', 'Hướng dẫn làm video'], ['dinh-dang', 'Định dạng tap.json'], ['quy-trinh', 'Quy trình trên web']];
async function trangQuyChuan(doc = 'khung') {
  APP.innerHTML = `<section class="panel"><h1>Quy chuẩn &amp; hướng dẫn</h1>
    <nav class="tabs">${DOCS.map(([k, t]) => `<a class="tab" aria-selected="${k === doc}" href="#/quy-chuan/${k}">${t}</a>`).join('')}</nav><div id="docbody" class="doc-wrap"></div></section>`;
  const b = $('#docbody');
  if (doc === 'khung') {
    const K = await khung();
    b.innerHTML = `<p class="lead"><b>Khung tham khảo, không phải khuôn.</b> 12 nhịp là chức năng đo được từ các phim mẫu; mỗi tập được đảo, gộp, bỏ nhịp hoặc chen nhịp riêng, miễn là có tổ hợp biến thể và thứ tự kể của riêng mình (xem Kho biến thể). Vị trí tính theo % tổng thời lượng; nhịp cắt và % có lời là khoảng đo được từ 2 tập mẫu (Lũy Thầy 20:22, Đa Bang 22:02).</p>
      <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>#</th><th>Nhịp (mã)</th><th class="num">Vị trí</th><th class="num">Cắt/phút</th><th class="num">Có lời</th><th>Việc phải làm</th><th>Đo từ nguồn</th></tr></thead><tbody>
      ${K.nhip.map(n => `<tr><td>${n.so}</td><td><b>${esc(n.ten)}</b><br><code>${n.ma}</code></td><td class="num">${n.vi_tri_pct.join('–')}%</td><td class="num">${n.cat_phut.join('–')}</td><td class="num">${n.loi_pct.join('–')}%</td><td>${esc(n.viec)}</td><td class="muted">${esc(n.nguon)}</td></tr>`).join('')}
      </tbody></table></div>
      <h3>Toàn phim</h3><ul>${Object.entries(K.toan_phim).map(([k, v]) => `<li><b>${esc(k)}</b>: ${esc(JSON.stringify(v.muc_tieu || v))}${v.nguon ? ` <span class="muted">(${esc(v.nguon)})</span>` : ''}</li>`).join('')}</ul>`;
  } else if (doc === 'bien-the') {
    const [kho, ds, tk] = await Promise.all([khoBienThe(), lay('tap/danh_sach.json').catch(() => []), lay('tham_khao/danh_sach.json').catch(() => [])]);
    const tat = [...ds.map(d => ({ten: d.ma_tap, vox: true, bt: d.bien_the || {}})), ...tk.map(d => ({ten: d.nhan || d.ten, vox: false, bt: d.bien_the || {}}))];
    const dung = (c, m) => tat.filter(x => [].concat(x.bt[c.ma] || []).includes(m));
    b.innerHTML = `<p class="lead">Khung 12 nhịp chỉ nói mỗi đoạn phim làm <i>việc gì</i>. Kho này quyết định <i>bằng cách nào</i>. Mỗi tập chọn một lựa chọn cho mỗi chiều; tập sau nên đổi ít nhất ${kho.chieu.length - kho.nguong.canh_bao_so_chieu_trung + 1} chiều so với mọi tập trước và phim tham khảo, và không giữ nguyên thứ tự nhịp. Được đảo, gộp, bỏ nhịp hoặc chen nhịp riêng.</p>
      <p class="muted">Lựa chọn <b>chưa dùng</b> là chỗ nên thử trước. Nhãn <span class="pill warn">VOX</span> là tập của xưởng đã dùng; nhãn xám là phim tham khảo.</p>
      ${kho.chieu.map(c => `<h3>${esc(c.ten)}${c.nhieu ? ' <span class="muted" style="font-weight:400">(chọn 1–3)</span>' : ''}</h3><p class="muted" style="margin-top:0">${esc(c.hoi)}</p>
        <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>Lựa chọn</th><th>Ý nghĩa</th><th>Ví dụ</th><th>Đã dùng ở</th></tr></thead><tbody>
        ${c.lua_chon.map(l => { const d = dung(c, l.ma); return `<tr><td><b>${esc(l.ten)}</b><br><code>${l.ma}</code></td><td>${esc(l.mo_ta)}</td><td class="muted">${esc(l.vi_du)}</td>
          <td>${d.length ? d.map(x => `<span class="pill ${x.vox ? 'warn' : ''}">${x.vox ? 'VOX ' : ''}${esc(x.ten)}</span>`).join(' ') : '<span class="pill ok">chưa dùng</span>'}</td></tr>`; }).join('')}
        </tbody></table></div>`).join('')}`;
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
3. Viết từng **cảnh** và **shot**: độ dài, cỡ cảnh, góc, chuyển động, nội dung hình (tiếng Việt, kèm một câu tiếng Anh để Man tham khảo), thoại (mỗi câu một dòng, \`/\` ngắt 0,3 s, \`//\` ngắt 0,8 s), chữ trên hình.
4. Khai báo **gieo – trả**: mỗi đường dây gồm shot gieo, shot nhắc, shot trả.
5. Chọn **biến thể** (tab Biến thể): giọng phản đề, món nợ, nút thắt, kết tuyến, gương soi, cấu trúc thời gian, tuyến đan xen. Bảng kiểm tra cảnh báo nếu tổ hợp hoặc thứ tự nhịp lặp tập khác / phim tham khảo.
6. Nhìn bảng **kiểm tra** bên phải: sửa đến khi *0 lỗi* và không còn cảnh báo lặp công thức. Lệch khung 12 nhịp chỉ là ghi chú, không cần sửa.
7. **Lưu**: bản nháp tự lưu trong trình duyệt. Bấm *Tải tap.json* để có file.
8. **Đưa lên xưởng**: trên GitHub, mở repo \`XUONG_PHIM\` → thư mục \`tap\` → *Add file → Upload files* → kéo thư mục \`T02_…\` chứa \`tap.json\` (hoặc tạo file \`tap/T02_…/tap.json\` rồi dán nội dung) → *Commit changes*. Vercel tự cập nhật web sau khoảng 1 phút; tập mới hiện ở trang *Các tập*.

## Sản xuất từ một tập đã có

| Bước | Tab trên web |
|---|---|
| Gửi kịch bản ảnh cho Man | Gói ảnh → chép link cố định hoặc tải JSON |
| Thu giọng AI từng câu | Kịch bản đọc (tên file ghi sẵn) |
| Đặt ảnh Man tạo vào đúng tên file | Gói ảnh (trường file của từng shot) |
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
