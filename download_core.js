const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('https://cdn.jsdelivr.net/gh/dubstar-04/Design-Core/core/lib/scene.js');
  
  const content = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync('scene.js', content);
  
  await browser.close();
  console.log('Downloaded scene.js');
})();
