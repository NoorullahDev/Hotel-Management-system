const fs = require('fs');
const path = require('path');

const dirsToScan = ['app', 'components'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = [];
dirsToScan.forEach(dir => getAllFiles(dir, allFiles));

const map = {
  'bg-slate-800': 'bg-theme-secondary',
  'bg-slate-700': 'bg-theme-hover',
  'bg-slate-600': 'bg-theme-strong',
  'bg-slate-500/10': 'bg-theme-secondary',
  'bg-slate-500/20': 'bg-theme-hover',
  'border-slate-500/20': 'border-theme-border',
  'border-slate-500/30': 'border-theme-border',
  'border-slate-500': 'border-theme-border',
  'border-slate-600': 'border-theme-strong',
  'text-slate-600': 'text-theme-muted',
  'text-slate-500': 'text-theme-muted-light',
  'hover:border-slate-500': 'hover:border-theme-strong',
  'hover:border-slate-600': 'hover:border-theme-strong'
};

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const [key, value] of Object.entries(map)) {
    content = content.split(key).join(value);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
    console.log(`Modified slate in: ${file}`);
  }
});

console.log(`\nFixed slate in ${filesModified} files successfully!`);
