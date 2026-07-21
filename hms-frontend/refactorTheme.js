const fs = require('fs');
const path = require('path');

const map = {
  // Original Text
  'text-slate-400': 'text-theme-muted',
  'text-slate-300': 'text-theme-muted-light',
  'text-[#0F1219]': 'text-theme-inverse',
  
  // New Text Mappings
  'text-slate-100': 'text-theme-text',
  'text-slate-200': 'text-theme-text',
  'text-slate-500': 'text-theme-muted-light',
  
  // Borders
  'border-[#262A36]': 'border-theme-border',
  'border-[#363A46]': 'border-theme-strong',
  'border-slate-700': 'border-theme-border',
  'border-slate-800': 'border-theme-border',
  
  // Hex Backgrounds
  'bg-[#0F1219]': 'bg-theme-main',
  'bg-[#1A1D27]': 'bg-theme-card',
  'bg-[#161925]': 'bg-theme-secondary',
  'bg-[#262A36]': 'bg-theme-hover',
  'bg-[#131C31]': 'bg-theme-card',
  'bg-[#1A2642]': 'bg-theme-hover',
  'bg-[#0B1220]': 'bg-theme-main',
  'bg-[#0b0d14]': 'bg-theme-main',
  'bg-[#151720]': 'bg-theme-main',
  
  // Hovers
  'hover:bg-[#1A1D27]': 'hover:bg-theme-card',
  'hover:bg-[#262A36]': 'hover:bg-theme-hover',
  'hover:bg-[#1A2642]': 'hover:bg-theme-hover',
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

// We must preserve text-white when it is on a primary color button
const buttonBgClasses = ['bg-blue', 'bg-emerald', 'bg-red', 'bg-amber', 'bg-green', 'bg-indigo', 'bg-purple', 'bg-yellow', 'bg-transparent', 'bg-[#0066FF]', 'bg-destructive', 'bg-rose', 'bg-[#C9A050]', 'bg-[#1A1D27]', 'bg-[#0F1219]', 'bg-[#131C31]'];

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Direct replacements
  for (const [key, value] of Object.entries(map)) {
    content = content.split(key).join(value);
  }

  // 2. Complex replacement for text-white
  // Find all className="..." or className={`...`} blocks
  const classStringRegex = /className=(["'`])(?:(?=(\\?))\2.)*?\1/g;
  
  content = content.replace(classStringRegex, (match) => {
    // Check if this class string contains any of the button bg classes
    const hasButtonBg = buttonBgClasses.some(bgClass => match.includes(bgClass));
    
    // Also if it has hover:text-white and some hover:bg that is primary, it should be preserved.
    // For now, if we match the primary bg, we just leave the whole class string alone.
    if (!hasButtonBg) {
      // It's not a primary colored button, so replace text-white with text-theme-text
      return match.replace(/\btext-white\b/g, 'text-theme-text').replace(/\bhover:text-white\b/g, 'hover:text-theme-text');
    }
    
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
  }
});

console.log(`Refactored ${filesModified} files successfully!`);
