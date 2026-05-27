const fs = require('fs');

function patchStampCard() {
    let content = fs.readFileSync('src/components/stamp/StampCard.tsx', 'utf8');
    let lines = content.split('\n');
    lines[167] = '              <p className="text-base font-bold text-[var(--gold)]">🎉 全ての踏破を達成！「開拓者」の証を授かる…</p>';
    fs.writeFileSync('src/components/stamp/StampCard.tsx', lines.join('\n'), 'utf8');
}

function patchGacha() {
    let content = fs.readFileSync('src/components/gacha/Gacha.tsx', 'utf8');
    let lines = content.split('\n');
    lines[57] = '          <p className="text-xs text-[var(--gold)]">ログイン後に1回ガチャが引ける！</p>';
    lines[109] = "            ? gachaAvailable ? 'ガチャを引く権利があります！'";
    lines[110] = "            : '本日のガチャは既に使用済みです'";
    lines[111] = "            : 'QRログインするとガチャが解放されます'}";
    lines[159] = "                {result.type === 'drink' ? '🍹' : result.type === 'points' ? '🪙' : result.type === 'title' ? '👑' : '🎁'}";
    fs.writeFileSync('src/components/gacha/Gacha.tsx', lines.join('\n'), 'utf8');
}

function patchMemberCard() {
    let content = fs.readFileSync('src/components/member/MemberCard.tsx', 'utf8');
    let lines = content.split('\n');
    // Replace the keys that are missing quotes and have syntax error
    lines[38] = "  '冒険者': {";
    lines[45] = "  '開拓者': {";
    lines[260] = "          <span>クリックで戻る</span>";
    // Let's also fix 旅人 and 職人 just in case they were mangled into identifiers but we still want them strictly correct
    for (let i = 0; i < 40; i++) {
        if (lines[i].includes('譌・ｺｺ: {')) lines[i] = "  '旅人': {";
        if (lines[i].includes('閨ｷ莠ｺ: {')) lines[i] = "  '職人': {";
    }
    fs.writeFileSync('src/components/member/MemberCard.tsx', lines.join('\n'), 'utf8');
}

function patchQRScanner() {
    let content = fs.readFileSync('src/components/qr/QRScanner.tsx', 'utf8');
    let lines = content.split('\n');
    // For QRScanner we only need to make sure the syntax error at line 100-101 is gone
    fs.writeFileSync('src/components/qr/QRScanner.tsx', lines.join('\n'), 'utf8');
}

try {
    patchStampCard();
    console.log('StampCard patched');
    patchGacha();
    console.log('Gacha patched');
    patchMemberCard();
    console.log('MemberCard patched');
} catch(e) {
    console.error(e);
}
