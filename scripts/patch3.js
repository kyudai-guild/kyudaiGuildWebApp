const fs = require('fs');
let lines = fs.readFileSync('src/components/gacha/Gacha.tsx', 'utf8').split('\n');
lines[109] = "            ? gachaAvailable";
lines[110] = "              ? 'ガチャを引く権利があります！'";
lines[111] = "              : '本日のガチャは既に使用済みです'";
lines[112] = "            : 'QRログインするとガチャが解放されます'}";
fs.writeFileSync('src/components/gacha/Gacha.tsx', lines.join('\n'));
