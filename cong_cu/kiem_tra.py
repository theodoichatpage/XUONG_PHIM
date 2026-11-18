"""Kiểm tra một tập phim (tap.json) theo quy chuẩn 12 nhịp: thời lượng, nhịp cắt, tỉ lệ lời, thoại có lọt shot không,
quy tắc màu đỏ, nhân vật, các cặp gieo – trả, file ảnh/giọng còn thiếu. Ghi kết quả ra <tập>/kiem_tra.md.

Cách chạy:  python cong_cu/kiem_tra.py tap/T01_nhu_nguyet
"""
import argparse
import re
from collections import defaultdict

import sys as _sys, pathlib as _pl; _sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from chung import KHUNG, NHIP, CHUYEN_DONG, CHUYEN_VAO, LOAI_SHOT, doc_tap, timeline, tc, so_tu, tim_anh, tim_giong, utf8_stdout


def kiem_tra(tap, thu_muc):
    loi, canh_bao, tot = [], [], []
    tl, tong = timeline(tap, thu_muc)
    ma_shot = [s["ma"] for s in tl if not s.get("_ao")]
    vi_tri = {s["ma"]: s["bat_dau"] for s in tl}
    nv = {n["ma"] for n in tap.get("nhan_vat", [])} | {"DAN", "DONG"}

    # ---- cấu trúc
    trung = {m for m in ma_shot if ma_shot.count(m) > 1}
    if trung:
        loi.append(f"Mã shot bị trùng: {', '.join(sorted(trung))}")
    for s in tl:
        if s.get("_ao"):
            continue
        if s.get("loai") not in LOAI_SHOT:
            loi.append(f"{s['ma']}: loai '{s.get('loai')}' không hợp lệ ({', '.join(sorted(LOAI_SHOT))})")
        if s["chuyen_dong"] not in CHUYEN_DONG:
            loi.append(f"{s['ma']}: chuyen_dong '{s['chuyen_dong']}' không hợp lệ ({', '.join(sorted(CHUYEN_DONG))})")
        if s["vao"] not in CHUYEN_VAO:
            loi.append(f"{s['ma']}: vao '{s['vao']}' không hợp lệ ({', '.join(sorted(CHUYEN_VAO))})")
        if float(s["dai"]) <= 0:
            loi.append(f"{s['ma']}: dai phải > 0")
        if s.get("loai") in ("anh", "video") and not (s.get("prompt") or s.get("anh")):
            canh_bao.append(f"{s['ma']}: chưa có prompt ảnh")
        for m in s.get("nhan_vat", []):
            if m not in nv:
                loi.append(f"{s['ma']}: nhân vật '{m}' chưa khai báo trong nhan_vat")
        # quy tắc màu đỏ: chỉ vật dẫn đường
        p = (s.get("prompt") or "").lower()
        co_do = bool(re.search(r"\b(crimson|red|blood)\b", p))
        if s.get("do") and not co_do:
            canh_bao.append(f"{s['ma']}: đánh dấu do=true nhưng prompt chưa ghi 'deep crimson'")
        if not s.get("do") and co_do:
            canh_bao.append(f"{s['ma']}: prompt có màu đỏ nhưng do=false (đỏ chỉ dành cho vật dẫn đường)")
        # thoại có lọt trong shot không
        for cau in s["thoai"]:
            if cau.get("vai") not in nv:
                loi.append(f"{s['ma']}: vai '{cau.get('vai')}' chưa khai báo")
            het = float(cau.get("luc", 0)) + cau["_dai"]
            if het > float(s["dai"]) + 0.05 and not cau.get("tran"):
                canh_bao.append(f"{s['ma']}: câu \"{(cau.get('loi') or '')[:40]}…\" cần ≈{cau['_dai']:.1f}s"
                                f"{' (đo từ file)' if cau['_that'] else ' (ước lượng)'} nhưng chỉ còn {float(s['dai']) - float(cau.get('luc', 0)):.1f}s"
                                " → kéo dài shot, dời 'luc', hoặc ghi \"tran\": true nếu cố ý cho lời tràn sang shot sau")

    # ---- theo cảnh và theo nhịp
    bang = []
    theo_nhip = defaultdict(lambda: {"dai": 0.0, "cat": 0, "noi": 0.0, "bd": None, "kt": 0.0, "canh": []})
    for ci, canh in enumerate(tap["canh"]):
        ss = [s for s in tl if s["chi_so_canh"] == ci]
        bd = ss[0]["bat_dau"]
        kt = ss[-1]["bat_dau"] + float(ss[-1]["dai"])
        dai = kt - bd
        cat = sum(1 for s in ss if s["bat_dau"] > 0.001 and not s.get("_ao"))
        noi = sum(c["_dai"] for s in ss for c in s["thoai"])
        tu = sum(so_tu(c.get("loi")) for s in ss for c in s["thoai"])
        bang.append((canh["ma"], canh.get("ten", ""), canh.get("nhip", "?"), bd, kt, dai, cat, noi, tu, len([s for s in ss if not s.get('_ao')])))
        n = theo_nhip[canh.get("nhip", "?")]
        n["dai"] += dai; n["cat"] += cat; n["noi"] += noi; n["canh"].append(canh["ma"])
        n["bd"] = bd if n["bd"] is None else min(n["bd"], bd); n["kt"] = max(n["kt"], kt)

    # vị trí % tính trên tổng thời lượng (khung 12 nhịp cũng tính như vậy, credit là 88–100%)
    # khi tập mới viết một phần, dùng tổng dự kiến để so vị trí
    phim = max(tong, float(tap.get("tong_du_kien_s") or 0)) or 1.0
    nhip_rows = []
    for ma, n in sorted(theo_nhip.items(), key=lambda kv: kv[1]["bd"]):
        q = NHIP.get(ma)
        cpm = n["cat"] / n["dai"] * 60 if n["dai"] else 0
        lp = min(100, n["noi"] / n["dai"] * 100) if n["dai"] else 0
        if not q:
            canh_bao.append(f"Cảnh {', '.join(n['canh'])}: nhịp '{ma}' không có trong khung 12 nhịp")
            nhip_rows.append((ma, "?", n, cpm, lp, "", "", ""))
            continue
        vt = (n["bd"] / phim * 100, min(100, n["kt"] / phim * 100))
        lech_vt = ""
        if ma != "MOC_CREDIT" and (vt[0] < q["vi_tri_pct"][0] - 4 or vt[0] > q["vi_tri_pct"][1] + 2):
            lech_vt = "⚠"
            canh_bao.append(f"Nhịp {q['so']} {q['ten']}: bắt đầu ở {vt[0]:.0f}% thời lượng, khung đề xuất {q['vi_tri_pct'][0]}–{q['vi_tri_pct'][1]}%")
        lc = "⚠" if not (q["cat_phut"][0] * 0.8 <= cpm <= q["cat_phut"][1] * 1.2) else ""
        if lc:
            canh_bao.append(f"Nhịp {q['so']} {q['ten']}: {cpm:.1f} cắt/phút, mục tiêu {q['cat_phut'][0]}–{q['cat_phut'][1]}")
        ll = "⚠" if not (q["loi_pct"][0] - 8 <= lp <= q["loi_pct"][1] + 8) else ""
        if ll:
            canh_bao.append(f"Nhịp {q['so']} {q['ten']}: có lời {lp:.0f}%, mục tiêu {q['loi_pct'][0]}–{q['loi_pct'][1]}%")
        nhip_rows.append((ma, q, n, cpm, lp, lech_vt, lc, ll))
    co = {k for k in theo_nhip}
    thieu = [n for n in KHUNG["nhip"] if n["ma"] not in co]
    for n in thieu:
        canh_bao.append(f"Chưa có cảnh nào cho nhịp {n['so']} – {n['ten']}")

    # ---- gieo – trả
    gt_rows = []
    for g in tap.get("gieo_tra", []):
        moc = []
        for k in ("gieo", "nhac", "tra"):
            for m in g.get(k, []):
                if m not in vi_tri:
                    loi.append(f"Gieo–trả '{g['ma']}': shot {m} ({k}) không tồn tại")
                else:
                    moc.append((k, m, vi_tri[m]))
        if not g.get("gieo") or not g.get("tra"):
            canh_bao.append(f"Gieo–trả '{g['ma']}': thiếu {'gieo' if not g.get('gieo') else 'trả'}")
        gieo_t = [t for k, m, t in moc if k == "gieo"]
        tra_t = [t for k, m, t in moc if k == "tra"]
        if gieo_t and tra_t and max(gieo_t) >= min(tra_t):
            loi.append(f"Gieo–trả '{g['ma']}': có lần trả nằm trước lần gieo")
        gt_rows.append((g, sorted(moc, key=lambda x: x[2])))

    # ---- tổng phim
    tong_cat = sum(1 for s in tl if s["bat_dau"] > 0.001 and not s.get("_ao"))
    so_den = sum(1 for s in tl if s.get("loai") == "den")
    noi_tong = sum(c["_dai"] for s in tl for c in s["thoai"])
    dai_shot = sorted(float(s["dai"]) for s in tl if not s.get("_ao") and s.get("loai") in ("anh", "video"))
    trung_vi = dai_shot[len(dai_shot) // 2] if dai_shot else 0
    anh_co = sum(1 for s in tl if s.get("loai") in ("anh", "video") and not s.get("_ao") and tim_anh(thu_muc, s))
    anh_can = sum(1 for s in tl if s.get("loai") in ("anh", "video") and not s.get("_ao"))
    cau = [c for s in tl for c in s["thoai"]]
    giong_co = sum(1 for c in cau if tim_giong(thu_muc, c))
    tp = KHUNG["toan_phim"]
    cpm_t = tong_cat / tong * 60 if tong else 0
    if not (tp["cat_phut"]["muc_tieu"][0] * 0.8 <= cpm_t <= tp["cat_phut"]["muc_tieu"][1] * 1.2):
        canh_bao.append(f"Toàn phim {cpm_t:.1f} cắt/phút, mục tiêu {tp['cat_phut']['muc_tieu']}")
    return dict(loi=loi, canh_bao=canh_bao, bang=bang, nhip=nhip_rows, gt=gt_rows, tong=tong, tong_cat=tong_cat, so_den=so_den,
                noi_tong=noi_tong, trung_vi=trung_vi, anh=(anh_co, anh_can), giong=(giong_co, len(cau)), cpm=cpm_t)


def bao_cao(tap, r):
    L = [f"# Kiểm tra tập {tap.get('ma_tap', '')}: {tap.get('tieu_de', '')}", ""]
    L.append(f"**Kết quả:** {len(r['loi'])} lỗi, {len(r['canh_bao'])} cảnh báo.  ")
    L.append(f"Tổng thời lượng **{tc(r['tong'])}** · {r['tong_cat']} điểm cắt ({r['cpm']:.1f} cắt/phút) · trung vị shot {r['trung_vi']:.2f} s · "
             f"{r['so_den']} màn đen · có lời ≈{min(100, r['noi_tong'] / r['tong'] * 100) if r['tong'] else 0:.0f}% · "
             f"ảnh {r['anh'][0]}/{r['anh'][1]} · giọng {r['giong'][0]}/{r['giong'][1]} câu")
    L.append("")
    L.append("_Thời lượng lời: câu có file giọng thì đo thật, chưa có thì ước lượng (người dẫn 155 từ/phút, thoại 110 từ/phút)._")
    L.append("")
    if r["loi"]:
        L += ["## Lỗi (phải sửa)", ""] + [f"- {x}" for x in r["loi"]] + [""]
    if r["canh_bao"]:
        L += ["## Cảnh báo (nên xem)", ""] + [f"- {x}" for x in r["canh_bao"]] + [""]
    L += ["## So với khung 12 nhịp", "", "| Nhịp | Vị trí | Dài | Cắt/phút (mục tiêu) | Có lời (mục tiêu) | Cảnh |", "|---|---|---|---|---|---|"]
    phim = max(r["tong"], float(tap.get("tong_du_kien_s") or 0)) or 1.0
    for ma, q, n, cpm, lp, a, b, c in r["nhip"]:
        ten = f"{q['so']}. {q['ten']}" if isinstance(q, dict) else ma
        mt_c = f"{q['cat_phut'][0]}–{q['cat_phut'][1]}" if isinstance(q, dict) else "?"
        mt_l = f"{q['loi_pct'][0]}–{q['loi_pct'][1]}%" if isinstance(q, dict) else "?"
        L.append(f"| {ten} | {tc(n['bd'])} ({n['bd'] / phim * 100:.0f}%) {a} | {n['dai']:.0f}s | {cpm:.1f} ({mt_c}) {b} | {lp:.0f}% ({mt_l}) {c} | {', '.join(n['canh'])} |")
    L += ["", "## Theo cảnh", "", "| Cảnh | Tên | Nhịp | Vào | Ra | Dài | Shot | Cắt/phút | Lời (s) | Từ |", "|---|---|---|---|---|---|---|---|---|---|"]
    for m, ten, nh, bd, kt, dai, cat, noi, tu, ns in r["bang"]:
        L.append(f"| {m} | {ten} | {nh} | {tc(bd)} | {tc(kt)} | {dai:.1f}s | {ns} | {cat / dai * 60 if dai else 0:.1f} | {noi:.1f} | {tu} |")
    if r["gt"]:
        L += ["", "## Gieo – trả", ""]
        for g, moc in r["gt"]:
            chuoi = " → ".join(f"{k} {m} ({tc(t)})" for k, m, t in moc)
            L.append(f"- **{g['ma']}** ({g.get('mo_ta', '')}): {chuoi}")
    return "\n".join(L) + "\n"


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tap", help="thư mục tập (chứa tap.json) hoặc đường dẫn tap.json")
    a = ap.parse_args()
    tap, thu_muc = doc_tap(a.tap)
    r = kiem_tra(tap, thu_muc)
    md = bao_cao(tap, r)
    (thu_muc / "kiem_tra.md").write_text(md, encoding="utf-8")
    print(md.split("## So với khung")[0])
    print(f"→ Báo cáo đầy đủ: {thu_muc / 'kiem_tra.md'}")
    raise SystemExit(1 if r["loi"] else 0)


if __name__ == "__main__":
    main()
