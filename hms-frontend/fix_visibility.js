const fs = require('fs');
const path = require('path');

const textMap = {
  // text-slate/gray
  'text-slate-100': 'text-theme-text',
  'text-slate-200': 'text-theme-text',
  'text-slate-300': 'text-theme-muted-light',
  'text-slate-400': 'text-theme-muted',
  'text-slate-500': 'text-theme-muted',
  'text-gray-100': 'text-theme-text',
  'text-gray-200': 'text-theme-text',
  'text-gray-300': 'text-theme-muted-light',
  'text-gray-400': 'text-theme-muted',
  'text-gray-500': 'text-theme-muted',
  'text-[#0F1219]': 'text-theme-inverse',
};

const bgMap = {
  'bg-white': 'bg-theme-card',
  'bg-slate-800': 'bg-theme-card',
  'bg-slate-900': 'bg-theme-main',
  'bg-slate-700': 'bg-theme-hover',
  'bg-gray-800': 'bg-theme-card',
  'bg-gray-900': 'bg-theme-main',
  'bg-gray-700': 'bg-theme-hover',
  'bg-[#0F1219]': 'bg-theme-main',
  'bg-[#1A1D27]': 'bg-theme-card',
  'bg-[#161925]': 'bg-theme-secondary',
  'bg-[#262A36]': 'bg-theme-hover',
  'bg-[#131C31]': 'bg-theme-card',
  'bg-[#1A2642]': 'bg-theme-hover',
  'bg-[#0B1220]': 'bg-theme-main',
  'bg-[#0b0d14]': 'bg-theme-main',
  'bg-[#151720]': 'bg-theme-main',
};

const placeholderMap = {
  'placeholder-slate-400': 'placeholder-theme-muted',
  'placeholder-slate-500': 'placeholder-theme-muted',
  'placeholder-gray-400': 'placeholder-theme-muted',
  'placeholder-gray-500': 'placeholder-theme-muted',
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

const buttonBgClasses = ['bg-blue', 'bg-emerald', 'bg-red', 'bg-amber', 'bg-green', 'bg-indigo', 'bg-purple', 'bg-yellow', 'bg-transparent', 'bg-[#0066FF]', 'bg-destructive', 'bg-rose', 'bg-primary'];

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const [key, value] of Object.entries(textMap)) {
    content = content.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
  }
  for (const [key, value] of Object.entries(bgMap)) {
    content = content.split(key).join(value);
  }
  for (const [key, value] of Object.entries(placeholderMap)) {
    content = content.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
  }

  const classStringRegex = /className=(?:\{[^}]*\}|(?:[\"\'`])(?:(?=(\\?))\2.)*?\1)/g;
  content = content.replace(classStringRegex, (match) => {
    const hasButtonBg = buttonBgClasses.some(bgClass => match.includes(bgClass));
    if (!hasButtonBg) {
      return match.replace(/\btext-white\b/g, 'text-theme-text').replace(/\bhover:text-white\b/g, 'hover:text-theme-text');
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
    console.log(`Modified visibility in: ${file}`);
  }
});

console.log(`\nVisibility fixed in ${filesModified} files successfully!`);
