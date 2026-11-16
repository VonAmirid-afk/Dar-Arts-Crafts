const fs=require('node:fs');
fs.mkdirSync('dist',{recursive:true});
for(const name of ['index.html','creator.html','materials.html','how-it-works.html','thank-you.html','admin.html','app.js','site.js','catalogue.js','admin.js','admin-core.js','styles.css','admin.css','media','fonts'])fs.cpSync(name,`dist/${name}`,{recursive:true});
fs.writeFileSync('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
