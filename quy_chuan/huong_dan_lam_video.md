# Hướng dẫn làm một tập phim Xưởng VOX từ đầu đến cuối

Đây là phần **tay nghề** của xưởng: tạo ảnh, giọng, dựng CapCut. Phần **kịch bản và mốc thời gian** cho từng tập do các công cụ trong `cong_cu/` sinh ra (xem `README.md`):
- `tap/<mã tập>/phieu_dung.md`: hướng dẫn dựng từng shot;
- `bang_shot.csv`: đánh dấu tiến độ;
- `prompt_anh.txt`: prompt ảnh;
- `kich_ban_doc.md`: lời thu.

Công cụ dùng trong hướng dẫn:
- **Hình:** AI tạo ảnh (Midjourney, Leonardo, ChatGPT hay Gemini đều được).
- **Giọng:** AI đọc (ElevenLabs, Vbee hoặc FPT.AI).
- **Dựng:** CapCut bản máy tính.

Nếu bạn dùng công cụ khác, các bước vẫn giữ nguyên; chỉ tên nút bấm khác đi.

---

## Bức tranh tổng: 7 bước, theo đúng thứ tự

| Bước | Việc | Thời gian ước tính (một người) | Kết quả |
|---|---|---|---|
| 1 | Tạo thư mục dự án | 10 phút | cây thư mục bên dưới |
| 2 | Làm **"sổ nhân vật"**: ảnh mẫu từng nhân vật + một câu mô tả phong cách cố định | 1–2 buổi | 4 ảnh nhân vật, 1 ảnh phong cách |
| 3 | Thu giọng: xuất từng câu thành file riêng | 1 buổi | ~90 file `.wav` / `.mp3` |
| 4 | Tạo ảnh từng shot theo kịch bản | 3–5 buổi | ~130 ảnh |
| 5 | Tìm nhạc và SFX có giấy phép | 1 buổi | thư mục `am_thanh` |
| 6 | Dựng trong CapCut, cảnh nào xong cảnh đó | 3–5 buổi | file dự án CapCut |
| 7 | Chỉnh màu, chữ, âm lượng; xuất file; tự kiểm tra | 1 buổi | `VOX_NhuNguyet1077.mp4` |

**Quy tắc vàng:** làm xong **giọng (bước 3) trước khi tạo ảnh và dựng**. Giọng quyết định mỗi shot dài bao nhiêu, nên ảnh phải chạy theo giọng, không làm ngược lại.

---

## Bước 1. Thư mục tập

Không cần tạo tay. Chạy lệnh sau trong thư mục `XUONG_PHIM`:

```powershell
python cong_cu\lap_khung.py T02_ma_tap "Tên tập" --phut 18
```

Lệnh này tạo sẵn `tap\T02_ma_tap\`:

```
tap\T02_ma_tap\
  tap.json           kịch bản: cảnh, shot, thời lượng, thoại, chữ, âm thanh, gieo – trả
  so_nhan_vat\       ảnh mẫu nhân vật (GAO.png, KIEN.png…), ảnh phong cách
  giong\             file giọng, tên theo cột "file" trong tap.json (vd. giong/C02_S04_KIEN.wav)
  anh\C01\ … C12\    ảnh từng shot, tên = mã shot: C01_S01.png (.jpg / .webp / .mp4 cũng được)
  am_thanh\nhac\     nhạc nền
  am_thanh\sfx\      tiếng động
  do_hoa\            phướn, bản đồ, logo
  xuat\              animatic.mp4 và bản cuối
```

Mã shot (`C04_S05`…) dùng thống nhất cho ảnh, giọng, phiếu dựng và bảng shot. **Đặt file đúng tên, đúng thư mục là công cụ tự nhận.**

---

## Bước 2. Sổ nhân vật: để nhân vật không "đổi mặt" giữa các shot

Đây là bước quan trọng nhất khi làm phim bằng ảnh AI. Không có nó, mỗi ảnh sẽ ra một khuôn mặt khác.

### 2.1 Câu phong cách cố định (dán vào **cuối mọi prompt**)

```
dark ink-wash and charcoal digital painting, Vietnamese Ly dynasty 1077, near-monochrome palette of black and cold greys, a single accent of deep crimson red only where noted, heavy brush texture, mist and smoke, dramatic rim light, cinematic 16:9 widescreen composition, film grain, no text, no watermark
```

Trong kịch bản, chữ **[STYLE]** nghĩa là dán câu này vào cuối prompt.

Màu đỏ sẫm `#7A1414` **chỉ** được dùng cho "vật dẫn đường": mái chèo, vệt máu, lửa ở cảnh cao trào. Shot nào không ghi "crimson" thì thêm vào prompt: `no red, monochrome`.

### 2.2 Bốn nhân vật

| Mã | Nhân vật | Thật hay hư cấu | Dấu hiệu nhận diện cố định (luôn ghi trong prompt) |
|---|---|---|---|
| **GAO** | **Gáo**, cậu bé chèo đò. Lúc bé 8 tuổi, hiện tại 14 tuổi | **hư cấu** | gầy, da sạm, tóc ngắn rối, khăn vải buộc trán, áo nâu vá vai; **chiếc mái chèo gỗ có khắc ba vạch** |
| **KIEN** | **Trần Kiên**, tướng trẻ nhà Lý, khoảng 25 tuổi | **hư cấu** | mặt vuông, sẹo mảnh ở lông mày trái, mũ trụ da, áo giáp vảy sẫm, khăn quàng xám dài |
| **LTK** | **Lý Thường Kiệt**, chỉ huy phòng tuyến | **có thật** | ngoài 60, râu bạc cắt gọn, áo bào sẫm thêu mây, ánh mắt trầm, đứng thẳng |
| **QQ** | **Quách Quỳ**, chủ tướng quân Tống | **có thật** | ngoài 50, râu quai nón đen pha bạc, mũ cánh chuồn quan võ, áo choàng lông thú, mặt lạnh |
| DAN | Người dẫn chuyện | | chỉ có giọng |

Cần ghi rõ ở phần cuối video rằng Gáo và Trần Kiên là nhân vật hư cấu.

### 2.3 Cách làm ảnh mẫu

1. Với mỗi nhân vật, tạo 3 ảnh: **chính diện bán thân**, **nghiêng ¾**, **toàn thân**, đều trên nền xám trơn.
   - Ví dụ prompt cho Gáo:
     ```
     character reference sheet, 14-year-old Vietnamese boy ferryman, thin, sun-darkened skin, short messy hair, cloth headband, patched brown tunic, holding a wooden oar with three carved notches, front view, plain grey background, [STYLE]
     ```
2. Chọn ảnh ưng nhất, lưu vào `00_so_nhan_vat\GAO.png`.
3. Từ đó trở đi, **mọi prompt có nhân vật đều đính kèm ảnh mẫu**:
   - **Midjourney:** thêm `--cref <link ảnh GAO> --cw 80` để giữ mặt và quần áo, và `--sref <link ảnh phong cách>` để giữ nét vẽ. Thêm `--ar 16:9`.
   - **ChatGPT / Gemini:** tải ảnh mẫu lên rồi viết "giữ đúng nhân vật trong ảnh, vẽ cảnh sau: …".
   - **Leonardo:** dùng Character Reference và Style Reference.
4. Tạo **1 ảnh phong cách** (ví dụ một cánh đồng sương với nét mực đậm) làm `STYLE_REF.png`, rồi dùng nó cho mọi shot.

### 2.4 Mẹo để ảnh dùng được cho dựng phim

- **Luôn tạo ảnh 16:9, độ phân giải cao nhất có thể** (tối thiểu 1920×1080, nên dùng 2K–4K). Camera ảo cần dư khung để zoom vào mà không vỡ hình.
- Shot nào ghi **"tách lớp"** thì tạo thêm một ảnh **chỉ có nền, không có người** cùng bố cục. Bước 6 sẽ dùng nó để làm chiều sâu (parallax).
- Khuôn mặt trong shot cận (CU) dễ lệch so với ảnh mẫu, nên tạo 3–4 ảnh rồi chọn ảnh giống nhất.
- Shot hành động: ưu tiên **dáng người silhouette + khói + nhòe chuyển động**. Cách này giấu được lỗi tay chân của AI và đúng với phong cách hai tập mẫu.

---

## Bước 3. Thu giọng AI

### 3.1 Chọn giọng

| Vai | Đặc điểm giọng | Gợi ý cài đặt |
|---|---|---|
| DAN (người dẫn) | nam trầm, chậm rãi, ít cảm xúc. Kiểu "lịch sử lạnh" | tốc độ 0,95; độ ổn định cao |
| KIEN | nam trẻ, chắc, có lúc nghẹn | tốc độ 1,0 |
| LTK | nam lớn tuổi, trầm, ngắn gọn | tốc độ 0,9 |
| QQ | nam trung niên, lạnh, nhấn chữ | tốc độ 0,92 |
| GAO bé | trẻ con. Nếu không có giọng trẻ em, dùng giọng nữ trẻ nâng cao độ | |
| GAO lớn | thiếu niên. Giọng nam trẻ nhất có được | |

### 3.2 Cách xuất

1. Mỗi **câu thoại là một file riêng**, đặt tên theo mã trong kịch bản, ví dụ `C04_03_GAO.wav`. Khi dựng mới kéo được từng câu và tạo khoảng nghỉ như ý.
2. Trong kịch bản, dấu **"/"** nghĩa là ngắt khoảng 0,3 s, **"//"** là ngắt khoảng 0,8 s. Trong ElevenLabs, chèn `<break time="0.8s" />`, hoặc tách thành 2 file.
3. Tiếng hô của đám đông ("Giữ!", "Phá cầu!") nên lấy từ thư viện SFX, đừng dùng giọng AI.
4. Nghe lại toàn bộ. Tên riêng như "Như Nguyệt", "Quách Quỳ" hay bị đọc sai dấu; nếu sai thì viết theo cách đọc (ví dụ "Quách Quì") rồi xuất lại.

**Số đo tham chiếu từ hai tập mẫu:**
- Lời dẫn đọc khoảng 150–160 từ/phút.
- Thoại kịch đọc chậm hơn, khoảng 100–120 từ/phút.
- Giữa các câu thoại có khoảng nghỉ 0,5–1 s.

---

## Bước 4. Tạo ảnh từng shot

Làm theo `tap\<mã>\prompt_anh.txt`, **cảnh nào xong cảnh đó**. Sau mỗi cảnh, chạy `python cong_cu\dung_animatic.py tap\<mã> --canh Cxx` để xem ảnh đã vào đúng nhịp chưa.

Với mỗi shot:
1. Copy prompt trong kịch bản.
2. Dán câu [STYLE] vào cuối.
3. Đính kèm ảnh mẫu nhân vật (nếu shot có nhân vật).
4. Tạo 4 ảnh, chọn 1, lưu với đúng mã shot.

Shot nào trong kịch bản ghi "**tạo 2 ảnh: A/B**" là để làm chuyển động: ví dụ A là tay cầm mái chèo, B là mái chèo đã gãy. Khi dựng, hai ảnh được nối bằng một cú cắt nhanh hoặc chớp sáng.

**Nếu muốn ảnh chuyển động bằng AI video** (Kling, Runway, Veo):
- Chỉ dùng cho khoảng 10–15 shot quan trọng nhất (có đánh dấu ★ trong kịch bản).
- Tải ảnh lên làm khung đầu, kèm câu mô tả chuyển động ngắn (đã ghi sẵn ở cột "Chuyển động").
- Mỗi lần tạo 5 s, chỉ giữ 2–3 s đẹp nhất.

---

## Bước 5. Nhạc và tiếng động

**Không dùng nhạc của Việt Sử Kiêu Hùng hay các bản Audiomachine / Brand X** có trong tập mẫu. Đó là nhạc thương mại có bản quyền. Nguồn an toàn:
- **YouTube Audio Library** (trong YouTube Studio): lọc theo Cinematic / Dramatic. Bản ghi "No attribution required" là dùng tự do.
- **Pixabay Music** và **Pixabay Sound Effects**: miễn phí dùng thương mại.
- **Freesound.org**: chỉ lấy file có giấy phép CC0. File CC-BY phải ghi tên tác giả ở credit.

Danh sách cần tìm: drone trầm, trống trận, nhạc dây bi tráng (epic), nhạc buồn chậm (sáo, đàn bầu nếu có), gió, sóng sông, mưa, lửa cháy, tên bay (whoosh), va kiếm, tiếng gỗ gãy, nổ, đám đông hò hét, côn trùng đêm, chuông đồng.

Đặt tên file theo tác dụng, ví dụ `sfx_go_gay_01.wav`, để lúc dựng tìm cho nhanh.

---

## Bước 6. Dựng trong CapCut, từng thao tác

### 6.1 Tạo dự án

1. Mở CapCut, chọn **Tạo dự án**.
2. Ở góc phải, đặt **Tỷ lệ 16:9**. Trong **Cài đặt dự án**, đặt độ phân giải **1920×1080** và **tốc độ khung hình 24**. Phim mẫu chạy 24 fps; nhịp này cho cảm giác "điện ảnh" hơn 30 fps.
3. Kéo toàn bộ thư mục `01_giong`, `02_anh` và `03_am_thanh` vào thư viện Media.

### 6.2 Sắp xếp các track (từ dưới lên)

| Track | Chứa gì |
|---|---|
| Video chính | ảnh / clip từng shot |
| Lớp phủ 1 | nhân vật tách nền (parallax), sương / khói |
| Lớp phủ 2 | phướn tên, chữ |
| Âm thanh 1 | giọng (thoại + dẫn) |
| Âm thanh 2 | nhạc nền |
| Âm thanh 3–4 | SFX, tiếng môi trường |

### 6.3 Thứ tự dựng một cảnh (lặp lại cho cả 13 cảnh)

1. **Đặt giọng trước:** kéo các file giọng của cảnh vào Âm thanh 1, chèn khoảng nghỉ theo kịch bản.
2. **Đặt ảnh theo giọng:** kéo ảnh vào Video chính, kéo dài mỗi ảnh đúng thời lượng ghi trong kịch bản, sao cho câu thoại rơi vào shot có người nói.
3. **Thêm chuyển động camera ảo** (mục 6.4).
4. **Thêm chuyển cảnh** (mục 6.5). Trong hai tập mẫu gần như **chỉ có cắt thẳng và fade đen**; đừng dùng hiệu ứng chuyển cảnh trang trí.
5. **Thêm SFX và nhạc**, rồi chỉnh âm lượng (mục 6.7).
6. Xem lại cả cảnh rồi mới sang cảnh sau.

### 6.4 Camera ảo bằng keyframe: biến ảnh tĩnh thành "phim"

Bấm vào ảnh trên timeline → bảng bên phải → tab **Video → Cơ bản**. Ở đó có **Tỷ lệ (Scale)** và **Vị trí (Position)**. Biểu tượng hình thoi bên cạnh mỗi thông số là nút đặt keyframe.

| Kiểu trong kịch bản | Cách làm (ảnh dài T giây) | Số đo tham chiếu |
|---|---|---|
| **Đứng yên** | không đặt keyframe | 40% thời lượng phim mẫu là shot đứng yên |
| **Đẩy vào chậm (push-in)** | đầu clip: Tỷ lệ 100%, đặt keyframe. Cuối clip: Tỷ lệ 100% + 1,5×T% (ảnh 6 s thì lên 109%), đặt keyframe | trung vị đo được ≈1,5%/giây |
| **Kéo ra (pull-out)** | ngược lại: từ 110% về 100% | |
| **Lia ngang (pan)** | đặt Tỷ lệ 115% cố định. Vị trí X đi từ −60 đến +60 | |
| **Zoom giật** | trong 4–6 frame (0,2 s), Tỷ lệ nhảy từ 100% lên 130%. Bấm chuột phải vào keyframe, chọn **Đường cong (Ease out)** | phim mẫu có 32 cú zoom giật |
| **Rung nhẹ (cảm giác cầm tay)** | **Hiệu ứng → Lắc máy (Camera shake)**, cường độ thấp nhất, chỉ dùng cho shot hành động | |
| **Parallax 2 lớp** (shot ghi "tách lớp") | Video chính: ảnh **chỉ có nền**, Tỷ lệ 105→108%. Lớp phủ 1: ảnh có nhân vật, dùng **Xóa nền (Remove background)** để chỉ còn người, Tỷ lệ 100→112% và Vị trí X dịch nhẹ. Hai lớp đi khác tốc độ sẽ tạo chiều sâu | đây là "camera ảo" của phim mẫu |

**Mẹo:** sau khi đặt 2 keyframe, bấm chuột phải lên keyframe đầu, chọn **Đường cong → Ease in/out**. Chuyển động sẽ mềm như máy quay thật.

### 6.5 Chuyển cảnh: chỉ 4 loại

| Loại | Dùng khi | Cách làm trong CapCut |
|---|---|---|
| **Cắt thẳng** | 90% số chỗ nối | không làm gì |
| **Fade sang đen** | kết thúc mỗi cảnh lớn (13 lần trong phim) | thêm **Màu đen** (Media → Thư viện → Đen) dài 1–3 s giữa hai cảnh. Clip trước: Hoạt hình → **Mờ dần ra (Fade out)** 0,5–1 s. Clip sau: **Mờ dần vào (Fade in)** 0,5–1 s |
| **Flash trắng** | ngay sau cú đánh mạnh, hoặc trước tựa phim | chèn **Màu trắng** dài 0,3–0,5 s, rồi Fade in cho ảnh sau |
| **Hòa hình (dissolve)** | chuyển sang ký ức / quá khứ | Chuyển cảnh → **Hòa tan (Dissolve)**, 1–2 s |

### 6.6 Chữ trên màn hình

**Phướn tên nhân vật:**
1. Tạo một ảnh "phướn mực dọc" bằng AI với prompt: `vertical torn black ink brush banner, empty, isolated on transparent background`.
2. Xóa nền, lưu thành `04_do_hoa\phuon.png`.
3. Trong CapCut: đặt `phuon.png` ở Lớp phủ 2, thêm chữ dọc lên trên.
4. Font gợi ý (miễn phí, có tiếng Việt):
   - tên nhân vật: **Oswald SemiBold** hoặc **Bebas Neue Pro** (bản Việt hóa);
   - chức danh: **Oswald Light** cỡ nhỏ hơn, cách tên một vạch ngang mảnh.
5. Hoạt hình vào: **Mờ dần vào 1,0–1,25 s** (đo từ phim mẫu: khoảng 30 frame). Không trượt, không nảy. Phướn biến mất theo cú cắt cảnh.
6. **Lưu thành mẫu:** bấm chuột phải lên nhóm chữ + phướn, chọn **Tạo nhóm / Lưu làm mẫu chữ** để dùng lại.

**Thẻ thời gian / địa danh:** cùng kiểu phướn, đặt ở góc trên-trái.

**Tựa phim:**
1. Flash trắng 2–2,5 s.
2. Chữ hiện lên: Mờ dần vào kết hợp keyframe Vị trí Y từ −30 về 0, trong 22 frame (≈0,9 s).
3. Giữ 4–5 s.

**Phụ đề:** phim mẫu **không có phụ đề**. Nếu muốn có, dùng **Văn bản → Nhận dạng giọng nói tự động**, đặt chữ nhỏ ở dưới, rồi tự sửa lại tên riêng.

### 6.7 Âm thanh

| Lớp | Âm lượng gợi ý | Ghi chú |
|---|---|---|
| Giọng | 0 dB (mặc định) | bật **Giảm tạp âm** nếu giọng có tiếng xì |
| Nhạc nền khi có thoại | −16 dB so với giọng | đo từ phim mẫu: nền nằm dưới giọng 15,9 dB |
| Nhạc nền khi không có thoại | to lên ~ +15 dB so với lúc có thoại | phim mẫu nâng nền 17,3 dB ở các khoảng nghỉ |
| SFX hành động | to ngang hoặc hơn giọng | |
| Tiếng môi trường | nhỏ, luôn có | cảnh không có tiếng nền sẽ nghe "chết" |

**Tự động hạ nhạc khi có giọng:** chọn clip nhạc → **Âm thanh → Ducking (Tự động giảm âm lượng)**, đặt mức khoảng −16 dB. Nếu bản CapCut của bạn không có, đặt keyframe âm lượng bằng tay.

**Ba quy tắc nhạc rút từ phim mẫu:**
1. Có **ít nhất 2 khoảng không nhạc dài 60–70 s** (đêm chờ, cảnh đối chất). Lúc nhạc quay lại là lúc khán giả bị cuốn mạnh nhất.
2. **Không cần cắt theo nhịp nhạc.** Phim mẫu chỉ có 29% điểm cắt rơi đúng phách, gần với ngẫu nhiên.
3. Mỗi cảnh lớn kết thúc thì nhạc cũng tắt hoặc chuyển bài theo, khớp với lúc fade đen.

### 6.8 Màu: giữ "mực xám đen + đỏ sẫm"

1. Chọn tất cả ảnh → **Điều chỉnh**: **Độ bão hòa −60 đến −80**, Tương phản +10, Vùng tối −10. Đặt **Nhiệt độ** hơi lạnh (−5).
2. Với shot có màu đỏ: dùng **Điều chỉnh → HSL**, giữ riêng màu Đỏ (độ bão hòa cao), kéo các màu khác xuống thấp.
3. Lưu cài đặt thành **Preset** để áp cho cả phim.
4. Có thể thêm hiệu ứng **Hạt phim (Film grain)** nhẹ ở lớp trên cùng, kéo dài suốt phim.

---

## Bước 7. Xuất file và tự kiểm tra

**Trước khi dựng CapCut:** chạy `python cong_cu\dung_animatic.py tap\<mã>` để có video nháp đúng mốc thời gian. Dựng CapCut theo `phieu_dung.md` và đối chiếu với animatic.

**Xuất:** MP4, H.264, 1080p, 24 fps, bitrate "Cao" (khoảng 12–16 Mbps), âm thanh AAC 320 kbps. Lưu thành `tap\<mã>\xuat\ban_cuoi.mp4`.

**Danh sách tự kiểm tra:**
- [ ] `kiem_tra.py` báo 0 lỗi.
- [ ] Mỗi nhân vật cùng một mặt và cùng trang phục ở mọi shot (nhất là nhân vật xuất hiện ở hai độ tuổi).
- [ ] Mọi vật dẫn đường xuất hiện đủ các lần gieo – nhắc – trả ghi trong `gieo_tra`.
- [ ] Màu đỏ chỉ có ở shot đánh dấu `do: true`.
- [ ] Các màn fade đen nằm đúng chỗ.
- [ ] Không câu thoại nào bị nhạc đè.
- [ ] Tên riêng đọc đúng.
- [ ] Credit có ghi nguồn nhạc / SFX, và ghi rõ nhân vật nào là hư cấu.

**Đo nhịp bản dựng cuối bằng công cụ reverse-video đã cài.** Chạy 2 lệnh sau trong thư mục `XUONG_PHIM` (đổi `T01_nhu_nguyet` thành mã tập của bạn), rồi so `summary.md` với `kiem_tra.md`:

```powershell
& "$HOME\.claude\skills\reverse-video\.venv\Scripts\python.exe" -I "$HOME\.claude\skills\reverse-video\scripts\fetch.py" "tap\T01_nhu_nguyet\xuat\ban_cuoi.mp4" "tap\T01_nhu_nguyet\xuat\do_nhip"
```

```powershell
& "$HOME\.claude\skills\reverse-video\.venv\Scripts\python.exe" -I "$HOME\.claude\skills\reverse-video\scripts\measure.py" "tap\T01_nhu_nguyet\xuat\do_nhip" --stems off --lang vi
```

Hoặc chỉ cần nói với tôi "đo bản dựng của tôi", tôi sẽ chạy và so giúp.
