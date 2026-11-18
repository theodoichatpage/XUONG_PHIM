"""Quét tap/*/tap.json và ghi tap/danh_sach.json cho trang web. Vercel chạy lệnh này mỗi lần đưa code lên.

Cách chạy:  python cong_cu/cap_nhat_danh_sach.py
"""
import json
import sys as _sys, pathlib as _pl; _sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from chung import GOC, timeline, utf8_stdout


def main():
    utf8_stdout()
    ds = []
    for p in sorted((GOC / "tap").glob("*/tap.json")):
        try:
            tap = json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Bỏ qua {p}: {e}")
            continue
        tl, tong = timeline(tap)
        ds.append({"ma_tap": tap.get("ma_tap", p.parent.name), "thu_muc": p.parent.name, "tieu_de": tap.get("tieu_de", ""),
                   "tong": round(tong, 2), "so_canh": len(tap.get("canh", [])),
                   "so_shot": sum(1 for s in tl if not s.get("_ao")), "trang_thai": tap.get("trang_thai", ""),
                   "series": tap.get("series", ""), "bien_the": tap.get("bien_the", {}),
                   "chuoi_nhip": [c.get("nhip") or "RIENG" for c in tap.get("canh", [])]})
    (GOC / "tap" / "danh_sach.json").write_text(json.dumps(ds, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"tap/danh_sach.json: {len(ds)} tập")


if __name__ == "__main__":
    main()
