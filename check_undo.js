const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  
  const compState = await page.evaluate(() => {
    // Find the React root
    const root = document.querySelector('#root');
    if (!root) return { error: "No #root element" };
    
    // Get the React fiber node
    const reactKey = Object.keys(root).find(k => k.startsWith('__reactContainer$'));
    if (!reactKey) return { error: "No React Container key", rootKeys: Object.keys(root) };
    
    let instance = root[reactKey];
    while (instance && !instance.stateNode?.core) {
      if (instance.child) instance = instance.child;
      else break;
    }
    
    if (!instance || !instance.stateNode) return { error: "No component found" };
    
    const core = instance.stateNode.core;
    const dump = {
      coreExists: !!core,
      sceneExists: !!core.scene,
      entitiesExists: core.scene ? !!core.scene.entities : false,
      commandManagerExists: !!core.commandManager,
    };
    
    if (core.scene && core.scene.entities) {
      dump.entitiesKeys = Object.keys(core.scene.entities);
      dump.entitiesProto = Object.keys(Object.getPrototypeOf(core.scene.entities));
    }
    
    if (core.commandManager) {
      dump.cmKeys = Object.keys(core.commandManager);
      dump.cmProto = Object.keys(Object.getPrototypeOf(core.commandManager));
    }
    
    if (core.scene) {
      dump.sceneKeys = Object.keys(core.scene);
      dump.sceneProto = Object.keys(Object.getPrototypeOf(core.scene));
    }

    return dump;
  });
  
  console.log(JSON.stringify(compState, null, 2));
  await browser.close();
})();
