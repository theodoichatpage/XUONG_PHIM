# Định dạng `tap.json`: một tập phim là một file

Mọi công cụ trong xưởng đều đọc cùng một file `tap/<mã tập>/tap.json`. Viết đúng định dạng này là có ngay phiếu dựng, bảng shot, prompt ảnh, kịch bản đọc và animatic.

## Cấp tập

| Trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `ma_tap` | ✓ | mã tập, không dấu (vd. `T01_nhu_nguyet`) |
| `tieu_de` | ✓ | tên tập |
| `tong_du_kien_s` | | tổng thời lượng dự kiến (giây). Dùng để so vị trí % khi mới viết một phần |
| `fps`, `rong`, `cao` | | mặc định 24, 1920, 1080 |
| `phong_cach_prompt` | ✓ | câu phong cách tiếng Anh, tự ghép vào cuối mọi prompt ảnh |
| `chu_de` | ✓ | câu chủ đề (nhịp 3), viết bằng lời của nhân vật |
| `giong_phan_de` | ✓ | ai là giọng phản đề, họ trách điều gì |
| `vat_dan_duong` | ✓ | các đồ vật / màu đi suốt phim |
| `nhan_vat` | ✓ | danh sách nhân vật (bảng dưới) |
| `gieo_tra` | ✓ | các đường dây gieo – nhắc – trả (bảng dưới) |
| `canh` | ✓ | danh sách cảnh, theo thứ tự chiếu |

**Nhân vật:** `ma` (viết hoa, không dấu: `GAO`, `KIEN`; `DAN` là người dẫn), `ten`, `loai` (`có thật` / `hư cấu` / `giọng`), `nhan_dang` (dấu hiệu cố định, luôn ghi vào prompt), `anh_mau` (vd. `so_nhan_vat/GAO.png`), `giong`.

**Gieo – trả:** `ma`, `mo_ta`, `gieo` (danh sách mã shot), `nhac` (mã shot), `tra` (mã shot). `kiem_tra.py` báo lỗi nếu trả nằm trước gieo, và nhắc nếu chưa có trả.

## Cảnh

| Trường | Ý nghĩa |
|---|---|
| `ma` | `C01`, `C02`… |
| `ten`, `muc_dich` | tên cảnh, cảnh này làm gì cho câu chuyện |
| `nhip` | mã nhịp trong `quy_chuan/khung_12_nhip.json`: `MO`, `GIEO_NO`, `CHU_DE`, `PHAN_DE`, `THU_THACH`, `DINH_ACTION`, `DIEN_VAN`, `TRAN_CUOI`, `TRA_NO`, `GUONG_SOI`, `LICH_SU_LANH`, `MOC_CREDIT`. Một nhịp có thể gồm nhiều cảnh |
| `ket_thuc` | `{"kieu": "fade_den", "dai": 1.5}` (shot cuối mờ ra, rồi đen 1,5 s) · `{"kieu": "flash_trang", "dai": 0.4}` · `{"kieu": "cat"}` |
| `nhac` | `{"file": "am_thanh/nhac/x.mp3", "am_luong_db": -12, "luc": 0, "ghi_chu": "…"}` hoặc `null` (cảnh không nhạc) |
| `khuon` | `{"tham_khao": "dabang", "ten": "Đa Bang – Hồi 2", "canh": 3}`: cảnh này dựng theo cảnh nào của phim tham khảo (trang web hiện liên kết sang) |
| `shot` | danh sách shot |

## Shot

| Trường | Giá trị | Ý nghĩa |
|---|---|---|
| `ma` | `C04_S05` | mã shot, cũng là tên file ảnh |
| `dai` | giây | độ dài trên timeline |
| `loai` | `anh` (mặc định) · `video` · `den` · `trang` | `den` / `trang` là màn màu, không cần ảnh |
| `vao` | `cat` · `fade_den` · `flash_trang` · `hoa_hinh` | cách shot bắt đầu |
| `co_canh` | ELS · WS · MS · MCU · CU · ECU · OTS · Top-down · Insert… | cỡ cảnh |
| `goc` | ngang · hếch · cao · thẳng xuống… | góc máy |
| `chuyen_dong` | `dung` · `day_vao` · `keo_ra` · `lia_trai` · `lia_phai` · `len` · `xuong` · `zoom_giat` · `rung` | camera ảo |
| `toc_do` | %/giây, mặc định 1,5 | tốc độ đẩy/kéo (đo từ phim mẫu: ≈1,5%/s) |
| `diem_nhan` | giây | thời điểm zoom giật trong shot |
| `do` | true/false | shot có điểm đỏ sẫm (chỉ vật dẫn đường) |
| `tach_lop` | true/false | cần thêm ảnh nền trống để làm parallax |
| `ai_video`, `chuyen_dong_ai` | | shot nên làm bằng AI video, kèm mô tả chuyển động |
| `nhan_vat` | `["GAO", "KIEN"]` | ai có trong hình (để đính ảnh mẫu) |
| `noi_dung` | tiếng Việt | mô tả hình cho người dựng |
| `prompt` | tiếng Anh | prompt ảnh (không cần ghép phong cách, công cụ tự ghép) |
| `anh` | đường dẫn | chỉ ghi khi file không nằm ở `anh/Cxx/<ma>.png` |
| `thoai` | danh sách | `{"vai": "GAO", "loi": "…", "luc": 0.4, "cam_xuc": "…", "file": "giong/C04_S02_GAO.wav", "tran": false}`. `luc` = giây tính từ đầu shot. `/` ngắt 0,3 s, `//` ngắt 0,8 s. `tran: true` cho phép lời tràn sang shot sau |
| `chu` | danh sách | `{"kieu": "phuon" \| "the" \| "tua", "dong": ["Tên", "chức danh"], "luc": 0.5, "dai": 5, "vi_tri": "trai" \| "phai"}` |
| `am_thanh` | danh sách chữ | tiếng môi trường / SFX cần tìm |
| `sfx` | danh sách | `{"file": "am_thanh/sfx/go_gay.wav", "luc": 1.2, "db": -2}` (có file thì animatic tự trộn) |
| `ghi_chu` | | lưu ý dựng |
