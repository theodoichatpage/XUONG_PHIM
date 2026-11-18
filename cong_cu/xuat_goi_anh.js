// Xuất gói ảnh cho mọi tập: tap/<mã>/goi_anh.json, goi_anh.md, goi_anh.csv.
// Vercel chạy script này khi build, nên gói ảnh luôn khớp với tap.json mới nhất và có link cố định:
//   https://<web>/tap/<mã>/goi_anh.json
// Chạy tay:  node cong_cu/xuat_goi_anh.js [địa_chỉ_web]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GOC = path.resolve(__dirname, '..');
const ctx = vm.createContext({console});
for (const f of ['web/logic.js', 'web/goianh.js']) vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, {filename: f});
const web = (process.argv[2] || process.env.XUONG_WEB || 'https://xuongphim-peach.vercel.app').replace(/\/$/, '');

const thuMuc = path.join(GOC, 'tap');
let n = 0;
for (const ten of fs.readdirSync(thuMuc)) {
  const p = path.join(thuMuc, ten, 'tap.json');
  if (!fs.existsSync(p)) continue;
  ctx.__tap = JSON.parse(fs.readFileSync(p, 'utf8'));
  ctx.__nguon = `${web}/tap/${ten}/tap.json`;
  const g = vm.runInContext('GOIANH.tao(__tap, __nguon)', ctx);
  ctx.__g = g;
  fs.writeFileSync(path.join(thuMuc, ten, 'goi_anh.json'), JSON.stringify(g, null, 1));
  fs.writeFileSync(path.join(thuMuc, ten, 'goi_anh.md'), vm.runInContext('GOIANH.markdown(__g)', ctx));
  fs.writeFileSync(path.join(thuMuc, ten, 'goi_anh.csv'), vm.runInContext('GOIANH.csv(__g)', ctx));
  console.log(`${ten}: ${g.thong_ke.so_shot_can_anh} shot, ${g.thong_ke.so_nhan_vat} nhân vật → goi_anh.json / .md / .csv`);
  n++;
}
console.log(`Xong ${n} tập.`);
