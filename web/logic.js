// Lõi xử lý của xưởng trên web: bản JavaScript của cong_cu/chung.py, kiem_tra.py và phieu_dung.py.
// Giữ cùng quy tắc để kết quả trên web khớp với công cụ dòng lệnh.
'use strict';

const XP = (() => {
  const TU_PHUT = {DAN: 155};
  const TU_PHUT_THOAI = 110;
  const CHUYEN_DONG = ['dung', 'day_vao', 'keo_ra', 'lia_trai', 'lia_phai', 'len', 'xuong', 'zoom_giat', 'rung'];
  const CHUYEN_VAO = ['cat', 'fade_den', 'flash_trang', 'hoa_hinh'];
  const LOAI_SHOT = ['anh', 'video', 'den', 'trang'];
  const CD_VI = {dung: 'Đứng yên', day_vao: 'Đẩy vào chậm', keo_ra: 'Kéo ra chậm', lia_trai: 'Lia sang trái', lia_phai: 'Lia sang phải',
    len: 'Lia lên', xuong: 'Lia xuống', zoom_giat: 'Zoom giật', rung: 'Rung nhẹ (cầm tay)'};
  const VAO_VI = {cat: 'Cắt thẳng', fade_den: 'Hiện dần từ đen', flash_trang: 'Flash trắng rồi hiện', hoa_hinh: 'Hòa hình với shot trước'};
  const VAO_HD = {cat: '', fade_den: 'Hoạt hình → Mờ dần vào 0,5–1 s.', flash_trang: 'Chèn màu Trắng 0,4 s trước clip; clip: Mờ dần vào 0,3 s.',
    hoa_hinh: 'Chuyển cảnh → Hòa tan, 1–2 s.'};
  const STYLE = 'dark ink-wash and charcoal digital painting, near-monochrome palette of black and cold greys, heavy brush texture, mist and smoke, dramatic rim light, cinematic 16:9 widescreen composition, film grain, no text, no watermark';

  const tc = (t, frac = true) => {
    t = Math.max(0, t || 0);
    const m = Math.floor(t / 60), s = t - m * 60;
    return frac ? `${m}:${s.toFixed(2).padStart(5, '0')}` : `${m}:${String(Math.floor(s)).padStart(2, '0')}`;
  };
  const soTu = c => (c || '').replace(/\//g, ' ').split(/\s+/).filter(Boolean).length;
  function uocLuongDoc(vai, cau) {
    cau = cau || '';
    const tu = soTu(cau);
    const toc = TU_PHUT[vai] || TU_PHUT_THOAI;
    const hai = (cau.match(/\/\//g) || []).length;
    const mot = (cau.match(/\//g) || []).length - 2 * hai;
    return tu / toc * 60 + Math.max(0, hai * 0.8 + mot * 0.3);
  }

  function chuan(tap) {
    tap.fps = tap.fps || 24; tap.rong = tap.rong || 1920; tap.cao = tap.cao || 1080;
    tap.nhan_vat = tap.nhan_vat || []; tap.gieo_tra = tap.gieo_tra || []; tap.canh = tap.canh || [];
    return tap;
  }

  // Trải phẳng tập phim thành danh sách shot có thời điểm bắt đầu (giống chung.timeline)
  function timeline(tap) {
    const out = [];
    let t = 0;
    (tap.canh || []).forEach((canh, ci) => {
      const shots = canh.shot || [];
      shots.forEach((s0, si) => {
        const s = Object.assign({loai: 'anh', vao: 'cat', chuyen_dong: 'dung', thoai: [], chu: [], sfx: []}, s0);
        s.thoai = (s.thoai || []).map(c => Object.assign({}, c, {_dai: uocLuongDoc(c.vai, c.loi)}));
        Object.assign(s, {bat_dau: t, canh, chi_so_canh: ci, la_dau_canh: si === 0, la_cuoi_canh: si === shots.length - 1});
        out.push(s);
        t += +s.dai || 0;
      });
      const kt = canh.ket_thuc || {};
      if (['fade_den', 'den', 'flash_trang'].includes(kt.kieu) && +kt.dai > 0) {
        const loai = kt.kieu === 'flash_trang' ? 'trang' : 'den';
        out.push({ma: `${canh.ma}_${loai === 'den' ? 'DEN' : 'TRANG'}`, loai, dai: +kt.dai, vao: 'cat', chuyen_dong: 'dung', thoai: [], chu: [], sfx: [],
          bat_dau: t, canh, chi_so_canh: ci, la_dau_canh: false, la_cuoi_canh: true, _ao: true});
        t += +kt.dai;
      }
    });
    return {tl: out, tong: t};
  }

  function promptDayDu(tap, s) {
    const p = (s.prompt || '').trim();
    if (!p) return '';
    const mau = s.do ? '' : ', no red, monochrome';
    return `${p}, ${tap.phong_cach_prompt || STYLE}${mau}`.replace('[STYLE]', '').replace(/^[, ]+|[, ]+$/g, '');
  }
  const anhMacDinh = s => `anh/${s.ma.split('_')[0]}/${s.ma}.png`;

  function keyframe(s) {
    const d = +s.dai, cd = s.chuyen_dong || 'dung', toc = +(s.toc_do || 1.5);
    let k;
    if (cd === 'dung') k = 'Không keyframe.';
    else if (cd === 'day_vao') k = `Tỷ lệ 100% (đầu) → ${Math.round(100 + toc * d)}% (cuối). Ease in/out.`;
    else if (cd === 'keo_ra') k = `Tỷ lệ ${Math.round(100 + toc * d)}% (đầu) → 100% (cuối). Ease in/out.`;
    else if (cd === 'lia_trai' || cd === 'lia_phai') { const [a, b] = cd === 'lia_trai' ? [60, -60] : [-60, 60]; k = `Tỷ lệ 115% cố định. Vị trí X ${a} → ${b}. Ease in/out.`; }
    else if (cd === 'len' || cd === 'xuong') { const [a, b] = cd === 'len' ? [-40, 40] : [40, -40]; k = `Tỷ lệ 112% cố định. Vị trí Y ${a} → ${b}. Ease in/out.`; }
    else if (cd === 'zoom_giat') k = `Giữ 100% tới ${s.diem_nhan != null ? `giây ${s.diem_nhan}` : 'điểm nhấn'}, rồi trong 5 frame (0,2 s) nhảy lên 130%. Ease out.`;
    else if (cd === 'rung') k = 'Hiệu ứng → Lắc máy (Camera shake), cường độ thấp nhất; Tỷ lệ 105% để không lộ mép.';
    else k = cd;
    if (s.tach_lop) k += ' Tách lớp (parallax): track chính đặt ảnh chỉ có nền (Tỷ lệ 105→108%); lớp phủ đặt ảnh có nhân vật đã Xóa nền (Tỷ lệ 100→112%, Vị trí X dịch 20–40).';
    return k;
  }
  const CHU_HD = {
    phuon: 'phướn mực dọc (mẫu chữ đã lưu), Mờ dần vào 1,0–1,25 s, không trượt; mất theo cú cắt',
    tua: 'tựa phim giữa khung: Mờ dần vào + Vị trí Y −30→0 trong 22 frame; giữ 4–5 s',
    the: 'thẻ thời gian / địa danh góc trên-trái: Mờ dần vào 1 s, Mờ dần ra 0,8 s',
  };

  // Kiểm tra theo khung 12 nhịp (giống kiem_tra.py, không kiểm file ảnh/giọng vì web không thấy ổ đĩa)
  function kiemTra(tap, khung) {
    const loi = [], canhBao = [];
    const NHIP = Object.fromEntries(khung.nhip.map(n => [n.ma, n]));
    const {tl, tong} = timeline(tap);
    const thuc = tl.filter(s => !s._ao);
    const ma = thuc.map(s => s.ma);
    const viTri = Object.fromEntries(tl.map(s => [s.ma, s.bat_dau]));
    const nv = new Set([...(tap.nhan_vat || []).map(n => n.ma), 'DAN', 'DONG']);
    const dem = {};
    ma.forEach(m => dem[m] = (dem[m] || 0) + 1);
    const trung = Object.keys(dem).filter(m => dem[m] > 1);
    if (trung.length) loi.push({ma: null, t: `Mã shot bị trùng: ${trung.join(', ')}`});
    thuc.forEach(s => {
      if (!LOAI_SHOT.includes(s.loai)) loi.push({ma: s.ma, t: `loại '${s.loai}' không hợp lệ`});
      if (!CHUYEN_DONG.includes(s.chuyen_dong)) loi.push({ma: s.ma, t: `chuyển động '${s.chuyen_dong}' không hợp lệ`});
      if (!CHUYEN_VAO.includes(s.vao)) loi.push({ma: s.ma, t: `cách vào '${s.vao}' không hợp lệ`});
      if (!(+s.dai > 0)) loi.push({ma: s.ma, t: 'độ dài phải lớn hơn 0'});
      if (['anh', 'video'].includes(s.loai) && !(s.prompt || s.anh)) canhBao.push({ma: s.ma, t: 'chưa có prompt ảnh'});
      (s.nhan_vat || []).forEach(m => { if (!nv.has(m)) loi.push({ma: s.ma, t: `nhân vật '${m}' chưa khai báo`}); });
      const coDo = /\b(crimson|red|blood)\b/i.test(s.prompt || '');
      if (s.do && !coDo) canhBao.push({ma: s.ma, t: "đánh dấu đỏ sẫm nhưng prompt chưa ghi 'deep crimson'"});
      if (!s.do && coDo) canhBao.push({ma: s.ma, t: 'prompt có màu đỏ nhưng shot không đánh dấu đỏ sẫm (đỏ chỉ dành cho vật dẫn đường)'});
      s.thoai.forEach(c => {
        if (!nv.has(c.vai)) loi.push({ma: s.ma, t: `vai '${c.vai}' chưa khai báo`});
        const con = +s.dai - (+c.luc || 0);
        if ((+c.luc || 0) + c._dai > +s.dai + 0.05 && !c.tran)
          canhBao.push({ma: s.ma, t: `câu “${(c.loi || '').slice(0, 40)}…” cần ≈${c._dai.toFixed(1)} s nhưng chỉ còn ${con.toFixed(1)} s → kéo dài shot hoặc dời mốc bắt đầu`});
      });
    });
    const phim = Math.max(tong, +tap.tong_du_kien_s || 0) || 1;
    const theoNhip = {};
    const bang = [];
    (tap.canh || []).forEach((canh, ci) => {
      const ss = tl.filter(s => s.chi_so_canh === ci);
      if (!ss.length) { canhBao.push({ma: canh.ma, t: 'cảnh chưa có shot nào'}); return; }
      const bd = ss[0].bat_dau, kt = ss[ss.length - 1].bat_dau + +ss[ss.length - 1].dai, dai = kt - bd;
      const cat = ss.filter(s => s.bat_dau > 0.001 && !s._ao).length;
      const noi = ss.reduce((a, s) => a + s.thoai.reduce((b, c) => b + c._dai, 0), 0);
      const tu = ss.reduce((a, s) => a + s.thoai.reduce((b, c) => b + soTu(c.loi), 0), 0);
      bang.push({ma: canh.ma, ten: canh.ten || '', nhip: canh.nhip || '?', bd, kt, dai, cat, noi, tu, ns: ss.filter(s => !s._ao).length});
      const k = canh.nhip || '?';
      const n = theoNhip[k] = theoNhip[k] || {dai: 0, cat: 0, noi: 0, bd: null, kt: 0, canh: []};
      n.dai += dai; n.cat += cat; n.noi += noi; n.canh.push(canh.ma);
      n.bd = n.bd == null ? bd : Math.min(n.bd, bd); n.kt = Math.max(n.kt, kt);
    });
    const nhip = Object.entries(theoNhip).sort((a, b) => a[1].bd - b[1].bd).map(([k, n]) => {
      const q = NHIP[k];
      const cpm = n.dai ? n.cat / n.dai * 60 : 0, lp = n.dai ? Math.min(100, n.noi / n.dai * 100) : 0;
      const r = {ma: k, q, n, cpm, lp, vt: n.bd / phim * 100, lechVt: false, lechCat: false, lechLoi: false};
      if (!q) { canhBao.push({ma: n.canh.join(', '), t: `nhịp '${k}' không có trong khung 12 nhịp`}); return r; }
      if (k !== 'MOC_CREDIT' && (r.vt < q.vi_tri_pct[0] - 4 || r.vt > q.vi_tri_pct[1] + 2)) { r.lechVt = true; canhBao.push({ma: null, t: `Nhịp ${q.so} ${q.ten}: bắt đầu ở ${r.vt.toFixed(0)}% thời lượng, khung đề xuất ${q.vi_tri_pct[0]}–${q.vi_tri_pct[1]}%`}); }
      if (!(q.cat_phut[0] * 0.8 <= cpm && cpm <= q.cat_phut[1] * 1.2)) { r.lechCat = true; canhBao.push({ma: null, t: `Nhịp ${q.so} ${q.ten}: ${cpm.toFixed(1)} cắt/phút, mục tiêu ${q.cat_phut[0]}–${q.cat_phut[1]}`}); }
      if (!(q.loi_pct[0] - 8 <= lp && lp <= q.loi_pct[1] + 8)) { r.lechLoi = true; canhBao.push({ma: null, t: `Nhịp ${q.so} ${q.ten}: có lời ${lp.toFixed(0)}%, mục tiêu ${q.loi_pct[0]}–${q.loi_pct[1]}%`}); }
      return r;
    });
    khung.nhip.filter(n => !theoNhip[n.ma]).forEach(n => canhBao.push({ma: null, t: `Chưa có cảnh nào cho nhịp ${n.so} – ${n.ten}`}));
    const gt = (tap.gieo_tra || []).map(g => {
      const moc = [];
      ['gieo', 'nhac', 'tra'].forEach(k => (g[k] || []).forEach(m => {
        if (!(m in viTri)) loi.push({ma: m, t: `Gieo–trả '${g.ma}': shot ${m} không tồn tại`});
        else moc.push({k, m, t: viTri[m]});
      }));
      if (!(g.gieo || []).length || !(g.tra || []).length) canhBao.push({ma: null, t: `Gieo–trả '${g.ma}': thiếu ${(g.gieo || []).length ? 'trả' : 'gieo'}`});
      const gT = moc.filter(x => x.k === 'gieo').map(x => x.t), tT = moc.filter(x => x.k === 'tra').map(x => x.t);
      if (gT.length && tT.length && Math.max(...gT) >= Math.min(...tT)) loi.push({ma: null, t: `Gieo–trả '${g.ma}': có lần trả nằm trước lần gieo`});
      return {g, moc: moc.sort((a, b) => a.t - b.t)};
    });
    const tongCat = thuc.filter(s => s.bat_dau > 0.001).length;
    const daiShot = thuc.filter(s => ['anh', 'video'].includes(s.loai)).map(s => +s.dai).sort((a, b) => a - b);
    const noiTong = tl.reduce((a, s) => a + s.thoai.reduce((b, c) => b + c._dai, 0), 0);
    const cpmT = tong ? tongCat / tong * 60 : 0;
    const mt = khung.toan_phim.cat_phut.muc_tieu;
    if (tong && !(mt[0] * 0.8 <= cpmT && cpmT <= mt[1] * 1.2)) canhBao.push({ma: null, t: `Toàn phim ${cpmT.toFixed(1)} cắt/phút, mục tiêu ${mt[0]}–${mt[1]}`});
    return {loi, canhBao, bang, nhip, gt, tong, tongCat, cpm: cpmT, trungVi: daiShot.length ? daiShot[Math.floor(daiShot.length / 2)] : 0,
      soDen: tl.filter(s => s.loai === 'den').length, loiPct: tong ? Math.min(100, noiTong / tong * 100) : 0, soShot: thuc.length,
      soCau: tl.reduce((a, s) => a + s.thoai.length, 0), phim};
  }

  // Khung tập mới (giống lap_khung.py)
  function lapKhung(khung, maTap, tieuDe, phut) {
    const tong = phut * 60;
    const canh = khung.nhip.map((n, i) => {
      const dai = (n.vi_tri_pct[1] - n.vi_tri_pct[0]) / 100 * tong;
      const cpm = (n.cat_phut[0] + n.cat_phut[1]) / 2;
      const so = Math.max(1, Math.round(dai * cpm / 60));
      const ma = `C${String(i + 1).padStart(2, '0')}`;
      return {ma, ten: n.ten, nhip: n.ma, muc_dich: n.viec,
        ket_thuc: ['THU_THACH', 'DINH_ACTION'].includes(n.ma) ? {kieu: 'cat'} : {kieu: 'fade_den', dai: 1.5}, nhac: null,
        shot: Array.from({length: so}, (_, k) => ({ma: `${ma}_S${String(k + 1).padStart(2, '0')}`, dai: Math.round(dai / so * 100) / 100, vao: 'cat',
          co_canh: '', goc: '', chuyen_dong: 'dung', do: false, noi_dung: '', prompt: '', nhan_vat: [], thoai: [], chu: [], am_thanh: []}))};
    });
    return {ma_tap: maTap, tieu_de: tieuDe, tong_du_kien_s: Math.round(tong), fps: 24, rong: 1920, cao: 1080, phong_cach_prompt: STYLE,
      mau_nhan: {do_sam: '#7A1414', ghi_chu: 'chỉ dùng cho vật dẫn đường'}, chu_de: '', giong_phan_de: '', vat_dan_duong: [],
      nhan_vat: [{ma: 'DAN', ten: 'Người dẫn', loai: 'giọng', giong: 'nam trầm, 155 từ/phút'}], gieo_tra: [], canh};
  }

  // Đánh lại mã shot theo thứ tự trong cảnh (dùng sau khi thêm/xóa/đổi chỗ)
  function danhMaLai(tap) {
    const doi = {};
    tap.canh.forEach(c => (c.shot || []).forEach((s, i) => {
      const moi = `${c.ma}_S${String(i + 1).padStart(2, '0')}`;
      if (s.ma && s.ma !== moi) doi[s.ma] = moi;
      s.ma = moi;
    }));
    (tap.gieo_tra || []).forEach(g => ['gieo', 'nhac', 'tra'].forEach(k => g[k] = (g[k] || []).map(m => doi[m] || m)));
    return doi;
  }

  // CSV bảng shot (mở bằng Excel)
  function csv(tap) {
    const {tl} = timeline(tap);
    const rows = [['Mã shot', 'Cảnh', 'Nhịp', 'Bắt đầu', 'Dài (s)', 'Loại', 'Vào bằng', 'Cỡ cảnh', 'Góc', 'Chuyển động', 'Đỏ sẫm', 'Nhân vật', 'Nội dung', 'Thoại', 'Chữ trên hình', 'Âm thanh', 'Prompt đầy đủ', 'File ảnh', 'Trạng thái']];
    tl.filter(s => !s._ao).forEach(s => rows.push([s.ma, s.canh.ma, s.canh.nhip || '', tc(s.bat_dau), s.dai, s.loai, VAO_VI[s.vao] || s.vao, s.co_canh || '', s.goc || '',
      CD_VI[s.chuyen_dong] || s.chuyen_dong, s.do ? 'x' : '', (s.nhan_vat || []).join(', '), s.noi_dung || '',
      s.thoai.map(c => `${c.vai}: ${c.loi}`).join(' | '), (s.chu || []).map(x => (x.dong || []).join(' / ')).join(' | '), (s.am_thanh || []).join(', '),
      promptDayDu(tap, s), s.anh || anhMacDinh(s), '']));
    return '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  }

  return {tc, soTu, uocLuongDoc, chuan, timeline, promptDayDu, anhMacDinh, keyframe, kiemTra, lapKhung, danhMaLai, csv,
    CHUYEN_DONG, CHUYEN_VAO, LOAI_SHOT, CD_VI, VAO_VI, VAO_HD, CHU_HD, STYLE};
})();
