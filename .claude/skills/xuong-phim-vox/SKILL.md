---
name: xuong-phim-vox
description: Viết và sản xuất một tập phim lịch sử Xưởng VOX theo phong cách kịch bản nhân vật (gieo – trả, giọng phản đề, khung 12 nhịp) đo từ các tập Việt Sử Kiêu Hùng. Dùng khi người dùng muốn lên kịch bản tập mới, bổ sung cảnh/shot, kiểm tra nhịp, xuất phiếu dựng CapCut, prompt ảnh, kịch bản đọc, hoặc ráp animatic. Kích hoạt với "tập mới", "viết kịch bản tập…", "làm tiếp tập…", "xuất phiếu dựng", "dựng animatic", "kiểm tra tập".
---

# Xưởng Phim VOX

Thư mục gốc của xưởng là thư mục chứa `cong_cu/`, `quy_chuan/` và `tap/`. Chạy các lệnh từ thư mục gốc đó. Python cần `numpy`, `opencv-python-headless` và `pillow`; ffmpeg phải có trên PATH. Nếu `python` của máy thiếu các gói này, dùng venv của skill reverse-video: `$HOME\.claude\skills\reverse-video\.venv\Scripts\python.exe`.

## Đọc trước khi viết

1. `quy_chuan/khung_12_nhip.json`: 12 nhịp, vị trí %, cắt/phút và % có lời mục tiêu (đo từ nguồn).
2. `quy_chuan/dinh_dang_tap.md`: định dạng `tap.json`.
3. `quy_chuan/kho_bien_the.json`: kho biến thể 7 chiều, và `tham_khao/danh_sach.json` + `tap/danh_sach.json` để biết tổ hợp nào đã dùng.

**Khung 12 nhịp và phim tham khảo chỉ để học, không phải khuôn.** Trong một series, mỗi tập phải có tổ hợp biến thể và thứ tự nhịp của riêng mình: đổi giọng phản đề, đổi món nợ, đổi kiểu nút thắt, đan thêm một tuyến truyện mới (tuyến phía địch, hậu phương, đời sau, nhiều góc nhìn…). Được đảo, gộp, bỏ nhịp hoặc chen nhịp riêng (`nhip` để trống hoặc mã riêng).
4. Nếu đang làm tiếp một tập: đọc `tap/<mã>/tap.json` và `tap/<mã>/kiem_tra.md`.

## Quy trình một tập mới

1. **Hỏi (chỉ khi chưa rõ):** đề tài / trận / giai đoạn lịch sử, độ dài (mặc định 18 phút). Không hỏi những gì đã có mặc định.
2. **Trả lời 5 câu hỏi trước khi viết**, ghi vào các trường cấp tập:
   - `chu_de`: một nỗi sợ hoặc lời hứa, do **nhân vật** nói ra, không phải người dẫn;
   - `giong_phan_de`: thường là một dân thường nghi ngờ người anh hùng;
   - món nợ giữa người anh hùng và giọng phản đề: một ân huệ nhỏ, gieo **trước** lời trách và gieo nhẹ;
   - `vat_dan_duong`: một đồ vật đi suốt phim, mang màu đỏ sẫm;
   - **gương soi**: hành động đầu phim quay lại đánh vào chính người làm;
   - `bien_the`: chọn từ kho, ưu tiên lựa chọn chưa dùng; trùng tối đa 2 chiều với bất kỳ tập / phim tham khảo nào.
3. Chạy `python cong_cu/lap_khung.py <ma> "<tên>" --phut <n>` để có ngân sách thời gian từng nhịp.
4. **Viết `tap.json`** theo khung: điền từng cảnh và shot.
   - Thoại ngắn, đời thường. Mỗi câu một dòng `thoai`.
   - Lời dẫn chỉ dùng ở thuyết minh và lịch sử lạnh (nhịp 5, 11).
   - Mọi câu chuyện hư cấu phải đứng trên nền sử liệu công khai. Nhân vật hư cấu ghi `"loai": "hư cấu"` và có chữ "(hư cấu)" trong phướn hoặc credit.
   - **Không dùng lại nhân vật, thoại, cảnh hư cấu, nhạc hay hình của Việt Sử Kiêu Hùng hoặc phim khác.** Chỉ học cấu trúc và nhịp.
   - `prompt` viết bằng tiếng Anh, có đủ dấu hiệu nhận diện nhân vật. Không ghi màu đỏ trừ shot `do: true`.
   - Ghi `gieo_tra` cho mọi vật dẫn đường, câu chủ đề và lời thề.
5. Chạy `python cong_cu/kiem_tra.py tap/<ma>`. Sửa đến khi **0 lỗi** và không còn cảnh báo *lặp công thức*. Độ lệch so với khung 12 nhịp chỉ là ghi chú, không bắt buộc sửa.
6. Chạy `python cong_cu/phieu_dung.py tap/<ma>`. Lệnh này xuất `phieu_dung.md`, `bang_shot.csv`, `prompt_anh.txt` và `kich_ban_doc.md`.
7. Chạy `python cong_cu/dung_animatic.py tap/<ma>`. Shot chưa có ảnh hiện thẻ storyboard; animatic giúp xem nhịp trước khi tốn công làm ảnh.
8. Báo cho người dùng:
   - tóm tắt cốt truyện theo 12 nhịp;
   - các đường gieo – trả;
   - số liệu từ `kiem_tra.md`;
   - đường dẫn các file vừa xuất;
   - việc tiếp theo của họ: làm ảnh mẫu nhân vật → giọng → ảnh shot → dựng (`quy_chuan/huong_dan_lam_video.md`).

## Làm tiếp / sửa một tập

- Sau mỗi lần sửa `tap.json`: chạy lại `kiem_tra.py`, rồi `phieu_dung.py`.
- Khi người dùng đã bỏ ảnh/giọng vào thư mục: chạy `dung_animatic.py` (dùng `--canh C03,C04` để xem nhanh vài cảnh).
- Người dùng xuất bản cuối ra `tap/<mã>/xuat/ban_cuoi.mp4`: đo bằng skill reverse-video (`fetch.py` + `measure.py --stems off --lang vi`) và so với `kiem_tra.md`.

## Ghi chú nguồn số liệu

Mọi con số mục tiêu trong khung là **đo từ 2 tập mẫu** (Lũy Thầy 20:22, Đa Bang 22:02). Khi báo cáo, phân biệt rõ "đo từ nguồn" với "đề xuất cho tập này".
