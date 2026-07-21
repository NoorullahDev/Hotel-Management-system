const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory && f !== 'node_modules' && f !== '.next') {
            walk(dirPath, callback);
        } else if (!isDirectory && dirPath.endsWith('.tsx')) {
            callback(path.join(dirPath));
        }
    });
}

let count = 0;
walk(path.join(__dirname, 'app'), (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace <img ... > that don't already have loading="lazy"
    // Be careful with multi-line tags, but most here are single line.
    let newContent = content.replace(/<img\s+(?!.*loading="lazy")[^>]*>/g, match => {
        if(match.includes('loading=')) return match;
        return match.replace('<img ', '<img loading="lazy" decoding="async" ');
    });
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        count++;
        console.log('Optimized images in:', filePath);
    }
});
console.log(`Optimized ${count} files.`);
