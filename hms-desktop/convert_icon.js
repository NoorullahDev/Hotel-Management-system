const fs = require('fs');
const pngToIco = require('png-to-ico');

pngToIco('icon.png')
  .then(buf => {
    fs.writeFileSync('icon.ico', buf);
    console.log('Successfully converted icon.png to icon.ico');
  })
  .catch(console.error);
