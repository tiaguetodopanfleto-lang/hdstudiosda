import {getDatabase} from '@netlify/database';

type Result={rows:any[];rowCount:number|null};
type Connection={query:(sql:string,values?:unknown[])=>Promise<Result>;release:()=>void};
type Pool={query:(sql:string,values?:unknown[])=>Promise<Result>;connect:()=>Promise<Connection>};

// Keep bound values separate from SQL. Quoted SQL strings may contain literal '?'.
export function parameters(query:string){let index=0;return query.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g,part=>part==='?'?'$'+(++index):part)}
const numeric=new Set(['created','updated','expires','owner_typing','customer_typing','orders_count','spent']);
function normalize(row:any){return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,numeric.has(key)&&typeof value==='string'&&/^-?\d+$/.test(value)?Number(value):value]))}
class Statement{
 constructor(readonly pool:Pool,readonly sql:string,readonly values:unknown[]=[]){ }
 bind(...values:unknown[]){return new Statement(this.pool,this.sql,values)}
 async first():Promise<any>{const result=await this.pool.query(this.sql,this.values);return result.rows[0]?normalize(result.rows[0]):null}
 async all(){const result=await this.pool.query(this.sql,this.values);return {results:result.rows.map(normalize)}}
 async run(){const result=await this.pool.query(this.sql,this.values);return {meta:{changes:result.rowCount||0}}}
}
export function createDatabase(pool:Pool){return {
 prepare(query:string){return new Statement(pool,parameters(query))},
 async batch(statements:Statement[]){
  const connection=await pool.connect();
  try{await connection.query('BEGIN');const result=[];for(const statement of statements){const row=await connection.query(statement.sql,statement.values);result.push({meta:{changes:row.rowCount||0}})}await connection.query('COMMIT');return result}
  catch(error){await connection.query('ROLLBACK');throw error}
  finally{connection.release()}
 }
}}
let database:ReturnType<typeof createDatabase>|undefined;
export function db(){database??=createDatabase(getDatabase().pool as unknown as Pool);return database}
