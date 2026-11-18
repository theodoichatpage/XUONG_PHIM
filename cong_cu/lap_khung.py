"""Tạo khung cho một tập mới: thư mục chuẩn + tap.json có sẵn 12 nhịp, mỗi nhịp có ngân sách thời gian và số shot gợi ý.

Cách chạy:
    python cong_cu/lap_khung.py T02_ten_tap "Tên tập" --phut 18
Sau đó viết nội dung vào tap/T02_ten_tap/tap.json (hoặc nhờ Claude dùng skill xuong-phim-vox).
"""
import argparse
import json

import sys as _sys, pathlib as _pl; _sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from chung import GOC, KHUNG, tc, utf8_stdout

STYLE = ("dark ink-wash and charcoal digital painting, near-monochrome palette of black and cold greys, heavy brush texture, "
         "mist and smoke, dramatic rim light, cinematic 16:9 widescreen composition, film grain, no text, no watermark")


def main():
    utf8_stdout()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ma_tap", help="mã tập, ví dụ T02_bach_dang (không dấu, không khoảng trắng)")
    ap.add_argument("tieu_de", help="tên tập")
    ap.add_argument("--phut", type=float, default=18.0, help="tổng thời lượng mong muốn, phút (mặc định 18)")
    ap.add_argument("--ghi_de", action="store_true", help="cho phép ghi đè tap.json đã có")
    a = ap.parse_args()

    thu_muc = GOC / "tap" / a.ma_tap
    if (thu_muc / "tap.json").exists() and not a.ghi_de:
        raise SystemExit(f"{thu_muc / 'tap.json'} đã có. Thêm --ghi_de nếu muốn tạo lại.")
    for d in ("so_nhan_vat", "giong", "am_thanh/nhac", "am_thanh/sfx", "do_hoa", "xuat"):
        (thu_muc / d).mkdir(parents=True, exist_ok=True)

    tong = a.phut * 60
    canh = []
    print(f"Khung tập {a.ma_tap} – {tong / 60:.1f} phút\n")
    print(f"{'Cảnh':5} {'Nhịp':34} {'Vào':>8} {'Ra':>8} {'Dài':>6}  Shot gợi ý  Cắt/phút mục tiêu")
    for i, n in enumerate(KHUNG["nhip"], 1):
        bd = n["vi_tri_pct"][0] / 100 * tong
        kt = n["vi_tri_pct"][1] / 100 * tong
        dai = kt - bd
        cpm = sum(n["cat_phut"]) / 2
        so_shot = max(1, round(dai * cpm / 60))
        ma = f"C{i:02d}"
        dai_shot = round(dai / so_shot, 2)
        shots = [{"ma": f"{ma}_S{k:02d}", "dai": dai_shot, "vao": "cat", "co_canh": "", "goc": "", "chuyen_dong": "dung",
                  "do": False, "noi_dung": "", "prompt": "", "nhan_vat": [], "thoai": [], "chu": [], "am_thanh": []}
                 for k in range(1, so_shot + 1)]
        canh.append({"ma": ma, "ten": n["ten"], "nhip": n["ma"], "muc_dich": n["viec"],
                     "ket_thuc": {"kieu": "fade_den", "dai": 1.5} if n["ma"] not in ("THU_THACH", "DINH_ACTION") else {"kieu": "cat"},
                     "nhac": None, "shot": shots})
        print(f"{ma:5} {n['so']:>2}. {n['ten'][:30]:31} {tc(bd):>8} {tc(kt):>8} {dai:5.0f}s  {so_shot:>4}        {n['cat_phut'][0]}–{n['cat_phut'][1]}")

    tap = {"ma_tap": a.ma_tap, "tieu_de": a.tieu_de, "tong_du_kien_s": round(tong), "fps": 24, "rong": 1920, "cao": 1080,
           "phong_cach_prompt": STYLE,
           "mau_nhan": {"do_sam": "#7A1414", "ghi_chu": "chỉ dùng cho vật dẫn đường"},
           "chu_de": "", "giong_phan_de": "", "vat_dan_duong": [],
           "nhan_vat": [{"ma": "DAN", "ten": "Người dẫn", "loai": "giọng", "giong": "nam trầm, 155 từ/phút"}],
           "gieo_tra": [], "canh": canh}
    (thu_muc / "tap.json").write_text(json.dumps(tap, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nĐã tạo {thu_muc}\\tap.json và các thư mục con.")
    print("Lưu ý: khung chia đều thời lượng shot; khi viết kịch bản hãy chỉnh độ dài từng shot theo lời thoại.")


if __name__ == "__main__":
    main()
