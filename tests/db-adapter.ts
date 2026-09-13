import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
export function database(filename=":memory:") {
 const sqlite=new DatabaseSync(filename);sqlite.exec("PRAGMA foreign_keys=ON;");
 sqlite.exec("CREATE TABLE IF NOT EXISTS test_migrations (name TEXT PRIMARY KEY)");
 for(const file of ["0000_mindcompass_responses.sql","0001_study.sql","0002_material_mandarin.sql"]){
  if(sqlite.prepare("SELECT name FROM test_migrations WHERE name=?").get(file))continue;
  sqlite.exec(readFileSync(`drizzle/${file}`,"utf8"));
  sqlite.prepare("INSERT INTO test_migrations(name) VALUES(?)").run(file);
 }
 class Statement {
  values: unknown[]=[];
  constructor(public sql:string){}
  bind(...values:unknown[]){const next=new Statement(this.sql);next.values=values;return next;}
  async first<T>(){return (sqlite.prepare(this.sql).get(...this.values as []) as T)||null;}
  async all<T>(){return {results:sqlite.prepare(this.sql).all(...this.values as []) as T[],success:true,meta:{}};}
  async run(){const result=sqlite.prepare(this.sql).run(...this.values as []);return {success:true,meta:{changes:Number(result.changes)}};}
 }
 let queue:Promise<unknown>=Promise.resolve();
 const adapter={prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>{const operation=queue.then(async()=>{sqlite.exec("BEGIN");try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec("COMMIT");return out;}catch(e){sqlite.exec("ROLLBACK");throw e;}});queue=operation.catch(()=>{});return operation;}};
 return {db:adapter as unknown as D1Database,sqlite};
}
