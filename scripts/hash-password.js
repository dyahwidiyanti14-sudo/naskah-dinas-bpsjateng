/* eslint-disable @typescript-eslint/no-var-requires */
const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.log("Cara pakai: npm run hash-password -- password_anda");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("\nHash bcrypt untuk password Anda:\n");
console.log(hash);
console.log("\nSalin nilai di atas ke field \"passwordHash\" pada config/teams.json\n");
