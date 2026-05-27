const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

function replaceColors(dir) {
  const files = getFiles(dir);
  for (const fullPath of files) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Replace the mustard text with the thick dark brown text
    content = content.replace(/text-\[var\(--gold-dark\)]/g, 'text-[#382516]');
    // Replace light text borders/colors to better match retro
    content = content.replace(/border-\[var\(--border-subtle\)\]/g, 'border-[var(--border-outer)]');
    
    // Change large border-radius to smaller ones to look more pixel-art
    content = content.replace(/rounded-xl/g, 'rounded-sm border-2');
    content = content.replace(/rounded-lg/g, 'rounded-sm border-2');
    content = content.replace(/rounded-2xl/g, 'rounded-md border-4');
    
    // Any remaining border-white/xx or bg-black/xx could be left alone, but let's make sure it looks like a retro UI line
    content = content.replace(/border-black\/\w+/g, 'border-[var(--border-shade)]');

    fs.writeFileSync(fullPath, content);
  }
}

replaceColors(path.join(__dirname, 'src', 'components'));
console.log('Done replacing retro colors.');
