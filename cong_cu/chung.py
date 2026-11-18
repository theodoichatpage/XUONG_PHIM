"""Phần dùng chung cho các công cụ Xưởng Phim: đọc file tập, tính timeline, đo thời lượng giọng, tìm ffmpeg."""
import json
import os
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent          # thư mục repo XUONG_PHIM
KHUNG = json.loads((GOC / "quy_chuan" / "khung_12_nhip.json").read_text(encoding="utf-8"))
NHIP = {n["ma"]: n for n in KHUNG["nhip"]}

# tốc độ đọc dùng để ƯỚC LƯỢNG khi chưa có file giọng (từ/phút, đo từ 2 tập mẫu)
TU_PHUT = {"DAN": 155}
TU_PHUT_THOAI = 110

CHUYEN_DONG = {"dung", "day_vao", "keo_ra", "lia_trai", "lia_phai", "len", "xuong", "zoom_giat", "rung"}
CHUYEN_VAO = {"cat", "fade_den", "flash_trang", "hoa_hinh"}
LOAI_SHOT = {"anh", "video", "den", "trang"}


def utf8_stdout():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def tc(t, frac=True):
    t = max(0.0, t)
    m = int(t // 60)
    s = t - m * 60
    return f"{m}:{s:05.2f}" if frac else f"{m}:{int(s):02d}"


def doc_tap(path):
    """Đọc tap.json, trả về (tap, thư mục tập)."""
    p = Path(path)
    if p.is_dir():
        p = p / "tap.json"
    tap = json.loads(p.read_text(encoding="utf-8"))
    tap.setdefault("fps", 24)
    tap.setdefault("rong", 1920)
    tap.setdefault("cao", 1080)
    return tap, p.parent


def so_tu(cau):
    return len([w for w in re.split(r"\s+", re.sub(r"[/]+", " ", cau or "")) if w.strip()])


def do_dai_am(path):
    """Thời lượng file âm thanh (giây) hoặc None nếu không đọc được."""
    path = Path(path)
    if not path.exists():
        return None
    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path)) as w:
                return w.getnframes() / float(w.getframerate())
        except Exception:
            pass
    fp = tim_ffmpeg("ffprobe")
    if not fp:
        return None
    r = subprocess.run([fp, "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def uoc_luong_doc(vai, cau):
    """Ước lượng thời gian đọc một câu (giây), có tính dấu ngắt '/' (0,3 s) và '//' (0,8 s)."""
    tu = so_tu(cau)
    toc = TU_PHUT.get(vai, TU_PHUT_THOAI)
    ngat = (cau or "").count("//") * 0.8 + ((cau or "").count("/") - 2 * (cau or "").count("//")) * 0.3
    return tu / toc * 60 + max(0.0, ngat)


def tim_ffmpeg(ten="ffmpeg"):
    f = shutil.which(ten)
    if f:
        return f
    cand = [Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Links" / f"{ten}.exe"]
    pk = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    if pk.exists():
        cand += list(pk.glob(f"Gyan.FFmpeg*/**/bin/{ten}.exe"))
    for c in cand:
        if c.exists():
            return str(c)
    return None


def duong_dan(thu_muc, rel):
    return (thu_muc / rel) if rel else None


def anh_mac_dinh(shot):
    canh = shot["ma"].split("_")[0]
    return f"anh/{canh}/{shot['ma']}.png"


def tim_anh(thu_muc, shot):
    """Tìm ảnh/clip của shot: trường 'anh' nếu có, nếu không thì anh/Cxx/<ma>.(png|jpg|jpeg|webp|mp4)."""
    if shot.get("anh"):
        p = thu_muc / shot["anh"]
        return p if p.exists() else None
    canh = shot["ma"].split("_")[0]
    for ext in (".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov"):
        p = thu_muc / "anh" / canh / f"{shot['ma']}{ext}"
        if p.exists():
            return p
    return None


def tim_giong(thu_muc, cau):
    if cau.get("file"):
        p = thu_muc / cau["file"]
        return p if p.exists() else None
    return None


def timeline(tap, thu_muc=None):
    """Trải phẳng tập phim thành danh sách shot có thời điểm bắt đầu.

    Mỗi phần tử: dict shot + 'bat_dau', 'canh' (dict cảnh), 'chi_so_canh', 'la_dau_canh', 'la_cuoi_canh'.
    'ket_thuc' của cảnh (fade_den / flash_trang / cat) sinh thêm một shot 'den' hoặc 'trang' ảo.
    Thoại có file giọng thì lấy thời lượng thật, không thì ước lượng.
    """
    out = []
    t = 0.0
    for ci, canh in enumerate(tap["canh"]):
        shots = canh.get("shot", [])
        for si, s in enumerate(shots):
            s = dict(s)
            s.setdefault("loai", "anh")
            s.setdefault("vao", "cat")
            s.setdefault("chuyen_dong", "dung")
            s.setdefault("thoai", [])
            s.setdefault("chu", [])
            s.setdefault("sfx", [])
            for cau in s["thoai"]:
                f = tim_giong(thu_muc, cau) if thu_muc else None
                d = do_dai_am(f) if f else None
                cau["_dai"] = d if d else uoc_luong_doc(cau.get("vai"), cau.get("loi"))
                cau["_that"] = bool(d)
            s.update({"bat_dau": t, "canh": canh, "chi_so_canh": ci, "la_dau_canh": si == 0,
                      "la_cuoi_canh": si == len(shots) - 1})
            out.append(s)
            t += float(s["dai"])
        kt = canh.get("ket_thuc") or {}
        if kt.get("kieu") in ("fade_den", "den") and kt.get("dai", 0) > 0:
            out.append({"ma": f"{canh['ma']}_DEN", "loai": "den", "dai": float(kt["dai"]), "vao": "cat", "chuyen_dong": "dung",
                        "thoai": [], "chu": [], "sfx": [], "bat_dau": t, "canh": canh, "chi_so_canh": ci,
                        "la_dau_canh": False, "la_cuoi_canh": True, "_ao": True})
            t += float(kt["dai"])
        elif kt.get("kieu") == "flash_trang" and kt.get("dai", 0) > 0:
            out.append({"ma": f"{canh['ma']}_TRANG", "loai": "trang", "dai": float(kt["dai"]), "vao": "cat", "chuyen_dong": "dung",
                        "thoai": [], "chu": [], "sfx": [], "bat_dau": t, "canh": canh, "chi_so_canh": ci,
                        "la_dau_canh": False, "la_cuoi_canh": True, "_ao": True})
            t += float(kt["dai"])
    return out, t


def prompt_day_du(tap, shot):
    p = (shot.get("prompt") or "").strip()
    if not p:
        return ""
    style = tap.get("phong_cach_prompt", "")
    mau = "" if shot.get("do") else ", no red, monochrome"
    return f"{p}, {style}{mau}".replace("[STYLE]", "").strip(", ")
