const bcrypt = require('bcrypt');
async function test() {
  const hash = '$2b$10$sMVYaVq5eDd4MMYkJ2mfMu619T1gR2wNFGSwOKPJsXhckG8LF38h.';
  console.log('adminpassword123:', await bcrypt.compare('adminpassword123', hash));
  console.log('noor11:', await bcrypt.compare('noor11', hash));
}
test();
