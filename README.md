# XƯỞNG PHIM VOX

Xưởng sản xuất phim lịch sử hoạt họa có biên kịch rõ ràng. Mỗi tập là một file `tap.json` ghi **từng shot**: thời lượng, cỡ cảnh, góc máy, chuyển động camera, thoại, chữ, âm thanh, và các đường dây **gieo – trả** của nhân vật. Từ file đó, công cụ tự sinh:
- phiếu dựng CapCut;
- bảng shot;
- prompt ảnh;
- kịch bản đọc;
- video nháp (animatic) đúng mốc thời gian.

Phong cách kịch bản (khung 12 nhịp, giọng phản đề, gieo – trả, gương soi) và các con số nhịp được **đo từ hai tập mẫu của Việt Sử Kiêu Hùng**. Xưởng chỉ học **cấu trúc và nhịp**. Nhân vật, thoại, hình và nhạc của mỗi tập đều phải là của riêng mình.

## Trang web của xưởng (Vercel)

Toàn bộ xưởng chạy được trên web, không cần cài gì và không cần Claude:

- **Các tập:** mỗi tập có 7 tab.
  - **Tuyến phim:** sơ đồ tự vẽ từ kịch bản.
  - **Kịch bản:** từng cảnh, từng shot.
  - **Phiếu dựng:** hướng dẫn dựng CapCut cho từng shot.
  - **Prompt ảnh:** có nút chép; kèm sổ nhân vật.
  - **Kịch bản đọc:** lọc theo vai, tên file giọng ghi sẵn.
  - **Kiểm tra:** so với khung 12 nhịp.
  - **Tiến độ:** đánh dấu ảnh / giọng / dựng.
- **Soạn tập:** tạo khung 12 nhịp, sửa cảnh / shot / thoại / chữ / nhân vật / gieo – trả, kiểm tra ngay khi gõ, tự lưu nháp, tải `tap.json`.
- **Quy chuẩn & hướng dẫn:** khung 12 nhịp, hướng dẫn làm video, định dạng `tap.json`, quy trình làm tập mới trên web.

**Đưa tập mới lên web:**
1. Soạn xong, bấm *Tải tap.json*.
2. Trên GitHub, mở repo này → `tap` → *Add file → Upload files* → đặt file ở `tap/<mã tập>/tap.json` → *Commit changes*.
3. Vercel tự build lại; tập mới hiện sau khoảng 1 phút.

Vercel chạy `python3 cong_cu/cap_nhat_danh_sach.py` (khai báo trong `vercel.json`) để cập nhật danh sách tập. Chạy thử trên máy: `python -m http.server 8765`, rồi mở http://localhost:8765.

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
  cap_nhat_danh_sach.py   ghi tap/danh_sach.json cho trang web (Vercel tự chạy khi build)
index.html, web/          trang web của xưởng (xem tập, phiếu dựng, prompt, soạn tập, kiểm tra) – chạy thuần trình duyệt
vercel.json               cấu hình deploy Vercel
tap/
  danh_sach.json          danh sách tập cho web
  T01_nhu_nguyet/         tập 1: SÔNG – Như Nguyệt 1077, đủ 15 cảnh / 210 shot
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
