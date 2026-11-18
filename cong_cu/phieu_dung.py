"""Xuất tài liệu sản xuất từ tap.json:
  - bang_shot.csv   : bảng shot mở bằng Excel/Google Sheets để đánh dấu tiến độ
  - phieu_dung.md   : phiếu dựng CapCut từng shot (mốc timeline, keyframe Tỷ lệ/Vị trí, chuyển cảnh, chữ, âm thanh)
  - prompt_anh.txt  : prompt ảnh đầy đủ (đã ghép phong cách) để copy sang công cụ AI
  - kich_ban_doc.md : kịch bản đọc cho người lồng tiếng / giọng AI, kèm tên file cần xuất

Cách chạy:  python cong_cu/phieu_dung.py tap/T01_nhu_nguyet
"""
import argparse
import csv

import sys as _sys, pathlib as _pl; _sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from chung import doc_tap, timeline, tc, prompt_day_du, tim_anh, tim_giong, anh_mac_dinh, utf8_stdout

CD_VI = {"dung": "Đứng yên", "day_vao": "Đẩy vào chậm", "keo_ra": "Kéo ra chậm", "lia_trai": "Lia sang trái", "lia_phai": "Lia sang phải",
         "len": "Lia lên", "xuong": "Lia xuống", "zoom_giat": "Zoom giật", "rung": "Rung nhẹ (cầm tay)"}
VAO_VI = {"cat": "Cắt thẳng", "fade_den": "Hiện dần từ đen", "flash_trang": "Flash trắng rồi hiện", "hoa_hinh": "Hòa hình với shot trước"}


def keyframe(s):
    """Hướng dẫn keyframe CapCut cho chuyển động (theo số đo: đẩy vào ≈1,5%/giây)."""
    d = float(s["dai"])
    cd = s.get("chuyen_dong", "dung")
    toc = float(s.get("toc_do", 1.5))          # %/giây
    if cd == "dung":
        k = "Không keyframe."
    elif cd == "day_vao":
        k = f"Tỷ lệ 100% (đầu) → {100 + toc * d:.0f}% (cuối). Ease in/out."
    elif cd == "keo_ra":
        k = f"Tỷ lệ {100 + toc * d:.0f}% (đầu) → 100% (cuối). Ease in/out."
    elif cd in ("lia_trai", "lia_phai"):
        a, b = (60, -60) if cd == "lia_trai" else (-60, 60)
        k = f"Tỷ lệ 115% cố định. Vị trí X {a} → {b}. Ease in/out."
    elif cd in ("len", "xuong"):
        a, b = (-40, 40) if cd == "len" else (40, -40)
        k = f"Tỷ lệ 112% cố định. Vị trí Y {a} → {b}. Ease in/out."
    elif cd == "zoom_giat":
        k = "Giữ 100% tới điểm nhấn, rồi trong 5 frame (0,2 s) nhảy lên 130%. Ease out."
    elif cd == "rung":
        k = "Hiệu ứng → Lắc máy (Camera shake), cường độ thấp nhất. Có thể thêm Tỷ lệ 105% để không lộ mép."
    else:
        k = cd
    if s.get("tach_lop"):
        k += (" **Tách lớp (parallax):** track chính đặt ảnh *chỉ có nền* (Tỷ lệ 105→108%); lớp phủ đặt ảnh có nhân vật đã "
              "*Xóa nền* (Tỷ lệ 100→112%, Vị trí X dịch 20–40).")
    return k


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tap")
    a = ap.parse_args()
    tap, tm = doc_tap(a.tap)
    tl, tong = timeline(tap, tm)
    nv = {n["ma"]: n for n in tap.get("nhan_vat", [])}

    # ---- bang_shot.csv
    with open(tm / "bang_shot.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Mã shot", "Cảnh", "Nhịp", "Bắt đầu", "Dài (s)", "Loại", "Vào bằng", "Cỡ cảnh", "Góc", "Chuyển động", "Đỏ sẫm",
                    "Tách lớp", "AI video", "Nhân vật", "Nội dung", "Thoại", "Chữ trên hình", "Âm thanh", "Prompt đầy đủ",
                    "File ảnh", "Ảnh đã có", "Giọng đã có", "Trạng thái"])
        for s in tl:
            if s.get("_ao"):
                continue
            thoai = " | ".join(f"{c.get('vai')}: {c.get('loi')}" for c in s["thoai"])
            chu = " | ".join(" / ".join(x.get("dong", [])) for x in s["chu"])
            g_co = sum(1 for c in s["thoai"] if tim_giong(tm, c))
            w.writerow([s["ma"], s["canh"]["ma"], s["canh"].get("nhip", ""), tc(s["bat_dau"]), s["dai"], s.get("loai"),
                        VAO_VI.get(s["vao"], s["vao"]), s.get("co_canh", ""), s.get("goc", ""), CD_VI.get(s["chuyen_dong"], s["chuyen_dong"]),
                        "x" if s.get("do") else "", "x" if s.get("tach_lop") else "", "x" if s.get("ai_video") else "",
                        ", ".join(s.get("nhan_vat", [])), s.get("noi_dung", ""), thoai, chu, ", ".join(s.get("am_thanh", [])),
                        prompt_day_du(tap, s), s.get("anh") or anh_mac_dinh(s), "x" if tim_anh(tm, s) else "",
                        f"{g_co}/{len(s['thoai'])}" if s["thoai"] else "", ""])

    # ---- prompt_anh.txt
    P = [f"# Prompt ảnh – {tap.get('tieu_de', '')}",
         "# Mỗi shot: copy 1 dòng prompt. Shot có nhân vật: đính kèm ảnh mẫu trong so_nhan_vat/ (Midjourney: --cref <link> --cw 80).", ""]
    for s in tl:
        if s.get("_ao") or s.get("loai") not in ("anh", "video"):
            continue
        ref = ", ".join(f"{m} → {nv.get(m, {}).get('anh_mau', 'so_nhan_vat/' + m + '.png')}" for m in s.get("nhan_vat", []))
        P.append(f"[{s['ma']}] {s.get('co_canh', '')} {s.get('goc', '')} | lưu: {s.get('anh') or anh_mac_dinh(s)}" + (f" | ảnh mẫu: {ref}" if ref else ""))
        P.append(prompt_day_du(tap, s) + " --ar 16:9")
        if s.get("tach_lop"):
            P.append("  + ảnh thứ 2 (chỉ nền, không người): cùng prompt, bỏ nhân vật, thêm 'empty scene, no people'")
        if s.get("ai_video") and s.get("chuyen_dong_ai"):
            P.append(f"  + AI video (5 s): {s['chuyen_dong_ai']}")
        P.append("")
    (tm / "prompt_anh.txt").write_text("\n".join(P), encoding="utf-8")

    # ---- kich_ban_doc.md
    K = [f"# Kịch bản đọc – {tap.get('tieu_de', '')}", "",
         "Mỗi dòng là một file giọng riêng. Dấu `/` = ngắt 0,3 s, `//` = ngắt 0,8 s.", ""]
    for n in tap.get("nhan_vat", []):
        if n.get("giong"):
            K.append(f"- **{n['ma']}** ({n.get('ten', '')}): {n['giong']}")
    K.append("")
    cur = None
    for s in tl:
        if s["canh"]["ma"] != cur:
            cur = s["canh"]["ma"]
            K += ["", f"## {cur} – {s['canh'].get('ten', '')}", ""]
        for c in s["thoai"]:
            ten_file = c.get("file") or f"giong/{s['ma']}_{c.get('vai')}.wav"
            K.append(f"- `{ten_file}` · **{c.get('vai')}** · {tc(s['bat_dau'] + float(c.get('luc', 0)))}"
                     f"{' · ' + c['cam_xuc'] if c.get('cam_xuc') else ''}  \n  {c.get('loi')}")
    (tm / "kich_ban_doc.md").write_text("\n".join(K) + "\n", encoding="utf-8")

    # ---- phieu_dung.md
    D = [f"# Phiếu dựng CapCut – {tap.get('tieu_de', '')}", "",
         f"Dự án CapCut: {tap['rong']}×{tap['cao']}, {tap['fps']} fps. Tổng thời lượng {tc(tong)}. "
         "Mốc **Bắt đầu** là vị trí đầu shot trên timeline (phút:giây). Keyframe đặt ở đầu và cuối mỗi clip.", ""]
    cur = None
    for s in tl:
        c = s["canh"]
        if c["ma"] != cur:
            cur = c["ma"]
            D += ["", f"## {c['ma']} – {c.get('ten', '')}  (nhịp {c.get('nhip', '')})", ""]
            if c.get("muc_dich"):
                D.append(f"_Mục đích:_ {c['muc_dich']}  ")
            if c.get("nhac"):
                nh = c["nhac"]
                D.append(f"_Nhạc:_ `{nh.get('file', '?')}` {nh.get('ghi_chu', '')} · âm lượng {nh.get('am_luong_db', -18)} dB, ducking dưới giọng ≈−16 dB  ")
            if c.get("nen_am"):
                na = c["nen_am"]
                D.append(f"_Nền âm:_ `{na.get('file', '?')}` {na.get('mo_ta', '')} · {na.get('am_luong_db', -22)} dB, lặp suốt cảnh, mờ vào/ra 1 s  ")
            D.append("")
        if s.get("_ao"):
            D.append(f"**[{tc(s['bat_dau'])}] {'Màn đen' if s['loai'] == 'den' else 'Màn trắng'} {s['dai']:.1f} s** – "
                     "Media → Thư viện → màu "
                     f"{'Đen' if s['loai'] == 'den' else 'Trắng'}; clip trước: Hoạt hình → Mờ dần ra 0,6 s.")
            D.append("")
            continue
        D.append(f"### {s['ma']} · {tc(s['bat_dau'])} · {float(s['dai']):.2f} s · {s.get('co_canh', '')} {s.get('goc', '')}"
                 + (" · ★" if s.get("ai_video") else ""))
        D.append(f"- **Hình:** {s.get('noi_dung', '')}" + (" — *có điểm đỏ sẫm*" if s.get("do") else ""))
        if s.get("loai") in ("den", "trang"):
            D.append(f"- **Clip:** màu {'đen' if s['loai'] == 'den' else 'trắng'} từ Thư viện.")
        else:
            D.append(f"- **File:** `{s.get('anh') or anh_mac_dinh(s)}`" + ("" if tim_anh(tm, s) else " *(chưa có)*"))
        D.append(f"- **Vào bằng:** {VAO_VI.get(s['vao'], s['vao'])}" + {
            "fade_den": " – Hoạt hình → Mờ dần vào 0,5–1 s.",
            "flash_trang": " – chèn màu Trắng 0,4 s trước clip, clip: Mờ dần vào 0,3 s.",
            "hoa_hinh": " – Chuyển cảnh → Hòa tan, 1–2 s.", "cat": ""}.get(s["vao"], ""))
        D.append(f"- **Chuyển động:** {CD_VI.get(s['chuyen_dong'], s['chuyen_dong'])}. {keyframe(s)}")
        for x in s["chu"]:
            kieu = x.get("kieu", "phuon")
            mo = {"phuon": "phướn mực dọc (mẫu chữ đã lưu), Mờ dần vào 1,0–1,25 s, không trượt; mất theo cú cắt",
                  "tua": "tựa phim giữa khung: Mờ dần vào + Vị trí Y −30→0 trong 22 frame; giữ 4–5 s",
                  "the": "thẻ thời gian / địa danh góc trên-trái: Mờ dần vào 1 s, Mờ dần ra 0,8 s"}.get(kieu, kieu)
            D.append(f"- **Chữ** ({tc(s['bat_dau'] + float(x.get('luc', 0)))}): \"{' / '.join(x.get('dong', []))}\" – {mo}.")
        for cth in s["thoai"]:
            ten_file = cth.get("file") or f"giong/{s['ma']}_{cth.get('vai')}.wav"
            D.append(f"- **Giọng** ({tc(s['bat_dau'] + float(cth.get('luc', 0)))}, ≈{cth['_dai']:.1f}s): `{ten_file}` – {cth.get('vai')}: \"{cth.get('loi')}\"")
        if s.get("am_thanh"):
            D.append(f"- **Âm thanh:** {', '.join(s['am_thanh'])}")
        for x in s.get("sfx", []):
            D.append(f"- **SFX** ({tc(s['bat_dau'] + float(x.get('luc', 0)))}): `{x.get('file')}` {x.get('db', 0)} dB")
        if s.get("ghi_chu"):
            D.append(f"- **Ghi chú dựng:** {s['ghi_chu']}")
        D.append("")
    (tm / "phieu_dung.md").write_text("\n".join(D) + "\n", encoding="utf-8")
    print(f"Đã xuất vào {tm}: bang_shot.csv, phieu_dung.md, prompt_anh.txt, kich_ban_doc.md")


if __name__ == "__main__":
    main()
