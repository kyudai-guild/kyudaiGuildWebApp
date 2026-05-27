const fs = require('fs');
const path = require('path');

function replaceColors(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceColors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/text-slate-100/g, 'text-[var(--gold-dark)]');
      content = content.replace(/text-slate-200/g, 'text-[#3e2815]');
      content = content.replace(/text-slate-300/g, 'text-[#5c3a21]');
      content = content.replace(/text-slate-400/g, 'text-[#704825]');
      content = content.replace(/text-slate-500/g, 'text-[var(--gold)]');
      content = content.replace(/text-slate-600/g, 'text-[#a87644]');
      
      // bg-white/x to bg-black/x
      content = content.replace(/bg-white\/\w+/g, (match) => {
        return match.replace('white', 'black');
      });
      content = content.replace(/bg-white\/\[.*?\]/g, (match) => {
        return match.replace('white', 'black');
      });
      
      // bg-[#110d0a] etc to bg-white/40
      content = content.replace(/bg-\[#110d0a\]/g, 'bg-white/40');
      content = content.replace(/bg-\[#14100c\]/g, 'bg-white/60');
      content = content.replace(/bg-\[#0a0705\]/g, 'bg-white');
      
      // border-white/5 etc
      content = content.replace(/border-white\/(\w+|\[.*?\])/g, (match, p1) => {
        return `border-black/${p1}`;
      });

      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceColors(path.join(__dirname, 'src', 'components'));
console.log('Done replacing colors.');
