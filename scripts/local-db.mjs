import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
export function localDB(filename='work/tripon.sqlite'){
  if(filename!==':memory:')mkdirSync('work',{recursive:true});
  const db=new DatabaseSync(filename);
  const exists=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tripon_groups'").get();
  if(!exists)db.exec(readFileSync('drizzle/0000_shared_groups.sql','utf8'));
  return {prepare(sql){let args=[];return{bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async run(){const result=db.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}};}};},close(){db.close();}};
}
