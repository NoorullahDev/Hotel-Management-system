const fs = require('fs');
const path = require('path');

const map = {
  // Divides
  'divide-[#262A36]': 'divide-theme-border',
  'divide-[#262A36]/50': 'divide-theme-border/50',
  'divide-[#363A46]': 'divide-theme-strong',

  // Borders
  'border-[#262A36]': 'border-theme-border',
  'border-[#1A1D27]': 'border-theme-border',
  'border-[#0F1219]': 'border-theme-border',
  'border-[#363A46]': 'border-theme-strong',
  'border-[#3A3F50]': 'border-theme-border',

  // Rings
  'ring-[#1A1D27]': 'ring-theme-main',
  'ring-[#0F1219]': 'ring-theme-main',
  'ring-[#262A36]': 'ring-theme-border',

  // Backgrounds
  'bg-[#0F1219]': 'bg-theme-main',
  'bg-[#1A1D27]': 'bg-theme-card',
  'bg-[#161925]': 'bg-theme-secondary',
  'bg-[#262A36]': 'bg-theme-hover',
  'bg-[#363A46]': 'bg-theme-strong',
  'bg-slate-700': 'bg-theme-hover',

  // Hovers
  'hover:bg-[#1A1D27]': 'hover:bg-theme-card',
  'hover:bg-[#262A36]': 'hover:bg-theme-hover',
  'hover:bg-[#1A2642]': 'hover:bg-theme-hover',
  'hover:bg-[#3a3f50]': 'hover:bg-theme-hover',
  'hover:bg-slate-700': 'hover:bg-theme-hover',
  'hover:bg-slate-800': 'hover:bg-theme-hover',
  
  // Gradients
  'from-[#1A1D27]': 'from-theme-card',
  'from-[#0F1219]': 'from-theme-main',
  'via-[#262A36]': 'via-theme-border',
  'to-[#1A1D27]': 'to-theme-card',
  'to-[#0F1219]': 'to-theme-main',
};

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

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const [key, value] of Object.entries(map)) {
    content = content.split(key).join(value);
  }

  // Handle case where text-white is used but it's on a theme background (not a primary color button)
  // E.g., text-slate-400 or text-slate-300 were mapped to text-theme-muted and text-theme-muted-light respectively in the previous script.
  // We'll leave text-white alone here to not break buttons, unless we do manual review.

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
    console.log(`Modified: ${file}`);
  }
});

console.log(`\nRefactored ${filesModified} files successfully!`);
