// Phim tham khảo: tuyến phim đã rà soát của các tập Việt Sử Kiêu Hùng (phân tích cấu trúc, thoại là diễn ý).
'use strict';

const TK = (() => {
  const T = s => { const [m, x] = String(s).split(':'); return +m * 60 + +x; };
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const LOAI = {mo: ['Mở / tựa', '--c-mo'], drama: ['Kịch – đối thoại', '--c-drama'], action: ['Hành động', '--c-action'],
    thuyet: ['Thuyết minh / lịch sử', '--c-thuyet'], tho: ['Khoảng thở / ký ức', '--c-tho'], ket: ['Credit / móc tập sau', '--c-ket']};
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, a = {}, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; return e; };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const CHU_THICH = 'Phân tích cấu trúc phim của Việt Sử Kiêu Hùng để học cách dựng tuyến phim. Thoại ghi dạng diễn ý (không phải nguyên văn); “chưa chắc” là chỗ chưa xác định được. Nhân vật, thoại, hình và nhạc thuộc về Việt Sử Kiêu Hùng – xem phim gốc theo link.';

  function so(f) {
    const svg = (() => {
      const L = 150, R = 20, pps = 1.15, W = L + f.dai_s * pps + R, x = t => L + t * pps;
      const arcH = 120, axisY = arcH + 14, sceneY = axisY + 12, sceneH = 46, laneY0 = sceneY + sceneH + 18, laneH = 22;
      const H = laneY0 + f.nhanvat.length * laneH + 14;
      const s = el('svg', {width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Sơ đồ tuyến phim ${f.ten}`});
      const ink = css('--ink'), muted = css('--muted'), line = css('--line'), red = css('--red'), paper = css('--paper');
      for (let m = 0; m * 60 <= f.dai_s; m++) {
        s.append(el('line', {x1: x(m * 60), x2: x(m * 60), y1: axisY - 4, y2: H - 6, stroke: line, 'stroke-width': m % 5 ? 0.6 : 1.2}));
        s.append(el('text', {x: x(m * 60) + 3, y: axisY - 4, 'font-size': 10.5, fill: muted}, `${m}:00`));
      }
      s.append(el('text', {x: 8, y: 16, 'font-size': 11, fill: muted, 'font-weight': 600}, 'GIEO → TRẢ'));
      s.append(el('text', {x: 8, y: sceneY + 27, 'font-size': 11, fill: muted, 'font-weight': 600}, 'CẢNH'));
      f.canh.forEach(c => {
        const a = T(c.a), b = T(c.b), w = Math.max(2, (b - a) * pps - 2);
        const g = el('g', {tabindex: 0, role: 'button', style: 'cursor:pointer', 'aria-label': `Cảnh ${c.n}: ${c.ten}`});
        const r = el('rect', {x: x(a) + 1, y: sceneY, width: w, height: sceneH, rx: 3, fill: css(LOAI[c.loai][1])});
        r.append(el('title', {}, `Cảnh ${c.n} · ${c.a}–${c.b} · ${c.ten}`));
        g.append(r);
        const tc = ['tho', 'mo'].includes(c.loai) ? ink : '#fff';
        g.append(el('text', {x: x(a) + 6, y: sceneY + 16, 'font-size': 12, 'font-weight': 700, fill: tc}, c.n));
        if (w > 70) { const mx = Math.floor((w - 10) / 6.2); g.append(el('text', {x: x(a) + 6, y: sceneY + 32, 'font-size': 10.5, fill: tc}, c.ten.length > mx ? c.ten.slice(0, mx - 1) + '…' : c.ten)); }
        const go = () => { const card = document.getElementById(`tk-canh-${c.n}`); if (card) { card.scrollIntoView({block: 'center'}); card.classList.add('hl'); setTimeout(() => card.classList.remove('hl'), 1600); } };
        g.addEventListener('click', go);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        s.append(g);
      });
      f.nhanvat.forEach((n, i) => {
        const y = laneY0 + i * laneH, col = n.main ? red : ink;
        s.append(el('text', {x: 8, y: y + 14, 'font-size': 11.5, fill: col, 'font-weight': n.main ? 700 : 500}, n.ten.length > 22 ? n.ten.slice(0, 21) + '…' : n.ten));
        s.append(el('line', {x1: L, x2: W - R, y1: y + 10, y2: y + 10, stroke: line, 'stroke-width': 0.6}));
        n.seg.forEach(([a, b]) => s.append(el('rect', {x: x(T(a)), y: y + 3, width: Math.max(3, (T(b) - T(a)) * pps), height: 14, rx: 2, fill: col, opacity: 0.85})));
        n.mo.forEach(([a, b]) => s.append(el('rect', {x: x(T(a)), y: y + 6, width: Math.max(3, (T(b) - T(a)) * pps), height: 8, rx: 2, fill: col, opacity: 0.28})));
      });
      f.day.forEach((d, i) => {
        const pts = d.moc.map(([k, t]) => ({k, x: x(T(t))}));
        const x0 = pts[0].x, x1 = pts[pts.length - 1].x, h = Math.min(arcH - 18, 22 + (x1 - x0) * 0.09), col = d.main ? red : muted;
        const g = el('g', {class: 'arc', 'data-i': i});
        g.append(el('path', {d: `M${x0},${arcH} C${x0},${arcH - h} ${x1},${arcH - h} ${x1},${arcH}`, fill: 'none', stroke: col, 'stroke-width': d.main ? 2 : 1.2, opacity: d.main ? 0.9 : 0.6}));
        pts.forEach(p => g.append(el('circle', {cx: p.x, cy: arcH, r: p.k === 'trả' ? 4.5 : 3.5, fill: p.k === 'trả' ? col : paper, stroke: col, 'stroke-width': 1.5})));
        g.append(el('title', {}, `${d.ten}: ${d.moc.map(([k, t]) => `${k} ${t}`).join(' → ')}`));
        s.append(g);
      });
      return s;
    })();
    return svg;
  }

  async function mo(app, ma, canh) {
    const ds = (await lay('tham_khao/danh_sach.json')).sort((a, b) => a.thu_tu - b.thu_tu);
    const thanhTap = `<nav class="tabs">${ds.map(t => `<a class="tab" aria-selected="${t.ma === ma}" href="#/tham-khao/${t.ma}">Tập ${t.thu_tu}: ${esc(t.ten)}</a>`).join('')}
      <a class="tab" aria-selected="${ma === 'so-sanh'}" href="#/tham-khao/so-sanh">Đối chiếu khung</a></nav>`;
    if (!ma) { location.replace(`#/tham-khao/${ds[0].ma}`); return; }
    if (ma === 'so-sanh') return soSanh(app, ds, thanhTap);
    const f = await lay(`tham_khao/${ma}.json`);
    app.innerHTML = `<section class="panel">
      ${thanhTap}
      <div class="row" style="justify-content:space-between"><span class="tag">Phim tham khảo · Tập ${f.thu_tu} · ${esc(f.kenh)}</span>
        <a class="btn" href="${esc(f.link)}" target="_blank" rel="noopener">Xem phim gốc trên YouTube ↗</a></div>
      <h1>${esc(f.ten)}</h1>
      <div class="meta"><span>Đăng <b>${esc(f.dang.split('-').reverse().join('/'))}</b></span><span>Dài <b>${fmt(f.dai_s)}</b></span><span>Shot <b>${f.so.shot}</b></span>
        <span>Cắt/phút <b>${f.so.cpm}</b></span><span>Trung vị shot <b>${f.so.tv}</b></span><span>Có lời <b>${f.so.loi}</b></span><span>Khung hình <b>${esc(f.khung_hinh)}</b></span></div>
      <div class="meta"><span>Bối cảnh: <b style="font-weight:500">${esc(f.boi_canh)}</b></span></div>
      <div class="meta"><span>Câu chủ đề: <b style="font-weight:500">${esc(f.chude)}</b></span></div>
      <div class="meta"><span>Giọng phản đề: <b style="font-weight:500">${esc(f.phande)}</b></span></div>
      <div class="legend">${Object.values(LOAI).map(([t, v]) => `<span><i class="sw" style="background:var(${v})"></i>${t}</span>`).join('')}<span><i class="sw" style="background:var(--red)"></i>Đường dây nhân vật chính</span></div>
      <div class="scroll" id="tk-sv"></div>
      <p class="muted" style="font-size:13px;margin:0">Bấm một cảnh để đọc chi tiết. Ô đặc: nhân vật trong khung; ô mờ: chỉ giọng, được nhắc, hoặc chưa chắc. Số cắt/phút và % có lời là số đo.</p>
      <h3>Đường dây gieo → trả</h3>
      <div class="grid-cards">${f.day.map(d => `<div class="card" style="gap:4px"><span class="tag${d.main ? ' red' : ''}" style="justify-self:start">${d.main ? 'Tuyến nhân vật chính' : 'Đường dây phụ'}</span>
        <b>${esc(d.ten)}</b><span class="muted" style="font-size:12.5px">${d.moc.map(([k, t]) => `${k} ${t}`).join(' → ')}</span><span style="font-size:13px">${esc(d.y)}</span></div>`).join('')}</div>
      <h3>Đọc dọc từng cảnh</h3>
      <div style="display:grid;gap:10px">${f.canh.map(c => {
        const a = T(c.a), b = T(c.b);
        const ten = Object.fromEntries(f.nhanvat.map(n => [n.ma, n.ten]));
        const day = f.day.filter(d => d.moc.some(([, t]) => T(t) >= a && T(t) < b))
          .map(d => `<span class="tag${d.main ? ' red' : ''}">${esc(d.ten)}: ${d.moc.filter(([, t]) => T(t) >= a && T(t) < b).map(([k]) => k).join(', ')}</span>`).join('');
        return `<article class="scene" id="tk-canh-${c.n}" tabindex="-1" style="padding:14px;display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px">
          <div class="muted" style="display:grid;gap:3px;align-content:start;font-size:13px;font-variant-numeric:tabular-nums"><span class="sc-no" style="color:var(--ink)">${c.n}</span><span>${c.a} – ${c.b}</span><span>${fmt(b - a)} phút</span></div>
          <div style="display:grid;gap:6px;min-width:0">
            <div class="row"><span class="pill" style="background:var(${LOAI[c.loai][1]});color:${['tho', 'mo'].includes(c.loai) ? 'var(--ink)' : '#fff'}">${LOAI[c.loai][0]}</span><span class="tag">Nhịp ${esc(c.nhip)}</span></div>
            <h3>${esc(c.ten)}</h3>
            <ul style="margin:0;padding-left:18px;display:grid;gap:3px">${c.ct.slice().sort((p, q) => T(p[0]) - T(q[0])).map(([t, s]) => `<li><span class="muted" style="font-size:12.5px;margin-right:6px;font-variant-numeric:tabular-nums">${t}</span>${/chưa chắc|chưa xác định/.test(s) ? `<i class="muted">${esc(s)}</i>` : esc(s)}</li>`).join('')}</ul>
            ${c.nv.length ? `<div class="muted" style="font-size:13px">Nhân vật: ${c.nv.map(m => esc(ten[m] || m)).join(', ')}</div>` : ''}
            <div class="muted" style="font-size:13px">Đo được: ${String(c.cpm).replace('.', ',')} cắt/phút · có lời ${c.loi}%</div>
            ${day ? `<div class="row">${day}</div>` : ''}
          </div></article>`;
      }).join('')}</div>
      <p class="muted" style="font-size:13px;margin:0">${esc(CHU_THICH)}</p></section>`;
    app.querySelector('#tk-sv').append(so(f));
    if (canh) {
      const card = document.getElementById(`tk-canh-${canh}`);
      if (card) setTimeout(() => { card.scrollIntoView({block: 'center'}); card.classList.add('hl'); setTimeout(() => card.classList.remove('hl'), 2000); }, 60);
    }
  }

  async function soSanh(app, ds, thanhTap) {
    const ss = await lay('tham_khao/so_sanh.json');
    const ten = ds.map(t => esc(t.ten));
    app.innerHTML = `<section class="panel">${thanhTap}
      <h1>Hai tập trên cùng khung 12 nhịp</h1>
      <p class="lead">Cùng một bộ khung, hai cách sắp. Đa Bang đi đúng thứ tự 12 nhịp và trả nợ bằng hành động của người dân. Lũy Thầy đặt diễn văn sớm, để giọng phản đề không quay lại, và dồn nút thắt vào cuộc đối chất cuối.</p>
      <div class="scroll" style="background:var(--paper)"><table><thead><tr><th>Nhịp</th><th>Tập 1: ${ten[0] || ''}</th><th>Tập 2: ${ten[1] || ''}</th></tr></thead>
        <tbody>${ss.khung.map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>
      <h3>Công thức rút ra cho tuyến phim mới</h3>
      <div class="scroll" style="background:var(--paper)"><table><tbody>
        <tr><td><b>Nợ → Trách → Vắng → Nhắc → Trả</b></td><td>Gieo một ân huệ nhỏ (chưa lộ người làm) → người được cứu quay lại trách → để vắng 8–10 phút → một hình nhắc khoảng 1 phút trước → trả bằng hành động, kèm một câu nối món nợ, lời thề và câu chủ đề.</td></tr>
        <tr><td><b>Gương soi</b></td><td>Hành động của nhân vật ở đầu phim (chém tướng, tin vào sắt) quay lại đánh vào chính họ ở cuối.</td></tr>
        <tr><td><b>Vật dẫn đường</b></td><td>Một đồ vật hoặc một màu đi suốt phim (kính tròn, tiền giấy, ngọn lửa) để kể bằng hình mà không cần lời.</td></tr>
        <tr><td><b>Xen kẽ nhịp</b></td><td>Kịch 6–19 cắt/phút, 50–70% có lời ↔ hành động 18–40 cắt/phút, 5–17% có lời; mỗi chương khép bằng fade đen.</td></tr>
      </tbody></table></div>
      <p class="muted" style="font-size:13px;margin:0">${esc(CHU_THICH)}</p></section>`;
  }

  return {mo};
})();
