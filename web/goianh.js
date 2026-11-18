// Gói ảnh: kịch bản chi tiết từng shot để công cụ tạo ảnh (Man) tự dựng prompt theo quy định riêng của nó.
// Gói chỉ mô tả NỘI DUNG (thấy gì, ai, làm gì, khung hình, bối cảnh, liên tục, kích thước) – không có prompt, không có phong cách.
// Dùng chung cho trang web và cho script build (node cong_cu/xuat_goi_anh.js).
'use strict';

const GOIANH = (() => {
  const KHUNG = {
    ELS: ['16–24 mm', 'Toàn cảnh rất xa: chủ thể rất nhỏ (dưới 15% khung), đường chân trời ở 1/3, nhiều khoảng trống.'],
    WS: ['24–28 mm', 'Toàn cảnh: thấy toàn thân và bối cảnh, người chiếm khoảng 1/3–1/2 chiều cao khung.'],
    MS: ['35 mm', 'Trung cảnh: từ hông trở lên, chủ thể theo quy tắc 1/3.'],
    MCU: ['50 mm', 'Cận trung: từ ngực trở lên, mắt ở đường 1/3 trên.'],
    CU: ['85 mm', 'Cận: khuôn mặt chiếm 1/2–2/3 khung, nền mờ.'],
    ECU: ['100 mm macro', 'Đặc tả: một chi tiết (mắt, bàn tay, đồ vật) lấp gần kín khung.'],
    OTS: ['50 mm', 'Qua vai: vai/đầu nhân vật tiền cảnh mờ chiếm khoảng 1/3 khung, người đối diện rõ nét.'],
    Insert: ['85–100 mm', 'Cận vật thể, nền tối giản.'],
    'Top-down': ['24–35 mm', 'Nhìn thẳng từ trên xuống, bố cục đồ họa.'],
    'Bản đồ': ['phẳng', 'Bản đồ nhìn thẳng từ trên xuống như tờ giấy trải phẳng.'],
    'Tranh cuộn': ['phẳng', 'Tranh cuộn ngang trải phẳng, nhân vật nhỏ, nhiều chi tiết.'],
    'Tựa': ['phẳng', 'Để trống vùng giữa khung cho chữ tựa phim.'],
  };
  const GOC = {
    'ngang': 'ngang tầm mắt', 'hếch': 'góc thấp, máy dưới tầm mắt nhìn lên', 'cao': 'góc cao, máy trên cao nhìn xuống',
    'thẳng xuống': 'nhìn thẳng từ trên xuống', 'thấp': 'máy sát mặt đất', 'thấp sát nước': 'máy sát mặt nước', 'thấp sát mặt nước': 'máy sát mặt nước',
  };
  // bỏ các cụm mô tả kiểu vẽ có sẵn trong kịch bản, chỉ giữ nội dung
  const KIEU_VE = [/,?\s*(everything else\s*)?stark black-and-white ink wash on white paper, splattered black ink, no color/gi,
    /ancient Vietnamese horizontal handscroll painting on aged paper, fine ink lines, figures small,?\s*/gi,
    /top-down view of a hand-drawn ink map on aged paper, Song dynasty and Dai Viet territories, a river line, no labels,?\s*/gi,
    /,?\s*fire rendered in pale white and grey glow/gi];
  const noiDung = p => KIEU_VE.reduce((s, r) => s.replace(r, ''), p || '').replace(/\s+,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '');

  // kích thước khuyên dùng theo chuyển động máy khi dựng (để zoom/lia không vỡ hình)
  function kichThuoc(s, rong, cao) {
    const d = +s.dai || 0, toc = +(s.toc_do || 1.5);
    let he = 1;
    switch (s.chuyen_dong) {
      case 'day_vao': case 'keo_ra': he = 1 + toc * d / 100; break;
      case 'lia_trai': case 'lia_phai': he = 1.15; break;
      case 'len': case 'xuong': he = 1.12; break;
      case 'zoom_giat': he = 1.3; break;
      case 'rung': he = 1.05; break;
    }
    const can = Math.ceil(rong * he);
    const muc = [1920, 2560, 3840, 5120].find(w => w >= can) || 5120;
    const le = {dung: 'Không cần lề thêm.', day_vao: `Khi dựng sẽ đẩy vào tới ${Math.round(he * 100)}%: giữ chủ thể ở vùng giữa, không để chi tiết quan trọng sát mép.`,
      keo_ra: `Khi dựng bắt đầu ở ${Math.round(he * 100)}% rồi kéo ra: mép khung lộ dần, mép phải sạch và có nghĩa.`,
      lia_trai: 'Khi dựng lia ngang ở 115%: chừa khoảng 8% mỗi bên trái/phải.', lia_phai: 'Khi dựng lia ngang ở 115%: chừa khoảng 8% mỗi bên trái/phải.',
      len: 'Khi dựng lia dọc ở 112%: chừa khoảng 6% trên/dưới.', xuong: 'Khi dựng lia dọc ở 112%: chừa khoảng 6% trên/dưới.',
      zoom_giat: 'Khi dựng zoom giật lên 130% vào tâm khung: điểm nhấn phải nằm đúng giữa.', rung: 'Khi dựng rung nhẹ ở 105%: chừa khoảng 3% mỗi mép.'}[s.chuyen_dong] || '';
    return {he_so: +he.toFixed(3), toi_thieu: `${can}x${Math.ceil(can * cao / rong)}`, khuyen: `${muc}x${Math.round(muc * cao / rong)}`, le_an_toan: le};
  }

  function tao(tap, nguon) {
    tap = XP.chuan(JSON.parse(JSON.stringify(tap)));
    const {tl} = XP.timeline(tap);
    const nv = Object.fromEntries((tap.nhan_vat || []).map(n => [n.ma, n]));
    const shots = tl.filter(s => !s._ao && ['anh', 'video'].includes(s.loai));
    const ds = shots.map((s, i) => {
      const c = s.canh;
      const bc = Object.assign({}, c.boi_canh || {}, s.boi_canh || {});
      const cungCanh = shots.filter(x => x.canh === c);
      const k = cungCanh.indexOf(s);
      const truoc = cungCanh[k - 1], sau = cungCanh[k + 1];
      const denTrang = /black-and-white|black and white/i.test(s.prompt || '');
      const lienTuc = [];
      if (truoc && (truoc.nhan_vat || []).some(m => (s.nhan_vat || []).includes(m))) lienTuc.push(`Cùng nhân vật với ${truoc.ma}: giữ nguyên trang phục, vết thương, đạo cụ.`);
      if (sau && (sau.nhan_vat || []).some(m => (s.nhan_vat || []).includes(m))) lienTuc.push(`Shot sau ${sau.ma} có cùng nhân vật: đồng bộ chi tiết.`);
      const ghiChuTruyen = [];
      if (s.do) ghiChuTruyen.push('Vật dẫn đường mang màu đỏ sẫm #7A1414 – là điểm màu duy nhất của shot.');
      if (denTrang) ghiChuTruyen.push('Cảnh thuộc đoạn vẽ đen trắng (trận cuối).');
      if (s.co_canh === 'Tranh cuộn') ghiChuTruyen.push('Hình là một bức tranh cuộn cổ (đoạn kể lịch sử).');
      if (s.co_canh === 'Bản đồ') ghiChuTruyen.push('Hình là bản đồ (đoạn thuyết minh).');
      if (s.ghi_chu) ghiChuTruyen.push(s.ghi_chu);
      return {
        thu_tu: i + 1, ma: s.ma, canh: c.ma, ten_canh: c.ten || '', loai: s.loai,
        file: s.anh || XP.anhMacDinh(s),
        bat_dau: +s.bat_dau.toFixed(2), dai_s: +s.dai,
        mo_ta: s.noi_dung || '',
        noi_dung_en: noiDung(s.prompt),
        khung_hinh: {co_canh: s.co_canh || '', goc_may: GOC[s.goc] || s.goc || '', ong_kinh: (KHUNG[s.co_canh] || ['', ''])[0], bo_cuc: (KHUNG[s.co_canh] || ['', ''])[1]},
        boi_canh: {thoi_diem: bc.thoi_diem || '', dia_diem: bc.dia_diem || '', anh_sang: bc.anh_sang || ''},
        nhan_vat: (s.nhan_vat || []).map(m => ({ma: m, ten: nv[m]?.ten || m, anh_mau: nv[m]?.anh_mau || `so_nhan_vat/${m}.png`})),
        thoai_trong_shot: (s.thoai || []).map(t => `${nv[t.vai]?.ten || t.vai}${t.cam_xuc ? ` (${t.cam_xuc})` : ''}: ${t.loi.replace(/\s*\/\/\s*/g, '… ').replace(/\s*\/\s*/g, ' ')}`),
        do_sam: !!s.do, den_trang: denTrang, ghi_chu_truyen: ghiChuTruyen,
        dung: {chuyen_dong_may: XP.CD_VI[s.chuyen_dong] || s.chuyen_dong, ...kichThuoc(s, tap.rong, tap.cao)},
        anh_nen: s.tach_lop ? {can: true, file: (s.anh || XP.anhMacDinh(s)).replace(/\.png$/, '_nen.png'), mo_ta: 'Cùng bối cảnh, góc máy và bố cục với shot nhưng không có người (để tách lớp parallax).'} : {can: false},
        video_ai: s.ai_video ? {can: true, chuyen_dong: s.chuyen_dong_ai || ''} : {can: false},
        lien_tuc: {truoc: truoc ? truoc.ma : null, sau: sau ? sau.ma : null, ghi_chu: lienTuc},
      };
    });
    const nhanVat = (tap.nhan_vat || []).filter(n => n.nhan_dang && n.loai !== 'giọng').map(n => ({
      ma: n.ma, ten: n.ten, loai: n.loai, dac_diem_en: n.nhan_dang, anh_mau: n.anh_mau || `so_nhan_vat/${n.ma}.png`,
      so_shot: ds.filter(s => s.nhan_vat.some(x => x.ma === n.ma)).length,
      shot_dau_tien: (ds.find(s => s.nhan_vat.some(x => x.ma === n.ma)) || {}).ma || null,
    }));
    return {
      phien_ban: 2, loai: 'goi_anh_xuong_phim_vox', ma_tap: tap.ma_tap, tieu_de: tap.tieu_de, nguon_kich_ban: nguon || '',
      ghi_chu: 'Gói chỉ mô tả nội dung từng shot. Prompt và phong cách ảnh do công cụ tạo ảnh tự dựng theo quy định riêng.',
      quy_cach: {ti_le: '16:9', kich_thuoc_toi_thieu: `${tap.rong}x${tap.cao}`,
        dat_ten: 'Lưu ảnh đúng đường dẫn ở trường "file" (vd. anh/C04/C04_S05.png); ảnh nền tách lớp ở "anh_nen.file".',
        quy_tac_mau_truyen: 'Đỏ sẫm #7A1414 chỉ xuất hiện ở shot có do_sam = true (vật dẫn đường).'},
      cau_chu_de: tap.chu_de || '', vat_dan_duong: tap.vat_dan_duong || [],
      thong_ke: {so_shot_can_anh: ds.length, so_shot_do_sam: ds.filter(s => s.do_sam).length, so_shot_den_trang: ds.filter(s => s.den_trang).length,
        so_anh_nen: ds.filter(s => s.anh_nen.can).length, so_nhan_vat: nhanVat.length},
      nhan_vat: nhanVat,
      shot: ds,
    };
  }

  function markdown(g) {
    const L = [`# Gói ảnh – ${g.tieu_de} (${g.ma_tap})`, '', g.ghi_chu, '',
      `${g.thong_ke.so_shot_can_anh} shot cần ảnh · ${g.thong_ke.so_nhan_vat} nhân vật · ${g.thong_ke.so_shot_do_sam} shot đỏ sẫm · ${g.thong_ke.so_shot_den_trang} shot đen trắng · ${g.thong_ke.so_anh_nen} ảnh nền tách lớp.`, '',
      `**Quy cách:** ${g.quy_cach.ti_le}, tối thiểu ${g.quy_cach.kich_thuoc_toi_thieu}. ${g.quy_cach.dat_ten}  `, `**Màu theo truyện:** ${g.quy_cach.quy_tac_mau_truyen}`, '',
      g.cau_chu_de ? `**Câu chủ đề:** ${g.cau_chu_de}  ` : '', g.vat_dan_duong.length ? `**Vật dẫn đường:** ${g.vat_dan_duong.join('; ')}` : '', '', '## Nhân vật', ''];
    g.nhan_vat.forEach(n => L.push(`- **${n.ten}** (${n.ma}${n.loai ? `, ${n.loai}` : ''}) – ${n.so_shot} shot, xuất hiện đầu ở ${n.shot_dau_tien}. Ảnh mẫu: \`${n.anh_mau}\`. Đặc điểm: ${n.dac_diem_en}`));
    L.push('', '## Shot');
    let cur = null;
    g.shot.forEach(s => {
      if (s.canh !== cur) { cur = s.canh; L.push('', `### ${s.canh} – ${s.ten_canh}`, `_${[s.boi_canh.thoi_diem, s.boi_canh.dia_diem].filter(Boolean).join(' · ')}_`, ''); }
      L.push(`#### ${s.ma} · ${s.khung_hinh.co_canh} · ${s.dai_s} s${s.do_sam ? ' · ĐỎ SẪM' : ''}${s.den_trang ? ' · ĐEN TRẮNG' : ''}`,
        `- **Hình:** ${s.mo_ta}`,
        s.noi_dung_en ? `- **Nội dung (tiếng Anh, tham khảo):** ${s.noi_dung_en}` : null,
        `- **Khung hình:** ${s.khung_hinh.co_canh}, ${s.khung_hinh.goc_may}, ${s.khung_hinh.ong_kinh}. ${s.khung_hinh.bo_cuc}`,
        s.boi_canh.anh_sang ? `- **Bối cảnh / ánh sáng:** ${s.boi_canh.anh_sang}` : null,
        s.nhan_vat.length ? `- **Nhân vật:** ${s.nhan_vat.map(n => `${n.ten} (\`${n.anh_mau}\`)`).join(', ')}` : null,
        s.thoai_trong_shot.length ? `- **Thoại trong shot (để đặt biểu cảm):** ${s.thoai_trong_shot.join(' | ')}` : null,
        s.ghi_chu_truyen.length ? `- **Ghi chú truyện:** ${s.ghi_chu_truyen.join(' ')}` : null,
        s.lien_tuc.ghi_chu.length ? `- **Liên tục:** ${s.lien_tuc.ghi_chu.join(' ')}` : null,
        `- **Lưu:** \`${s.file}\` · khuyên ${s.dung.khuyen} (tối thiểu ${s.dung.toi_thieu}). ${s.dung.le_an_toan}`,
        s.anh_nen.can ? `- **Ảnh nền:** \`${s.anh_nen.file}\` – ${s.anh_nen.mo_ta}` : null, '');
    });
    return L.filter(x => x !== null).join('\n');
  }

  function csv(g) {
    const rows = [['Thứ tự', 'Mã shot', 'Cảnh', 'File lưu', 'Kích thước khuyên', 'Mô tả hình', 'Nội dung (EN, tham khảo)', 'Cỡ cảnh', 'Góc máy', 'Ống kính', 'Bố cục', 'Thời điểm', 'Ánh sáng',
      'Nhân vật (ảnh mẫu)', 'Thoại trong shot', 'Đỏ sẫm', 'Đen trắng', 'Ghi chú truyện', 'Liên tục', 'Lề an toàn', 'Ảnh nền', 'Trạng thái']];
    g.shot.forEach(s => rows.push([s.thu_tu, s.ma, s.canh, s.file, s.dung.khuyen, s.mo_ta, s.noi_dung_en, s.khung_hinh.co_canh, s.khung_hinh.goc_may, s.khung_hinh.ong_kinh, s.khung_hinh.bo_cuc,
      s.boi_canh.thoi_diem, s.boi_canh.anh_sang, s.nhan_vat.map(n => `${n.ten} (${n.anh_mau})`).join('; '), s.thoai_trong_shot.join(' | '), s.do_sam ? 'x' : '', s.den_trang ? 'x' : '',
      s.ghi_chu_truyen.join(' '), s.lien_tuc.ghi_chu.join(' '), s.dung.le_an_toan, s.anh_nen.can ? s.anh_nen.file : '', '']));
    return '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  }

  return {tao, markdown, csv, kichThuoc};
})();
if (typeof module !== 'undefined') module.exports = GOIANH;
