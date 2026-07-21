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

// We must preserve text-white when it is on a colored background
const safeBgClasses = ['bg-blue', 'bg-emerald', 'bg-red', 'bg-amber', 'bg-green', 'bg-indigo', 'bg-purple', 'bg-yellow', 'bg-transparent', 'bg-[#0066FF]', 'bg-destructive', 'bg-rose', 'bg-[#C9A050]', 'bg-black', 'from-[#0066FF]', 'from-blue', 'bg-slate-800'];

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  const classStringRegex = /(?:className=|className:\s*)(["'`])(?:(?=(\\?))\2.)*?\1/g;
  
  content = content.replace(classStringRegex, (match) => {
    const hasSafeBg = safeBgClasses.some(bgClass => match.includes(bgClass));
    
    // Also consider if they conditionally render classes like `${active ? 'bg-blue text-white' : '...'}`
    // It's tricky to parse perfectly, but we can do our best.
    // If it has 'text-white' but also 'bg-theme-hover' and no 'bg-blue', then it's definitely a bug.

    if (!hasSafeBg) {
      // Replace text-white with text-theme-text
      let newMatch = match.replace(/\btext-white\b/g, 'text-theme-text');
      newMatch = newMatch.replace(/\bhover:text-white\b/g, 'hover:text-theme-text');
      return newMatch;
    }
    
    // Even if it has safe bg, it might have a hover state without safe bg hover, e.g. 'bg-blue ... hover:bg-theme-hover hover:text-white'
    // Actually usually it's `hover:bg-theme-hover hover:text-white` - we replace `hover:text-white` to `hover:text-theme-text` ONLY if it doesn't have `hover:bg-blue`
    const hasSafeHoverBg = safeBgClasses.some(bgClass => match.includes('hover:' + bgClass));
    if (!hasSafeHoverBg && match.includes('hover:bg-theme-hover')) {
       return match.replace(/\bhover:text-white\b/g, 'hover:text-theme-text');
    }

    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
    console.log(`Modified text-white in: ${file}`);
  }
});

console.log(`\nFixed text-white in ${filesModified} files successfully!`);
