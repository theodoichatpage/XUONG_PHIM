// Vẽ sơ đồ tuyến phim tự động từ tap.json: hàng cảnh (màu theo nhịp), làn nhân vật, cung gieo → trả.
'use strict';

const VE = (() => {
  const NHOM = {MO: 'mo', GIEO_NO: 'tho', CHU_DE: 'drama', PHAN_DE: 'drama', THU_THACH: 'action', DINH_ACTION: 'action', DIEN_VAN: 'drama',
    TRAN_CUOI: 'action', TRA_NO: 'drama', GUONG_SOI: 'drama', LICH_SU_LANH: 'thuyet', MOC_CREDIT: 'ket',
    TUYEN_DICH: 'drama', DOI_CHAT: 'drama', HOI_TUONG: 'tho'};
  const LOAI = {mo: ['Mở / tựa', '--c-mo'], tho: ['Gieo / ký ức', '--c-tho'], drama: ['Kịch – đối thoại', '--c-drama'],
    action: ['Hành động', '--c-action'], thuyet: ['Thuyết minh / lịch sử', '--c-thuyet'], ket: ['Móc / credit', '--c-ket']};
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, a = {}, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; return e; };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function chinh(tap, g, i) { return g.chinh != null ? !!g.chinh : i < 3; }

  // nhân vật xuất hiện: gộp các shot liền nhau có nhân vật trong hình (đặc) hoặc chỉ có giọng (mờ)
  function lanNhanVat(tap, tl) {
    const lan = [];
    (tap.nhan_vat || []).forEach(n => {
      const dac = [], mo = [];
      tl.forEach(s => {
        const trong = (s.nhan_vat || []).includes(n.ma);
        const noi = (s.thoai || []).some(c => c.vai === n.ma);
        if (!trong && !noi) return;
        const arr = trong ? dac : mo;
        const a = s.bat_dau, b = s.bat_dau + +s.dai;
        const last = arr[arr.length - 1];
        if (last && a - last[1] < 0.6) last[1] = b; else arr.push([a, b]);
      });
      if (dac.length || mo.length) lan.push({n, dac, mo});
    });
    return lan;
  }

  // Cỡ sơ đồ: rong = bề ngang khung chứa → co vừa, không cuộn ngang (màn quá hẹp mới cuộn)
  function co(rong, tong) {
    const L = rong && rong < 700 ? 96 : 160, R = 14;
    const pps = rong ? Math.max(0.3, (rong - L - R) / Math.max(60, tong)) : Math.max(0.9, Math.min(2.2, 1400 / Math.max(60, tong)));
    return {L, R, pps, W: Math.max(rong || 0, L + tong * pps + R)};
  }
  // Vẽ vào khung và tự vẽ lại khi khung đổi bề ngang
  function vuaKhung(box, ve) {
    let w0 = 0;
    const veLai = () => { const w = Math.floor(box.clientWidth); if (!w || Math.abs(w - w0) < 4) return; w0 = w; box.replaceChildren(ve(w)); };
    veLai();
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!box.isConnected) return ro.disconnect(); veLai(); }); ro.observe(box); }
  }

  function tuyenPhim(tap, khung, onScene, rong) {
    const {tl, tong} = XP.timeline(tap);
    const lan = lanNhanVat(tap, tl);
    const {L, R, pps, W} = co(rong, tong);
    const x = t => L + t * pps;
    const arcH = 120, axisY = arcH + 14, sceneY = axisY + 12, sceneH = 50, laneY0 = sceneY + sceneH + 18, laneH = 22;
    const H = laneY0 + lan.length * laneH + 14;
    const svg = el('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Sơ đồ tuyến phim'});
    const ink = css('--ink'), muted = css('--muted'), line = css('--line'), red = css('--red'), paper = css('--paper');
    const buoc = pps * 60 < 34 ? 120 : (tong > 900 || pps * 30 < 40 ? 60 : 30);
    for (let t = 0; t <= tong; t += buoc) {
      svg.append(el('line', {x1: x(t), x2: x(t), y1: axisY - 4, y2: H - 6, stroke: line, 'stroke-width': t % 300 ? 0.6 : 1.2}));
      svg.append(el('text', {x: x(t) + 3, y: axisY - 4, 'font-size': 10.5, fill: muted}, XP.tc(t, false)));
    }
    svg.append(el('text', {x: 8, y: 16, 'font-size': 11, fill: muted, 'font-weight': 600}, 'GIEO → TRẢ'));
    svg.append(el('text', {x: 8, y: sceneY + 30, 'font-size': 11, fill: muted, 'font-weight': 600}, 'CẢNH'));
    (tap.canh || []).forEach((c, ci) => {
      const ss = tl.filter(s => s.chi_so_canh === ci);
      if (!ss.length) return;
      const a = ss[0].bat_dau, b = ss[ss.length - 1].bat_dau + +ss[ss.length - 1].dai;
      const loai = NHOM[c.nhip] || 'drama';
      const w = Math.max(2, (b - a) * pps - 2);
      const g = el('g', {tabindex: 0, style: 'cursor:pointer', role: 'button', 'aria-label': `Cảnh ${c.ma}: ${c.ten || ''}`});
      const r = el('rect', {x: x(a) + 1, y: sceneY, width: w, height: sceneH, rx: 3, fill: css(LOAI[loai][1])});
      r.append(el('title', {}, `${c.ma} · ${XP.tc(a, false)}–${XP.tc(b, false)} · ${c.ten || ''}`));
      g.append(r);
      const tc = ['tho', 'mo'].includes(loai) ? ink : '#fff';
      g.append(el('text', {x: x(a) + 6, y: sceneY + 17, 'font-size': 12, 'font-weight': 700, fill: tc}, c.ma.replace(/^C0?/, '')));
      if (w > 46) {
        const maxc = Math.floor((w - 10) / 6.2), ten = c.ten || '';
        g.append(el('text', {x: x(a) + 6, y: sceneY + 34, 'font-size': 10.5, fill: tc}, ten.length > maxc ? ten.slice(0, maxc - 1) + '…' : ten));
      }
      const go = () => onScene && onScene(c.ma);
      g.addEventListener('click', go);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      svg.append(g);
    });
    const giongChinh = new Set(tap.giong_phan_de ? (tap.nhan_vat || []).filter(n => tap.giong_phan_de.startsWith(n.ma)).map(n => n.ma) : []);
    lan.forEach(({n, dac, mo}, i) => {
      const y = laneY0 + i * laneH;
      const main = giongChinh.has(n.ma);
      const col = main ? red : ink;
      const ten = `${n.ten || n.ma}${n.loai === 'hư cấu' ? ' *' : ''}`;
      const mx = L < 120 ? 13 : 24;
      svg.append(el('text', {x: 8, y: y + 14, 'font-size': 11.5, fill: col, 'font-weight': main ? 700 : 500}, ten.length > mx ? ten.slice(0, mx - 1) + '…' : ten));
      svg.append(el('line', {x1: L, x2: W - R, y1: y + 10, y2: y + 10, stroke: line, 'stroke-width': 0.6}));
      dac.forEach(([a, b]) => svg.append(el('rect', {x: x(a), y: y + 3, width: Math.max(3, (b - a) * pps), height: 14, rx: 2, fill: col, opacity: 0.85})));
      mo.forEach(([a, b]) => svg.append(el('rect', {x: x(a), y: y + 6, width: Math.max(3, (b - a) * pps), height: 8, rx: 2, fill: col, opacity: 0.3})));
    });
    const viTri = Object.fromEntries(tl.map(s => [s.ma, s.bat_dau + Math.min(1, +s.dai / 2)]));
    (tap.gieo_tra || []).forEach((g, i) => {
      const pts = [];
      ['gieo', 'nhac', 'tra'].forEach(k => (g[k] || []).forEach(m => { if (m in viTri) pts.push({k, x: x(viTri[m])}); }));
      if (pts.length < 2) return;
      pts.sort((p, q) => p.x - q.x);
      const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
      const h = Math.min(arcH - 18, 22 + (x1 - x0) * 0.09);
      const main = chinh(tap, g, i), col = main ? red : muted;
      const grp = el('g', {class: 'arc', 'data-i': i});
      grp.append(el('path', {d: `M${x0},${arcH} C${x0},${arcH - h} ${x1},${arcH - h} ${x1},${arcH}`, fill: 'none', stroke: col, 'stroke-width': main ? 2 : 1.2, opacity: main ? 0.9 : 0.6}));
      pts.forEach(p => grp.append(el('circle', {cx: p.x, cy: arcH, r: p.k === 'tra' ? 4.5 : 3.5, fill: p.k === 'tra' ? col : paper, stroke: col, 'stroke-width': 1.5})));
      grp.append(el('title', {}, `${g.mo_ta || g.ma}`));
      svg.append(grp);
    });
    return svg;
  }

  function chuGiai() {
    return Object.values(LOAI).map(([t, v]) => `<span><i class="sw" style="background:var(${v})"></i>${t}</span>`).join('') +
      '<span><i class="sw" style="background:var(--red)"></i>Đường dây chính / giọng phản đề</span><span>* nhân vật hư cấu</span>';
  }
  return {tuyenPhim, chuGiai, vuaKhung, co, NHOM, LOAI, chinh};
})();
