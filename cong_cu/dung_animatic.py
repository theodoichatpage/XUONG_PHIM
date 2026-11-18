"""Tự ráp video nháp (animatic) từ tap.json: ảnh/clip từng shot + camera ảo + chuyển cảnh + phướn chữ + giọng + nhạc + SFX,
đúng mốc thời gian trong kịch bản. Shot chưa có ảnh thì hiện thẻ storyboard (mã shot, cỡ cảnh, nội dung) để xem nhịp trước.

Cách chạy:
    python cong_cu/dung_animatic.py tap/T01_nhu_nguyet                 # cả tập, nửa độ phân giải (nhanh)
    python cong_cu/dung_animatic.py tap/T01_nhu_nguyet --canh C01,C02  # chỉ vài cảnh
    python cong_cu/dung_animatic.py tap/T01_nhu_nguyet --ti_le 1 --khong_phu_de --khong_ma   # bản đủ nét, sạch
Kết quả: <tập>/xuat/animatic.mp4 (hoặc --ra).
"""
import argparse
import math
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import sys as _sys, pathlib as _pl; _sys.path.insert(0, str(_pl.Path(__file__).resolve().parent))
from chung import doc_tap, timeline, tc, tim_anh, tim_giong, tim_ffmpeg, utf8_stdout

DO_SAM = (20, 20, 122)  # BGR của #7A1414


# ---------------------------------------------------------------- phông chữ
def font(dam=False, co=32):
    cands = (["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
             if dam else ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"])
    for c in cands:
        if Path(c).exists():
            return ImageFont.truetype(c, co)
    return ImageFont.load_default()


def rgba_tu_pil(im):
    a = np.array(im)  # RGBA
    bgr = a[..., [2, 1, 0]].astype(np.float32)
    al = a[..., 3:4].astype(np.float32) / 255.0
    return bgr, al


def tron(frame, lop, x, y, do_mo=1.0):
    """Trộn lớp (bgr, alpha) vào frame tại (x, y) với độ mờ do_mo."""
    if do_mo <= 0:
        return
    bgr, al = lop
    h, w = al.shape[:2]
    H, W = frame.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    sb = bgr[y0 - y:y1 - y, x0 - x:x1 - x]
    sa = al[y0 - y:y1 - y, x0 - x:x1 - x] * do_mo
    roi = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = (roi * (1 - sa) + sb * sa).astype(np.uint8)


# ---------------------------------------------------------------- lớp chữ
def ve_phuon(dong, W, H, seed=0):
    """Phướn mực dọc: mỗi chữ của dòng 1 một hàng, dòng 2 (chức danh) nhỏ dưới vạch ngang."""
    rng = np.random.default_rng(seed)
    f1, f2 = font(True, max(14, int(H * 0.042))), font(False, max(10, int(H * 0.022)))
    tu = (dong[0] if dong else "").split()
    phu = dong[1:] if len(dong) > 1 else []
    phu_lines = sum((textwrap.wrap(p, 14) for p in phu), [])
    do = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    rong_chu = max([do.textlength(t, font=f1) for t in tu] + [do.textlength(t, font=f2) for t in phu_lines] + [0])
    w = int(max(H * 0.13, rong_chu * 1.25 + H * 0.04))
    lh1, lh2 = int(H * 0.055), int(H * 0.03)
    h = int(H * 0.06) + lh1 * len(tu) + (int(H * 0.03) + lh2 * len(phu_lines) if phu_lines else 0) + int(H * 0.05)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # thân phướn mép rách
    pts = []
    for yy in range(0, h + 1, max(4, h // 40)):
        pts.append((int(w * 0.08 + rng.integers(-3, 4)), yy))
    for yy in range(h, -1, -max(4, h // 40)):
        pts.append((int(w * 0.92 + rng.integers(-3, 4)), yy))
    d.polygon(pts, fill=(18, 18, 20, 225))
    d.polygon([(w * 0.35, 0), (w * 0.5, -h * 0.0), (w * 0.65, 0), (w * 0.5, h * 0.04)], fill=(18, 18, 20, 225))
    y = int(H * 0.04)
    for t in tu:
        tw = d.textlength(t, font=f1)
        d.text(((w - tw) / 2, y), t, font=f1, fill=(232, 230, 222, 255))
        y += lh1
    if phu_lines:
        y += int(H * 0.012)
        d.line([(w * 0.22, y), (w * 0.78, y)], fill=(200, 198, 190, 255), width=max(1, H // 540))
        y += int(H * 0.015)
        for t in phu_lines:
            tw = d.textlength(t, font=f2)
            d.text(((w - tw) / 2, y), t, font=f2, fill=(200, 198, 190, 255))
            y += lh2
    return rgba_tu_pil(im)


def ve_tua(dong, W, H, nen_sang=True):
    """Tựa phim. Nền sáng (sương trắng như phim mẫu) → chữ mực đen; nền tối → chữ trắng ngà."""
    f1, f2 = font(True, int(H * 0.09)), font(False, int(H * 0.035))
    im = Image.new("RGBA", (W, int(H * 0.32)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    y = 0
    mau = [(30, 30, 32, 255), (60, 60, 62, 255)] if nen_sang else [(236, 234, 226, 255), (200, 198, 190, 255)]
    bong = (255, 255, 255, 90) if nen_sang else (0, 0, 0, 170)
    for i, t in enumerate(dong):
        f = f1 if i == 0 else f2
        tw = d.textlength(t, font=f)
        d.text(((W - tw) / 2 + 2, y + 2), t, font=f, fill=bong)
        d.text(((W - tw) / 2, y), t, font=f, fill=mau[0] if i == 0 else mau[1])
        y += int(H * (0.11 if i == 0 else 0.05))
    # vệt đỏ sẫm dưới tựa
    d.rectangle([W * 0.42, y + 4, W * 0.58, y + 4 + max(2, H // 200)], fill=(122, 20, 20, 230))
    return rgba_tu_pil(im)


def ve_the(dong, W, H):
    f = font(False, int(H * 0.03))
    pad = int(H * 0.015)
    lines = dong or [""]
    im0 = Image.new("RGBA", (10, 10))
    tw = max(ImageDraw.Draw(im0).textlength(t, font=f) for t in lines)
    w, h = int(tw + 2 * pad), int(len(lines) * H * 0.04 + 2 * pad)
    im = Image.new("RGBA", (w, h), (12, 12, 14, 170))
    d = ImageDraw.Draw(im)
    for i, t in enumerate(lines):
        d.text((pad, pad + i * H * 0.04), t, font=f, fill=(225, 223, 215, 255))
    return rgba_tu_pil(im)


def ve_phu_de(vai, loi, W, H):
    f = font(False, max(12, int(H * 0.032)))
    text = f"{vai}: {' '.join((loi or '').replace('/', ' ').split())}"
    lines = textwrap.wrap(text, 70) or [""]
    lh = int(H * 0.042)
    im0 = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    tw = max(im0.textlength(t, font=f) for t in lines)
    w, h = int(tw + 24), lh * len(lines) + 14
    im = Image.new("RGBA", (w, h), (0, 0, 0, 150))
    d = ImageDraw.Draw(im)
    for i, t in enumerate(lines):
        d.text((12, 7 + i * lh), t, font=f, fill=(245, 245, 240, 255))
    return rgba_tu_pil(im)


def ve_ma(text, W, H):
    f = font(False, max(10, int(H * 0.022)))
    im0 = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    w = int(im0.textlength(text, font=f) + 12)
    im = Image.new("RGBA", (w, int(H * 0.034)), (0, 0, 0, 130))
    ImageDraw.Draw(im).text((6, 2), text, font=f, fill=(255, 220, 120, 255))
    return rgba_tu_pil(im)


# ---------------------------------------------------------------- nền shot
def doc_anh(p):
    data = np.fromfile(str(p), dtype=np.uint8)            # đọc được đường dẫn có dấu tiếng Việt
    im = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return im


def phu_kin(im, W, H):
    h, w = im.shape[:2]
    s = max(W / w, H / h)
    im = cv2.resize(im, (max(W, int(round(w * s))), max(H, int(round(h * s)))), interpolation=cv2.INTER_AREA)
    y = (im.shape[0] - H) // 2
    x = (im.shape[1] - W) // 2
    return im[y:y + H, x:x + W].copy()


def the_storyboard(s, W, H):
    im = Image.new("RGB", (W, H), (27, 27, 29))
    d = ImageDraw.Draw(im)
    for gx in range(1, 3):
        d.line([(W * gx / 3, 0), (W * gx / 3, H)], fill=(40, 40, 43))
        d.line([(0, H * gx / 3), (W, H * gx / 3)], fill=(40, 40, 43))
    if s.get("do"):
        d.rectangle([4, 4, W - 5, H - 5], outline=(122, 20, 20), width=max(3, H // 120))
    f1, f2, f3 = font(True, int(H * 0.07)), font(True, int(H * 0.04)), font(False, int(H * 0.036))
    # chữ storyboard đặt ở giữa-dưới để không đè thẻ địa danh (trên-trái) và phướn tên
    x0 = W * 0.22
    d.text((x0, H * 0.24), s["ma"], font=f1, fill=(235, 233, 225))
    sub = " · ".join(x for x in [s.get("co_canh"), s.get("goc"), s.get("chuyen_dong")] if x)
    d.text((x0, H * 0.35), sub, font=f2, fill=(180, 178, 170))
    y = H * 0.45
    for line in textwrap.wrap(s.get("noi_dung", ""), 48)[:4]:
        d.text((x0, y), line, font=f3, fill=(215, 213, 205))
        y += H * 0.055
    if s.get("nhan_vat"):
        d.text((x0, H * 0.69), "Nhân vật: " + ", ".join(s["nhan_vat"]), font=f3, fill=(170, 168, 160))
    d.text((x0, H * 0.17), "CHƯA CÓ ẢNH – thẻ storyboard", font=f3, fill=(122, 90, 90))
    return cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)


class NguonShot:
    """Trả về khung nền (W×H, BGR) cho frame thứ i của shot."""

    def __init__(self, s, tm, W, H):
        self.cap = None
        self.anh = None
        loai = s.get("loai", "anh")
        if loai == "den":
            self.anh = np.zeros((H, W, 3), np.uint8)
        elif loai == "trang":
            self.anh = np.full((H, W, 3), 235, np.uint8)
        else:
            p = tim_anh(tm, s)
            if p and p.suffix.lower() in (".mp4", ".mov"):
                self.cap = cv2.VideoCapture(str(p))
                self.W, self.H = W, H
            elif p:
                im = doc_anh(p)
                self.anh = phu_kin(im, W, H) if im is not None else the_storyboard(s, W, H)
            else:
                self.anh = the_storyboard(s, W, H)
        self.co_anh = self.cap is not None or (loai in ("anh", "video") and tim_anh(tm, s) is not None)

    def lay(self):
        if self.cap is None:
            return self.anh
        ok, fr = self.cap.read()
        if not ok:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, fr = self.cap.read()
        return phu_kin(fr, self.W, self.H) if ok else np.zeros((self.H, self.W, 3), np.uint8)


def em(p):
    return p * p * (3 - 2 * p)  # ease in/out


def bien_doi(s, p, t, W, H):
    """Tỷ lệ và dịch chuyển của camera ảo ở tiến độ p (0..1), thời điểm t (giây trong shot)."""
    cd = s.get("chuyen_dong", "dung")
    d = float(s["dai"])
    toc = float(s.get("toc_do", 1.5)) / 100.0
    e = em(p)
    sc, dx, dy = 1.0, 0.0, 0.0
    if cd == "day_vao":
        sc = 1 + toc * d * e
    elif cd == "keo_ra":
        sc = 1 + toc * d * (1 - e)
    elif cd in ("lia_trai", "lia_phai"):
        sc = 1.15
        dx = (0.06 - 0.12 * e) * W * (1 if cd == "lia_trai" else -1)
    elif cd in ("len", "xuong"):
        sc = 1.12
        dy = (0.05 - 0.10 * e) * H * (1 if cd == "len" else -1)
    elif cd == "zoom_giat":
        nhan = float(s.get("diem_nhan", d * 0.6))
        q = min(1.0, max(0.0, (t - nhan) / 0.21))
        sc = 1 + 0.30 * (1 - (1 - q) ** 3)
    elif cd == "rung":
        sc = 1.05
        dx = (math.sin(t * 7.3) + 0.5 * math.sin(t * 13.1)) * W * 0.004
        dy = (math.cos(t * 6.1) + 0.5 * math.sin(t * 11.7)) * H * 0.004
    return sc, dx, dy


def ap_camera(base, sc, dx, dy):
    if sc == 1.0 and dx == 0 and dy == 0:
        return base.copy()
    H, W = base.shape[:2]
    M = np.float32([[sc, 0, (1 - sc) * W / 2 + dx], [0, sc, (1 - sc) * H / 2 + dy]])
    return cv2.warpAffine(base, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


# ---------------------------------------------------------------- âm thanh
def tron_am_thanh(ffmpeg, muc, tong, ra, tmpdir):
    """muc: list dict(file, bat_dau, db, loai['giong'|'nhac'|'sfx'], dai(optional)). Ghi WAV stereo 48 kHz dài 'tong' giây."""
    ins = ["-f", "lavfi", "-t", f"{tong:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    F = []
    nhom = {"giong": [], "nhac": [], "sfx": []}
    for i, m in enumerate(muc, 1):
        if m["loai"] == "nhac":
            ins += ["-stream_loop", "-1"]
        ins += ["-i", str(m["file"])]
        ms = int(round(m["bat_dau"] * 1000))
        chain = f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo"
        if m["loai"] == "nhac":
            dai = m["dai"]
            chain += f",atrim=0:{dai:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=1,afade=t=out:st={max(0, dai - 1.5):.3f}:d=1.5"
        chain += f",volume={m.get('db', 0)}dB,adelay={ms}|{ms}[a{i}]"
        F.append(chain)
        nhom[m["loai"]].append(f"[a{i}]")
    tron_ = []
    if nhom["giong"]:
        F.append("".join(nhom["giong"]) + f"amix=inputs={len(nhom['giong'])}:normalize=0:duration=longest,asplit=2[gv][gsc]")
        tron_.append("[gv]")
    if nhom["nhac"]:
        F.append("".join(nhom["nhac"]) + f"amix=inputs={len(nhom['nhac'])}:normalize=0:duration=longest[nb]")
        if nhom["giong"]:
            F.append("[nb][gsc]sidechaincompress=threshold=0.015:ratio=10:attack=30:release=500:makeup=1[nd]")
            tron_.append("[nd]")
        else:
            tron_.append("[nb]")
    elif nhom["giong"]:
        F.append("[gsc]anullsink")
    tron_ += nhom["sfx"]
    F.append("[0:a]" + "".join(tron_) + f"amix=inputs={1 + len(tron_)}:normalize=0:duration=first,alimiter=limit=0.95[out]")
    script = Path(tmpdir) / "tron.txt"
    script.write_text(";\n".join(F), encoding="utf-8")
    # ffmpeg ≥ 7 đọc filter từ file bằng "-/filter_complex"; bản cũ dùng "-filter_complex_script"
    for opt in ("-/filter_complex", "-filter_complex_script"):
        cmd = [ffmpeg, "-y", "-v", "error"] + ins + [opt, str(script), "-map", "[out]", "-t", f"{tong:.3f}",
                                                     "-c:a", "pcm_s16le", str(ra)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 or "Unrecognized option" not in r.stderr:
            break
    if r.returncode != 0:
        print("Lỗi trộn âm thanh:", r.stderr[-800:])
        return False
    return True


# ---------------------------------------------------------------- chính
def main():
    utf8_stdout()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tap")
    ap.add_argument("--ti_le", type=float, default=0.5, help="tỉ lệ độ phân giải so với tap.json (mặc định 0.5 cho nhanh)")
    ap.add_argument("--canh", default="", help="chỉ dựng các cảnh này, ví dụ C01,C02")
    ap.add_argument("--ra", default="", help="file mp4 đầu ra")
    ap.add_argument("--khong_phu_de", action="store_true", help="tắt phụ đề thoại tạm")
    ap.add_argument("--khong_ma", action="store_true", help="tắt mã shot + timecode ở góc phải")
    a = ap.parse_args()

    ffmpeg = tim_ffmpeg("ffmpeg")
    if not ffmpeg:
        raise SystemExit("Không tìm thấy ffmpeg. Cài bằng: winget install Gyan.FFmpeg rồi mở lại terminal.")
    tap, tm = doc_tap(a.tap)
    tl, tong = timeline(tap, tm)
    if a.canh:
        chon = {c.strip() for c in a.canh.split(",")}
        tl = [s for s in tl if s["canh"]["ma"] in chon]
        if not tl:
            raise SystemExit(f"Không có cảnh nào trong {chon}")
        goc = tl[0]["bat_dau"]
        t = 0.0
        for s in tl:
            s["bat_dau"] = t
            t += float(s["dai"])
        tong = t
    fps = int(tap["fps"])
    W = int(tap["rong"] * a.ti_le) // 2 * 2
    H = int(tap["cao"] * a.ti_le) // 2 * 2
    ra = Path(a.ra) if a.ra else tm / "xuat" / ("animatic.mp4" if not a.canh else f"animatic_{a.canh.replace(',', '_')}.mp4")
    ra.parent.mkdir(parents=True, exist_ok=True)

    # ---- âm thanh
    muc = []
    thieu_giong = 0
    for s in tl:
        for c in s["thoai"]:
            f = tim_giong(tm, c)
            if f:
                muc.append({"file": f, "bat_dau": s["bat_dau"] + float(c.get("luc", 0)), "db": c.get("db", 0), "loai": "giong"})
            else:
                thieu_giong += 1
        for x in s.get("sfx", []):
            f = tm / x["file"]
            if f.exists():
                muc.append({"file": f, "bat_dau": s["bat_dau"] + float(x.get("luc", 0)), "db": x.get("db", 0), "loai": "sfx"})
    canh_da = set()
    for s in tl:
        c = s["canh"]
        if c["ma"] in canh_da or not c.get("nhac"):
            continue
        canh_da.add(c["ma"])
        f = tm / c["nhac"]["file"]
        if f.exists():
            ss = [x for x in tl if x["canh"]["ma"] == c["ma"]]
            bd = ss[0]["bat_dau"] + float(c["nhac"].get("luc", 0))
            kt = ss[-1]["bat_dau"] + float(ss[-1]["dai"])
            muc.append({"file": f, "bat_dau": bd, "dai": max(0.5, kt - bd), "db": c["nhac"].get("am_luong_db", -10), "loai": "nhac"})

    tmpdir = tempfile.mkdtemp(prefix="animatic_")
    wav = Path(tmpdir) / "am_thanh.wav"
    co_am = tron_am_thanh(ffmpeg, muc, tong, wav, tmpdir) if muc else False

    # ---- hình
    cmd = [ffmpeg, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-"]
    if co_am:
        cmd += ["-i", str(wav)]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p"]
    if co_am:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += [str(ra)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    tong_f = int(round(tong * fps))
    prev_last = None
    thieu_anh = 0
    for k, s in enumerate(tl):
        f0 = int(round(s["bat_dau"] * fps))
        f1 = int(round((s["bat_dau"] + float(s["dai"])) * fps))
        n = max(1, f1 - f0)
        src = NguonShot(s, tm, W, H)
        if s.get("loai") in ("anh", "video") and not s.get("_ao") and not src.co_anh:
            thieu_anh += 1
        sau = tl[k + 1] if k + 1 < len(tl) else None
        fade_ra = 0.6 if (sau and sau.get("_ao") and sau["loai"] == "den" and not s.get("_ao")) else 0.0
        trang_ra = 0.3 if (sau and sau.get("_ao") and sau["loai"] == "trang") else 0.0
        # lớp chữ dựng sẵn
        lop_chu = []
        for j, x in enumerate(s.get("chu", [])):
            kieu = x.get("kieu", "phuon")
            dong = x.get("dong", [])
            if kieu == "phuon":
                l = ve_phuon(dong, W, H, seed=sum(map(ord, s["ma"])) + j)
                hw = l[1].shape[1]
                px = int(W * 0.06) if x.get("vi_tri", "trai") == "trai" else int(W * 0.94) - hw
                lop_chu.append((x, l, px, int(H * 0.06), 1.1, 0.0, 0))
            elif kieu == "tua":
                nen = src.lay() if src.cap is None else None
                sang = True if nen is None else float(nen[int(H * 0.3):int(H * 0.7)].mean()) > 110
                l = ve_tua(dong, W, H, nen_sang=sang)
                lop_chu.append((x, l, 0, int(H * 0.36), 0.92, 0.0, int(H * 0.03)))
            else:
                l = ve_the(dong, W, H)
                lop_chu.append((x, l, int(W * 0.04), int(H * 0.05), 1.0, 0.8, 0))
        lop_pd = []
        if not a.khong_phu_de:
            for c in s["thoai"]:
                l = ve_phu_de(c.get("vai", ""), c.get("loi", ""), W, H)
                lop_pd.append((float(c.get("luc", 0)), float(c.get("luc", 0)) + c["_dai"], l))
        lop_ma = None if a.khong_ma else ve_ma(f"{s['ma']}  {tc(s['bat_dau'])}", W, H)

        last = None
        for i in range(n):
            t = i / fps
            p = i / max(1, n - 1)
            base = src.lay()
            sc, dx, dy = bien_doi(s, p, t, W, H)
            fr = ap_camera(base, sc, dx, dy)
            # chuyển vào
            if s["vao"] == "fade_den":
                d = min(0.75, float(s["dai"]) / 3)
                if t < d:
                    fr = (fr.astype(np.float32) * (t / d)).astype(np.uint8)
            elif s["vao"] == "flash_trang":
                if t < 0.15:
                    fr[:] = 235
                elif t < 0.45:
                    q = (t - 0.15) / 0.3
                    fr = (fr.astype(np.float32) * q + 235 * (1 - q)).astype(np.uint8)
            elif s["vao"] == "hoa_hinh" and prev_last is not None:
                d = min(1.0, float(s["dai"]) / 2)
                if t < d:
                    q = t / d
                    fr = (fr.astype(np.float32) * q + prev_last.astype(np.float32) * (1 - q)).astype(np.uint8)
            # chuyển ra
            con = float(s["dai"]) - t
            if fade_ra and con < fade_ra:
                fr = (fr.astype(np.float32) * max(0.0, con / fade_ra)).astype(np.uint8)
            if trang_ra and con < trang_ra:
                q = max(0.0, con / trang_ra)
                fr = (fr.astype(np.float32) * q + 235 * (1 - q)).astype(np.uint8)
            # chữ
            for x, l, px, py, vao_s, ra_s, truot in lop_chu:
                bd = float(x.get("luc", 0))
                kt = bd + float(x["dai"]) if x.get("dai") else float(s["dai"])
                if bd <= t <= kt:
                    mo = min(1.0, (t - bd) / vao_s) if vao_s else 1.0
                    if ra_s and t > kt - ra_s:
                        mo *= max(0.0, (kt - t) / ra_s)
                    dyy = int(truot * (1 - em(min(1.0, (t - bd) / vao_s)))) if truot else 0
                    tron(fr, l, px, py + dyy, mo)
            for bd, kt, l in lop_pd:
                if bd <= t <= kt:
                    tron(fr, l, (W - l[1].shape[1]) // 2, int(H * 0.86) - l[1].shape[0] // 2, 1.0)
            if lop_ma:
                tron(fr, lop_ma, W - lop_ma[1].shape[1] - 6, 6, 1.0)
            proc.stdin.write(fr.tobytes())
            last = fr
        prev_last = last
        sys.stdout.write(f"\r  {s['ma']:<12} {tc(s['bat_dau'] + float(s['dai']))} / {tc(tong)}   ")
        sys.stdout.flush()
    proc.stdin.close()
    proc.wait()
    print(f"\nĐã xuất {ra}  ({tc(tong)}, {W}×{H}, {fps} fps)")
    print(f"Ảnh còn thiếu (hiện thẻ storyboard): {thieu_anh} shot · Câu thoại chưa có file giọng: {thieu_giong}"
          + ("" if co_am else (" · Video chưa có âm thanh: trộn âm thanh lỗi (xem dòng lỗi ở trên)" if muc
                               else " · Video chưa có âm thanh (chưa có file giọng/nhạc/SFX nào)")))


if __name__ == "__main__":
    main()
