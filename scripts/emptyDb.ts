// last commit id: b7985bbc55d9befb92c93df48f05ad046a824846
// Script to empty the database.

import { prisma } from "../src/lib/prisma";
import * as readline from "readline";
import { parseArgs } from "util"

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    yes: {
      type: 'boolean',
      default: false,
    },
  },
  strict: true,
  allowPositionals: false,
});
let answer = values.yes ? true : undefined;
if (!values.yes) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  answer = await new Promise((resolve, reject) => {
    rl.question("Are you sure you want to delete all records from the database? (yes/no): ", (answer) => {
      if (answer !== "yes") resolve(false);
      else resolve(true);
      rl.close();
    });
  });
}


if (!answer) {
  console.log("Aborted.");
  process.exit(0);
}

const now = new Date();
const deleteSession = await prisma.session.deleteMany({});
const deleteUser = await prisma.user.deleteMany({});

console.log(`Deleted ${deleteSession.count} session(s) and ${deleteUser.count} user(s).`)
await prisma.$disconnect();
const elapsed = new Date().getTime() - now.getTime();
console.log(`Operation completed in ${elapsed}ms.`);
