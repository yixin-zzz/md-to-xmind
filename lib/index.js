const { parse } = require('./parse');
const fs = require('fs');
const path = require('path');

const dir = './source/plan.md';
const folder = './build';
let text = fs.readFileSync(dir);
let title = path.basename(dir, '.md');
let data = JSON.stringify(parse(text));

if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
}
fs.writeFileSync(`${folder}/${title}`, data, (err) => {
    if (err) throw err;
});
console.log('DONE');