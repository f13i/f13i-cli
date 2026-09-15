// Regression: regenerate ATX20 + LAS16 from saved HTML and assert they match the
// rows already in Farhan's sheet. Run: node test.js  (expects *.html fixtures beside it)
const fs=require('fs'), P=require('./parser.js');
const EXPECT={
 'austin-atx20':[['ATX 20: Explore','7/9/26','7/13/26','',''],['ATX 20: Breakthrough','7/22/26','7/27/26','',''],['ATX 20: RD 1W','8/7/26','8/10/26','',''],['ATX 20: RD 2W','9/11/26','9/14/26','',''],['ATX 20: RD 3W','10/16/26','10/19/26','',''],['ATX 20 Support: Feedback','7/22/26','7/22/26','18:30','23:59'],['ATX 20 Support: Lifeboat','7/23/26','7/23/26','18:30','23:59'],['ATX 20 Support: Contract','7/24/26','7/24/26','22:00','23:59'],['ATX 20 Support: Cradle','7/25/26','7/25/26','17:30','23:59']],
 'lasvegas-las16':[['LAS 16: Explore','7/30/26','8/3/26','',''],['LAS 16: Breakthrough','8/12/26','8/17/26','',''],['LAS 16: RD 1W','8/28/26','8/31/26','',''],['LAS 16: RD 2W','10/2/26','10/5/26','',''],['LAS 16: RD 3W','11/6/26','11/9/26','',''],['LAS 16 Support: Feedback','8/12/26','8/12/26','18:30','23:59'],['LAS 16 Support: Lifeboat','8/13/26','8/13/26','18:30','23:59'],['LAS 16 Support: Contract','8/14/26','8/14/26','22:00','23:59'],['LAS 16 Support: Cradle','8/15/26','8/15/26','17:30','23:59']],
};
let pass=true;
for(const slug of Object.keys(EXPECT)){
  if(!fs.existsSync(slug+'.html')){console.log('skip (no fixture):',slug);continue;}
  const info=P.parseSlug(slug);
  const rows=P.buildCohortRows(info.code,info.city,P.extractRanges(P.stripHtml(fs.readFileSync(slug+'.html','utf8'))).slice(0,5));
  const exp=EXPECT[slug];let ok=true;
  for(let i=0;i<exp.length;i++){const got=[rows[i][2],rows[i][3],rows[i][4],rows[i][5],rows[i][6]];if(JSON.stringify(got)!==JSON.stringify(exp[i])){ok=false;pass=false;console.log('  MISMATCH',slug,'row',i,got,'!=',exp[i]);}}
  console.log(info.code, ok?'OK':'FAIL');
}
console.log(pass?'\nALL PASS':'\nFAIL');process.exit(pass?0:1);
