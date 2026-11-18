// Trình soạn tập trên web: tạo khung 12 nhịp, sửa cảnh / shot / thoại / chữ / nhân vật / gieo – trả,
// kiểm tra tức thì, tự lưu bản nháp trong trình duyệt, tải tap.json để đưa lên GitHub.
'use strict';

const SOAN = (() => {
  const KEY = 'xp_ban_nhap';
  let S = null;        // {tap, tab, canhMo}
  let K = null;        // khung 12 nhịp
  let APPEL = null;
  let hen = null;

  const CO_CANH = ['ELS', 'WS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'Insert', 'Top-down', 'Bản đồ', 'Tranh cuộn', 'Tựa', 'Đen'];
  const GOC = ['ngang', 'hếch', 'cao', 'thẳng xuống', 'thấp', 'thấp sát mặt nước', '-'];
  const opt = (arr, v, nhan = x => x) => arr.map(x => `<option value="${esc(x)}" ${x === v ? 'selected' : ''}>${esc(nhan(x))}</option>`).join('');
  const listStr = a => (a || []).join(', ');

  function luu() { LS.set(KEY, S.tap); }
  function henKiem() { clearTimeout(hen); hen = setTimeout(() => { luu(); veBen(); }, 350); }

  function datPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      const k = /^\d+$/.test(ks[i]) ? +ks[i] : ks[i];
      if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[k];
    }
    const last = ks[ks.length - 1];
    if (val === undefined) delete o[last]; else o[last] = val;
  }
  function docGiaTri(el) {
    const t = el.dataset.t;
    if (t === 'bool') return el.checked || undefined;
    if (t === 'num') return el.value === '' ? undefined : +el.value;
    if (t === 'list') return el.value.split(',').map(x => x.trim()).filter(Boolean);
    if (t === 'pipe') return el.value.split('|').map(x => x.trim()).filter(Boolean);
    if (t === 'lines') return el.value.split('\n').map(x => x.trim()).filter(Boolean);
    return el.value;
  }
  function onInput(e) {
    const el = e.target.closest('[data-p]');
    if (!el) return;
    datPath(S.tap, el.dataset.p, docGiaTri(el));
    if (el.dataset.p.endsWith('.do')) el.closest('.shot-ed')?.classList.toggle('do', el.checked);
    henKiem();
  }

  // ------------------------------------------------ màn hình bắt đầu
  async function batDau(app) {
    let ds = [];
    try { ds = await lay('tap/danh_sach.json'); } catch (e) { /* */ }
    app.innerHTML = `
      <section class="panel"><h1>Soạn tập</h1>
        <p class="lead">Soạn kịch bản từng shot ngay trên web. Bản nháp tự lưu trong trình duyệt của máy này. Khi xong, tải <code>tap.json</code> và đưa lên GitHub (xem Quy chuẩn → Quy trình trên web).</p></section>
      <div class="grid-cards">
        <form class="panel" id="moi"><h2>Tạo tập mới</h2>
          <label class="f">Mã tập (không dấu, không khoảng trắng)<input id="m-ma" required pattern="[A-Za-z0-9_\\-]+" placeholder="T02_bach_dang"></label>
          <label class="f">Tên tập<input id="m-ten" required placeholder="Bạch Đằng 938"></label>
          <label class="f">Thời lượng dự kiến (phút)<input id="m-phut" type="number" min="3" max="60" step="0.5" value="18"></label>
          <button class="primary" type="submit">Dựng khung 12 nhịp</button></form>
        <div class="panel"><h2>Sửa tập có sẵn</h2>
          ${ds.map(t => `<a class="btn" href="#/soan/${encodeURIComponent(t.thu_muc || t.ma_tap)}">${esc(t.ma_tap)} – ${esc(t.tieu_de)}</a>`).join('') || '<p class="muted">Chưa có tập nào.</p>'}
          <label class="btn">Mở file tap.json từ máy<input type="file" accept=".json,application/json" id="up" hidden></label></div>
      </div>`;
    app.querySelector('#moi').onsubmit = async e => {
      e.preventDefault();
      const ma = app.querySelector('#m-ma').value.trim(), ten = app.querySelector('#m-ten').value.trim(), phut = +app.querySelector('#m-phut').value || 18;
      S = {tap: XP.lapKhung(K, ma, ten, phut), tab: 'chung', canhMo: 'C01'};
      luu(); location.hash = '#/soan/__nhap__';
    };
    app.querySelector('#up').onchange = async e => {
      try { S = {tap: XP.chuan(JSON.parse(await e.target.files[0].text())), tab: 'chung', canhMo: null}; luu(); location.hash = '#/soan/__nhap__'; }
      catch (err) { toast('File không phải tap.json hợp lệ'); }
    };
  }

  async function hoiGhiDe(app, ma) {
    const nhap = LS.get(KEY, null);
    app.innerHTML = `<section class="panel"><h2>Đang có một bản nháp chưa lưu lên GitHub</h2>
      <p>Bản nháp: <b>${esc(nhap.tieu_de || nhap.ma_tap)}</b>. Mở tập <b>${esc(ma)}</b> sẽ thay bản nháp này.</p>
      <div class="row"><button id="tai">Tải bản nháp về trước</button><button class="primary" id="thay">Thay bằng ${esc(ma)}</button><a class="btn" href="#/soan/__nhap__">Giữ bản nháp, sửa tiếp</a></div></section>`;
    app.querySelector('#tai').onclick = () => taiFile(`${nhap.ma_tap || 'ban_nhap'}_tap.json`, JSON.stringify(nhap, null, 1));
    return new Promise(res => app.querySelector('#thay').onclick = () => res(true));
  }

  async function mo(app, ma) {
    APPEL = app;
    K = await khung();
    if (!ma) {
      const nhap = LS.get(KEY, null);
      if (nhap) { location.hash = '#/soan/__nhap__'; return; }
      return batDau(app);
    }
    if (ma === 'moi') return batDau(app);
    if (ma === '__nhap__') {
      const nhap = LS.get(KEY, null);
      if (!nhap) return batDau(app);
      if (!S || S.tap !== nhap) S = {tap: XP.chuan(nhap), tab: S?.tab || 'chung', canhMo: S?.canhMo || null};
      return veSoan();
    }
    const nhap = LS.get(KEY, null);
    const goc = JSON.parse(JSON.stringify(await lay(`tap/${ma}/tap.json`)));
    if (nhap && nhap.ma_tap !== ma) await hoiGhiDe(app, ma);
    else if (nhap && nhap.ma_tap === ma) { location.hash = '#/soan/__nhap__'; return; }
    S = {tap: XP.chuan(goc), tab: 'canh', canhMo: 'C01'};
    luu(); location.hash = '#/soan/__nhap__';
  }

  // ------------------------------------------------ khung soạn
  function veSoan() {
    const t = S.tap;
    APPEL.innerHTML = `
      <section class="panel" style="gap:8px"><div class="row" style="justify-content:space-between">
        <div><span class="tag red">Bản nháp</span> <b>${esc(t.ma_tap)}</b> – ${esc(t.tieu_de)}</div>
        <div class="row"><button class="primary" id="b-json">Tải tap.json</button><button id="b-csv">Tải bảng shot</button>
          <a class="btn" href="#/tap/__nhap__">Xem như một tập</a><button class="danger" id="b-moi">Bỏ nháp, bắt đầu lại</button></div></div></section>
      <div class="ed">
        <div style="display:grid;gap:12px;min-width:0">
          <nav class="tabs">${[['chung', 'Thông tin chung'], ['nhan-vat', 'Nhân vật'], ['canh', 'Cảnh & shot'], ['gieo-tra', 'Gieo – trả'], ['json', 'JSON']]
            .map(([k, n]) => `<button class="tab" data-tab="${k}" aria-selected="${S.tab === k}">${n}</button>`).join('')}</nav>
          <div id="ed-main" style="display:grid;gap:12px;min-width:0"></div>
        </div>
        <aside class="ed-side" id="ed-side"></aside>
      </div>`;
    APPEL.querySelector('#b-json').onclick = () => taiFile('tap.json', JSON.stringify(S.tap, null, 1));
    APPEL.querySelector('#b-csv').onclick = () => taiFile(`${S.tap.ma_tap}_bang_shot.csv`, XP.csv(S.tap), 'text/csv');
    APPEL.querySelector('#b-moi').onclick = () => {
      const b = APPEL.querySelector('#b-moi');
      if (b.dataset.chac) { LS.set(KEY, null); try { localStorage.removeItem(KEY); } catch (e) { /* */ } S = null; location.hash = '#/soan/moi'; }
      else { b.dataset.chac = 1; b.textContent = 'Bấm lần nữa để xóa bản nháp'; setTimeout(() => { delete b.dataset.chac; b.textContent = 'Bỏ nháp, bắt đầu lại'; }, 3000); }
    };
    APPEL.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; veSoan(); });
    const main = APPEL.querySelector('#ed-main');
    main.addEventListener('input', onInput);
    main.addEventListener('change', onInput);
    ({chung: veChung, 'nhan-vat': veNhanVat, canh: veCanhList, 'gieo-tra': veGieoTra, json: veJson}[S.tab] || veChung)(main);
    veBen();
  }

  function veBen() {
    const side = APPEL && APPEL.querySelector('#ed-side');
    if (!side) return;
    const r = XP.kiemTra(S.tap, K);
    const link = m => m && /^C\d+/.test(m) ? `<a href="#" data-goto="${esc(m)}">${esc(m)}</a>: ` : (m ? `${esc(m)}: ` : '');
    side.innerHTML = `
      <div class="panel" style="gap:8px"><h3>Kiểm tra tức thì</h3>
        <div class="meta"><span>Dài <b>${XP.tc(r.tong, false)}</b></span><span>Shot <b>${r.soShot}</b></span><span>Cắt/phút <b>${r.cpm.toFixed(1)}</b></span><span>Có lời <b>${r.loiPct.toFixed(0)}%</b></span></div>
        <div class="row">${r.loi.length ? `<span class="pill err">${r.loi.length} lỗi</span>` : '<span class="pill ok">0 lỗi</span>'}${r.canhBao.length ? `<span class="pill warn">${r.canhBao.length} cảnh báo</span>` : ''}</div>
        <div class="issues">${r.loi.map(x => `<div class="i e">${link(x.ma)}${esc(x.t)}</div>`).join('')}${r.canhBao.map(x => `<div class="i w">${link(x.ma)}${esc(x.t)}</div>`).join('')}</div></div>
      <div class="panel" style="gap:6px"><h3>Nhịp</h3>
        <table style="font-size:12.5px"><tbody>${r.nhip.map(x => `<tr><td>${x.q ? x.q.so : '?'}</td><td>${x.q ? esc(x.q.ten) : esc(x.ma)}</td>
          <td class="num">${x.vt.toFixed(0)}%${x.lechVt ? ' ⚠' : ''}</td><td class="num">${x.cpm.toFixed(0)}/ph${x.lechCat ? ' ⚠' : ''}</td><td class="num">${x.lp.toFixed(0)}%${x.lechLoi ? ' ⚠' : ''}</td></tr>`).join('')}</tbody></table></div>`;
    side.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => {
      e.preventDefault();
      const ma = a.dataset.goto;
      S.tab = 'canh'; S.canhMo = ma.split('_')[0]; veSoan();
      setTimeout(() => document.getElementById(`ed-${ma}`)?.scrollIntoView({block: 'center'}), 60);
    });
  }

  function veChung(m) {
    const t = S.tap;
    m.innerHTML = `<div class="panel">
      <div class="fgrid">
        <label class="f">Mã tập<input data-p="ma_tap" value="${esc(t.ma_tap)}"></label>
        <label class="f">Tên tập<input data-p="tieu_de" value="${esc(t.tieu_de)}"></label>
        <label class="f">Tổng dự kiến (giây)<input data-p="tong_du_kien_s" data-t="num" type="number" value="${esc(t.tong_du_kien_s ?? '')}"></label>
      </div>
      <label class="f">Câu chủ đề (do nhân vật nói, không phải người dẫn)<textarea data-p="chu_de" rows="2">${esc(t.chu_de || '')}</textarea></label>
      <label class="f">Giọng phản đề (bắt đầu bằng mã nhân vật, vd. “GAO – …”)<textarea data-p="giong_phan_de" rows="2">${esc(t.giong_phan_de || '')}</textarea></label>
      <label class="f">Vật dẫn đường (mỗi dòng một vật)<textarea data-p="vat_dan_duong" data-t="lines" rows="2">${esc((t.vat_dan_duong || []).join('\n'))}</textarea></label>
      <label class="f">Câu phong cách (tự ghép vào cuối mọi prompt ảnh)<textarea data-p="phong_cach_prompt" rows="3">${esc(t.phong_cach_prompt || '')}</textarea></label>
      <label class="f">Trạng thái / ghi chú tập<input data-p="trang_thai" value="${esc(t.trang_thai || '')}"></label>
      <div class="panel" style="background:var(--bg)"><b>Năm câu hỏi trước khi viết</b>
        <ol style="margin:0;padding-left:18px"><li>Câu chủ đề là nỗi sợ hay lời hứa nào, ai nói trong 3 phút đầu?</li><li>Ai là giọng phản đề (thường là dân thường nghi ngờ người anh hùng)?</li>
        <li>Món nợ giữa họ là gì? Gieo trước lời trách, gieo nhẹ, chưa lộ người làm.</li><li>Vật dẫn đường nào đi suốt phim, mang màu đỏ sẫm?</li><li>Gương soi: hành động đầu phim nào sẽ quay lại đánh vào chính người làm?</li></ol></div>
    </div>`;
  }

  function veNhanVat(m) {
    const t = S.tap;
    m.innerHTML = `<div class="panel"><p class="muted" style="margin:0">Mã viết hoa không dấu (GAO, KIEN). <b>DAN</b> là người dẫn. Dấu hiệu nhận diện viết bằng tiếng Anh để đưa thẳng vào prompt.</p>
      ${t.nhan_vat.map((n, i) => `<div class="shot-ed"><div class="fgrid">
        <label class="f">Mã<input data-p="nhan_vat.${i}.ma" value="${esc(n.ma)}"></label>
        <label class="f">Tên<input data-p="nhan_vat.${i}.ten" value="${esc(n.ten || '')}"></label>
        <label class="f">Loại<select data-p="nhan_vat.${i}.loai">${opt(['có thật', 'hư cấu', 'giọng'], n.loai)}</select></label>
        <label class="f">Ảnh mẫu<input data-p="nhan_vat.${i}.anh_mau" value="${esc(n.anh_mau || '')}" placeholder="so_nhan_vat/${esc(n.ma)}.png"></label></div>
        <label class="f">Dấu hiệu nhận diện (tiếng Anh, cho prompt)<textarea data-p="nhan_vat.${i}.nhan_dang" rows="2">${esc(n.nhan_dang || '')}</textarea></label>
        <label class="f">Giọng (cho người lồng tiếng / giọng AI)<input data-p="nhan_vat.${i}.giong" value="${esc(n.giong || '')}"></label>
        <div class="row"><button class="small danger" data-x="xoa" data-i="${i}">Xóa nhân vật</button></div></div>`).join('')}
      <div class="row"><button data-x="them">+ Thêm nhân vật</button></div></div>`;
    m.querySelector('[data-x="them"]').onclick = () => { t.nhan_vat.push({ma: 'MOI', ten: '', loai: 'hư cấu', nhan_dang: '', giong: ''}); luu(); veSoan(); };
    m.querySelectorAll('[data-x="xoa"]').forEach(b => b.onclick = () => { t.nhan_vat.splice(+b.dataset.i, 1); luu(); veSoan(); });
  }

  function veGieoTra(m) {
    const t = S.tap;
    m.innerHTML = `<div class="panel"><p class="muted" style="margin:0">Mỗi đường dây: shot gieo → shot nhắc → shot trả (ghi mã shot, cách nhau bởi dấu phẩy). Đánh dấu “chính” cho 2–3 đường dây của nhân vật chính.</p>
      ${t.gieo_tra.map((g, i) => `<div class="shot-ed"><div class="fgrid">
        <label class="f">Mã<input data-p="gieo_tra.${i}.ma" value="${esc(g.ma)}"></label>
        <label class="f" style="grid-column:span 2">Mô tả<input data-p="gieo_tra.${i}.mo_ta" value="${esc(g.mo_ta || '')}"></label>
        <label class="f">Gieo<input data-p="gieo_tra.${i}.gieo" data-t="list" value="${esc(listStr(g.gieo))}" placeholder="C02_S06"></label>
        <label class="f">Nhắc<input data-p="gieo_tra.${i}.nhac" data-t="list" value="${esc(listStr(g.nhac))}"></label>
        <label class="f">Trả<input data-p="gieo_tra.${i}.tra" data-t="list" value="${esc(listStr(g.tra))}"></label>
        <label class="f">Đường dây chính<input type="checkbox" data-p="gieo_tra.${i}.chinh" data-t="bool" ${g.chinh ? 'checked' : ''}></label></div>
        <div class="row"><button class="small danger" data-x="xoa" data-i="${i}">Xóa</button></div></div>`).join('')}
      <div class="row"><button data-x="them">+ Thêm đường dây</button></div></div>`;
    m.querySelector('[data-x="them"]').onclick = () => { t.gieo_tra.push({ma: 'MOI', mo_ta: '', gieo: [], nhac: [], tra: []}); luu(); veSoan(); };
    m.querySelectorAll('[data-x="xoa"]').forEach(b => b.onclick = () => { t.gieo_tra.splice(+b.dataset.i, 1); luu(); veSoan(); });
  }

  function veJson(m) {
    m.innerHTML = `<div class="panel"><p class="muted" style="margin:0">Sửa trực tiếp toàn bộ tap.json (cho người quen định dạng). Bấm Áp dụng để kiểm tra và lưu.</p>
      <textarea id="js" rows="28" style="font:12.5px/1.45 ui-monospace,Consolas,monospace;width:100%;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:8px">${esc(JSON.stringify(S.tap, null, 1))}</textarea>
      <div class="row"><button class="primary" id="ap">Áp dụng</button><span id="jerr" class="muted"></span></div></div>`;
    m.querySelector('#ap').onclick = () => {
      try { S.tap = XP.chuan(JSON.parse(m.querySelector('#js').value)); luu(); veSoan(); toast('Đã áp dụng'); }
      catch (e) { m.querySelector('#jerr').textContent = `JSON lỗi: ${e.message}`; }
    };
  }

  // ------------------------------------------------ cảnh & shot
  function veCanhList(m) {
    const t = S.tap;
    const {tl} = XP.timeline(t);
    m.innerHTML = t.canh.map((c, ci) => {
      const ss = tl.filter(s => s.chi_so_canh === ci && !s._ao);
      const dai = ss.reduce((a, s) => a + +s.dai, 0);
      return `<details class="scene" data-ci="${ci}" ${S.canhMo === c.ma ? 'open' : ''}>
        <summary><span class="sc-no">${c.ma}</span><span><b>${esc(c.ten || '')}</b><br><span class="muted" style="font-size:12.5px">${esc(c.nhip || '')} · ${ss.length} shot · ${dai.toFixed(0)} s · bắt đầu ${XP.tc(ss[0]?.bat_dau || 0, false)}</span></span><span></span></summary>
        <div class="sc-body" id="sc-${ci}"></div></details>`;
    }).join('') + `<div class="row"><button data-x="them-canh">+ Thêm cảnh</button></div>`;
    m.querySelectorAll('details.scene').forEach(d => {
      const ci = +d.dataset.ci;
      if (d.open) veCanh(ci);
      d.addEventListener('toggle', () => { if (d.open) { S.canhMo = t.canh[ci].ma; veCanh(ci); } });
    });
    m.querySelector('[data-x="them-canh"]').onclick = () => {
      t.canh.push({ma: `C${String(t.canh.length + 1).padStart(2, '0')}`, ten: 'Cảnh mới', nhip: 'THU_THACH', muc_dich: '', ket_thuc: {kieu: 'cat'}, nhac: null,
        shot: [{ma: '', dai: 3, vao: 'cat', co_canh: 'WS', goc: 'ngang', chuyen_dong: 'dung', noi_dung: '', prompt: '', nhan_vat: [], thoai: [], chu: []}]});
      XP.danhMaLai(t); S.canhMo = t.canh[t.canh.length - 1].ma; luu(); veSoan();
    };
  }

  function veCanh(ci) {
    const t = S.tap, c = t.canh[ci];
    const box = APPEL.querySelector(`#sc-${ci}`);
    if (!box) return;
    const p = `canh.${ci}`;
    const vai = [...new Set([...(t.nhan_vat || []).map(n => n.ma), 'DAN'])];
    const kt = c.ket_thuc || {kieu: 'cat'};
    box.innerHTML = `
      <div class="fgrid">
        <label class="f">Tên cảnh<input data-p="${p}.ten" value="${esc(c.ten || '')}"></label>
        <label class="f">Nhịp<select data-p="${p}.nhip">${opt(K.nhip.map(n => n.ma), c.nhip, x => { const n = K.nhip.find(y => y.ma === x); return `${n.so}. ${n.ten}`; })}</select></label>
        <label class="f">Kết thúc cảnh<select data-p="${p}.ket_thuc.kieu">${opt(['cat', 'fade_den', 'flash_trang'], kt.kieu, x => ({cat: 'Cắt thẳng', fade_den: 'Fade sang đen', flash_trang: 'Flash trắng'}[x]))}</select></label>
        <label class="f">Độ dài màn đen/trắng (s)<input type="number" step="0.1" min="0" data-t="num" data-p="${p}.ket_thuc.dai" value="${esc(kt.dai ?? '')}"></label>
        <label class="f">File nhạc<input data-p="${p}.nhac.file" value="${esc(c.nhac?.file || '')}" placeholder="am_thanh/nhac/ten.mp3"></label>
        <label class="f">Âm lượng nhạc (dB)<input type="number" data-t="num" data-p="${p}.nhac.am_luong_db" value="${esc(c.nhac?.am_luong_db ?? '')}"></label>
      </div>
      <label class="f">Mục đích của cảnh trong câu chuyện<textarea data-p="${p}.muc_dich" rows="2">${esc(c.muc_dich || '')}</textarea></label>
      <div class="row"><button class="small" data-x="len-canh">↑ Đưa cảnh lên</button><button class="small" data-x="xuong-canh">↓ Đưa cảnh xuống</button><button class="small danger" data-x="xoa-canh">Xóa cảnh</button></div>
      ${(c.shot || []).map((s, si) => veShot(s, `${p}.shot.${si}`, si, vai)).join('')}
      <div class="row"><button data-x="them-shot">+ Thêm shot</button></div>
      <datalist id="dl-co">${CO_CANH.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <datalist id="dl-goc">${GOC.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
    const caiLai = () => { XP.danhMaLai(t); luu(); veCanhList(APPEL.querySelector('#ed-main')); veBen(); };
    box.querySelector('[data-x="them-shot"]').onclick = () => {
      c.shot.push({ma: '', dai: 3, vao: 'cat', co_canh: 'MS', goc: 'ngang', chuyen_dong: 'dung', noi_dung: '', prompt: '', nhan_vat: [], thoai: [], chu: []});
      caiLai();
    };
    box.querySelector('[data-x="xoa-canh"]').onclick = e => {
      const b = e.target;
      if (!b.dataset.chac) { b.dataset.chac = 1; b.textContent = 'Bấm lần nữa để xóa cảnh'; return; }
      t.canh.splice(ci, 1); t.canh.forEach((x, i) => x.ma = `C${String(i + 1).padStart(2, '0')}`); caiLai();
    };
    const doi = (a, b) => { [t.canh[a], t.canh[b]] = [t.canh[b], t.canh[a]]; t.canh.forEach((x, i) => x.ma = `C${String(i + 1).padStart(2, '0')}`); S.canhMo = t.canh[b].ma; caiLai(); };
    box.querySelector('[data-x="len-canh"]').onclick = () => ci > 0 && doi(ci, ci - 1);
    box.querySelector('[data-x="xuong-canh"]').onclick = () => ci < t.canh.length - 1 && doi(ci, ci + 1);
    box.querySelectorAll('[data-sx]').forEach(b => b.onclick = () => {
      const si = +b.dataset.si, sh = c.shot;
      const k = b.dataset.sx;
      if (k === 'len' && si > 0) [sh[si], sh[si - 1]] = [sh[si - 1], sh[si]];
      else if (k === 'xuong' && si < sh.length - 1) [sh[si], sh[si + 1]] = [sh[si + 1], sh[si]];
      else if (k === 'nhan') sh.splice(si + 1, 0, JSON.parse(JSON.stringify(sh[si])));
      else if (k === 'xoa') sh.splice(si, 1);
      else if (k === 'them-thoai') (sh[si].thoai = sh[si].thoai || []).push({vai: vai[0] || 'DAN', loi: '', luc: 0.4});
      else if (k === 'them-chu') (sh[si].chu = sh[si].chu || []).push({kieu: 'phuon', dong: [''], luc: 0.4});
      else if (k === 'xoa-thoai') sh[si].thoai.splice(+b.dataset.j, 1);
      else if (k === 'xoa-chu') sh[si].chu.splice(+b.dataset.j, 1);
      if (['them-thoai', 'them-chu', 'xoa-thoai', 'xoa-chu'].includes(k)) { luu(); veCanh(ci); veBen(); return; }
      caiLai();
    });
  }

  function veShot(s, p, si, vai) {
    const loai = s.loai || 'anh';
    return `<div class="shot-ed${s.do ? ' do' : ''}" id="ed-${esc(s.ma)}">
      <div class="row" style="justify-content:space-between"><b>${esc(s.ma)}</b>
        <span class="row"><button class="small" data-sx="len" data-si="${si}" aria-label="Đưa shot lên">↑</button><button class="small" data-sx="xuong" data-si="${si}" aria-label="Đưa shot xuống">↓</button>
          <button class="small" data-sx="nhan" data-si="${si}">Nhân bản</button><button class="small danger" data-sx="xoa" data-si="${si}">Xóa</button></span></div>
      <div class="fgrid">
        <label class="f">Dài (s)<input type="number" step="0.1" min="0.1" data-t="num" data-p="${p}.dai" value="${esc(s.dai)}"></label>
        <label class="f">Loại<select data-p="${p}.loai">${opt(XP.LOAI_SHOT, loai, x => ({anh: 'Ảnh', video: 'Clip AI', den: 'Màn đen', trang: 'Màn trắng'}[x]))}</select></label>
        <label class="f">Vào bằng<select data-p="${p}.vao">${opt(XP.CHUYEN_VAO, s.vao || 'cat', x => XP.VAO_VI[x])}</select></label>
        <label class="f">Cỡ cảnh<input list="dl-co" data-p="${p}.co_canh" value="${esc(s.co_canh || '')}"></label>
        <label class="f">Góc máy<input list="dl-goc" data-p="${p}.goc" value="${esc(s.goc || '')}"></label>
        <label class="f">Chuyển động<select data-p="${p}.chuyen_dong">${opt(XP.CHUYEN_DONG, s.chuyen_dong || 'dung', x => XP.CD_VI[x])}</select></label>
        <label class="f">Điểm nhấn zoom (s)<input type="number" step="0.1" data-t="num" data-p="${p}.diem_nhan" value="${esc(s.diem_nhan ?? '')}"></label>
        <label class="f">Nhân vật trong hình (mã, phẩy)<input data-t="list" data-p="${p}.nhan_vat" value="${esc(listStr(s.nhan_vat))}"></label>
        <label class="f">Đỏ sẫm (vật dẫn đường)<input type="checkbox" data-t="bool" data-p="${p}.do" ${s.do ? 'checked' : ''}></label>
        <label class="f">Tách lớp parallax<input type="checkbox" data-t="bool" data-p="${p}.tach_lop" ${s.tach_lop ? 'checked' : ''}></label>
      </div>
      <label class="f">Nội dung hình (tiếng Việt)<textarea rows="2" data-p="${p}.noi_dung">${esc(s.noi_dung || '')}</textarea></label>
      <label class="f">Prompt ảnh (tiếng Anh; phong cách tự ghép)<textarea rows="2" data-p="${p}.prompt">${esc(s.prompt || '')}</textarea></label>
      <div class="sub"><span class="muted" style="font-size:12.5px">Thoại (/ ngắt 0,3 s · // ngắt 0,8 s · “Lúc” = giây tính từ đầu shot)</span>
        ${(s.thoai || []).map((c, j) => `<div class="subrow">
          <div class="cell"><select aria-label="Vai" data-p="${p}.thoai.${j}.vai">${opt([...new Set([...vai, c.vai])], c.vai)}</select></div>
          <div class="cell" style="display:grid;gap:4px"><input aria-label="Lời" data-p="${p}.thoai.${j}.loi" value="${esc(c.loi || '')}"><input aria-label="Cách đọc" placeholder="cách đọc / cảm xúc" data-p="${p}.thoai.${j}.cam_xuc" value="${esc(c.cam_xuc || '')}"></div>
          <div class="cell"><input aria-label="Lúc" type="number" step="0.1" data-t="num" data-p="${p}.thoai.${j}.luc" value="${esc(c.luc ?? 0)}"></div>
          <button class="small danger" data-sx="xoa-thoai" data-si="${si}" data-j="${j}" aria-label="Xóa câu">×</button></div>`).join('')}
        <div><button class="small" data-sx="them-thoai" data-si="${si}">+ Câu thoại</button></div></div>
      <div class="sub"><span class="muted" style="font-size:12.5px">Chữ trên hình (nhiều dòng cách nhau bởi |)</span>
        ${(s.chu || []).map((x, j) => `<div class="subrow chu">
          <div class="cell"><select aria-label="Kiểu chữ" data-p="${p}.chu.${j}.kieu">${opt(['phuon', 'the', 'tua'], x.kieu, k => ({phuon: 'Phướn tên', the: 'Thẻ góc', tua: 'Tựa phim'}[k]))}</select></div>
          <div class="cell"><input aria-label="Nội dung chữ" data-t="pipe" data-p="${p}.chu.${j}.dong" value="${esc((x.dong || []).join(' | '))}"></div>
          <div class="cell"><input aria-label="Lúc" type="number" step="0.1" data-t="num" data-p="${p}.chu.${j}.luc" value="${esc(x.luc ?? 0)}" placeholder="lúc"></div>
          <div class="cell"><input aria-label="Dài" type="number" step="0.1" data-t="num" data-p="${p}.chu.${j}.dai" value="${esc(x.dai ?? '')}" placeholder="dài"></div>
          <button class="small danger" data-sx="xoa-chu" data-si="${si}" data-j="${j}" aria-label="Xóa chữ">×</button></div>`).join('')}
        <div><button class="small" data-sx="them-chu" data-si="${si}">+ Chữ</button></div></div>
      <div class="fgrid"><label class="f">Âm thanh cần tìm (phẩy)<input data-t="list" data-p="${p}.am_thanh" value="${esc(listStr(s.am_thanh))}"></label>
        <label class="f" style="grid-column:span 2">Ghi chú dựng<input data-p="${p}.ghi_chu" value="${esc(s.ghi_chu || '')}"></label></div>
    </div>`;
  }

  // lưu ngay khi rời trang soạn hoặc đóng tab (không chờ hẹn giờ)
  window.addEventListener('hashchange', () => { if (S) luu(); });
  window.addEventListener('beforeunload', () => { if (S) luu(); });

  return {mo};
})();
