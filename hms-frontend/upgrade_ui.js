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

let filesModified = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Upgrade Cards: Add shadow-soft to bg-theme-card
  // We look for 'bg-theme-card' inside classNames and append 'shadow-soft' if it doesn't have it
  const classStringRegex = /(?:className=|className:\s*)(["'`])((?:(?=(\\?))\3.)*?)\1/g;
  
  content = content.replace(classStringRegex, (match, quote, innerClasses) => {
    let classes = innerClasses;

    // Add soft shadow to cards
    if (classes.includes('bg-theme-card') && !classes.includes('shadow-soft')) {
      classes = classes.replace('bg-theme-card', 'bg-theme-card shadow-soft');
    }

    // Upgrade primary buttons
    if (classes.includes('bg-blue-600')) {
      classes = classes.replace(/\bbg-blue-600\b/g, 'bg-primary');
      classes = classes.replace(/\bhover:bg-blue-[57]00\b/g, 'hover:bg-primary/90');
      if (!classes.includes('active:scale-95') && !classes.includes('scale-')) {
         classes += ' active:scale-95';
      }
      if (!classes.includes('shadow-md') && !classes.includes('shadow-lg')) {
         classes += ' shadow-md';
      }
    }

    // Modernize blue text
    classes = classes.replace(/\btext-blue-[56]00\b/g, 'text-primary');
    classes = classes.replace(/\bborder-blue-[56]00\b/g, 'border-primary');

    // Upgrade Inputs (focus rings)
    // usually inputs have 'focus:outline-none' and maybe some border
    if (classes.includes('focus:outline-none') && (classes.includes('border') || classes.includes('bg-theme-card') || classes.includes('bg-theme-main'))) {
      if (!classes.includes('focus:ring-')) {
        classes = classes.replace('focus:outline-none', 'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary');
      }
    }

    if (classes !== innerClasses) {
      return match.replace(innerClasses, classes);
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified++;
    console.log(`Upgraded UI in: ${file}`);
  }
});

console.log(`\nUI Upgraded in ${filesModified} files successfully!`);
