# XƯỞNG PHIM VOX

Xưởng sản xuất phim lịch sử hoạt họa có biên kịch rõ ràng. Mỗi tập là một file `tap.json` ghi **từng shot**: thời lượng, cỡ cảnh, góc máy, chuyển động camera, thoại, chữ, âm thanh, và các đường dây **gieo – trả** của nhân vật. Từ file đó, công cụ tự sinh:
- phiếu dựng CapCut;
- bảng shot;
- prompt ảnh;
- kịch bản đọc;
- video nháp (animatic) đúng mốc thời gian.

Phong cách kịch bản (khung 12 nhịp, giọng phản đề, gieo – trả, gương soi) và các con số nhịp được **đo từ hai tập mẫu của Việt Sử Kiêu Hùng**. Xưởng chỉ học **cấu trúc và nhịp**. Nhân vật, thoại, hình và nhạc của mỗi tập đều phải là của riêng mình.

## Cấu trúc

```
quy_chuan/
  khung_12_nhip.json      12 nhịp: vị trí %, cắt/phút, % có lời mục tiêu (đo từ nguồn)
  dinh_dang_tap.md        định dạng tap.json
  huong_dan_lam_video.md  tay nghề: sổ nhân vật, prompt AI, giọng AI, dựng CapCut, âm thanh, màu, xuất
cong_cu/
  lap_khung.py            tạo khung tập mới (thư mục + tap.json 12 nhịp có ngân sách thời gian)
  kiem_tra.py             kiểm tra kịch bản: nhịp, thoại lọt shot, màu đỏ, gieo – trả, file thiếu → kiem_tra.md
  phieu_dung.py           xuất phieu_dung.md, bang_shot.csv, prompt_anh.txt, kich_ban_doc.md
  dung_animatic.py        ráp video nháp: ảnh + camera ảo + chuyển cảnh + phướn + giọng + nhạc (tự hạ nhạc dưới giọng) + SFX
tap/
  T01_nhu_nguyet/         tập mẫu (mới viết 4/12 nhịp để chạy thử xưởng)
.claude/skills/xuong-phim-vox/   skill để Claude viết và kiểm tra tập mới theo đúng quy trình
```

## Cài một lần (Windows)

```powershell
winget install Gyan.FFmpeg
```

```powershell
winget install astral-sh.uv
```

Mở terminal mới trong thư mục `XUONG_PHIM`, rồi tạo môi trường Python:

```powershell
uv venv .venv --python 3.12
```

```powershell
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
```

Từ đây về sau, các lệnh `python …` trong README nghĩa là `.venv\Scripts\python.exe …`.

## Làm một tập (tóm tắt)

| # | Việc | Lệnh / tài liệu |
|---|---|---|
| 1 | Tạo khung tập | `python cong_cu\lap_khung.py T02_bach_dang "Bạch Đằng 938" --phut 18` |
| 2 | Viết kịch bản vào `tap\T02_bach_dang\tap.json` | tự viết theo `quy_chuan\dinh_dang_tap.md`, hoặc mở Claude Code trong thư mục này và nói *"viết kịch bản tập T02 về Bạch Đằng 938"* |
| 3 | Kiểm tra, sửa đến khi 0 lỗi | `python cong_cu\kiem_tra.py tap\T02_bach_dang` → đọc `kiem_tra.md` |
| 4 | Xuất tài liệu sản xuất | `python cong_cu\phieu_dung.py tap\T02_bach_dang` |
| 5 | Xem nhịp bằng animatic (chưa cần ảnh) | `python cong_cu\dung_animatic.py tap\T02_bach_dang` → `xuat\animatic.mp4` |
| 6 | Làm ảnh mẫu nhân vật → giọng → ảnh từng shot | `quy_chuan\huong_dan_lam_video.md` (bước 2–5), `prompt_anh.txt`, `kich_ban_doc.md` |
| 7 | Bỏ file đúng tên vào `anh\Cxx\`, `giong\`, `am_thanh\`, rồi chạy lại animatic | `python cong_cu\dung_animatic.py tap\T02_bach_dang --canh C03` |
| 8 | Dựng bản cuối trong CapCut theo `phieu_dung.md` | `quy_chuan\huong_dan_lam_video.md` (bước 6–7) |

Tùy chọn của animatic:
- `--ti_le 1`: đủ độ phân giải 1080p.
- `--khong_phu_de`: tắt phụ đề thoại tạm.
- `--khong_ma`: tắt mã shot ở góc phải.
- `--canh C01,C02`: chỉ dựng vài cảnh.

## Không đưa lên repo

Video, ảnh, giọng, nhạc và bản xuất (xem `.gitignore`). Repo chỉ giữ kịch bản (`tap.json`), quy chuẩn và công cụ. Tư liệu phân tích phim của người khác cũng không đưa lên đây.
