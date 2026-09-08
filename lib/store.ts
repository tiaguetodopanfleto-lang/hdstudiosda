export {db} from './database';
export const OWNER='tpdasilva@icloud.com';
export {appIdentity as identity} from './auth';
export function cents(v:unknown){const n=Number(v);if(!Number.isFinite(n)||n<0||n>1000000)throw new Error('Valor inválido');return Math.round(n*100);}
export function clean(v:unknown,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Confira os campos obrigatórios');return v.trim();}
export function delivery(v:unknown){if(!v)return '';const s=clean(v,1000);if(!s.startsWith('https://'))throw new Error('O link de entrega precisa começar com https://');return s;}
export const key='8e33ffc2-ec71-438e-b088-b07979dbc69d';
export function pix(city:string){const field=(id:string,v:string)=>id+String(v.length).padStart(2,'0')+v;const normalized=city.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,15);if(!normalized)throw new Error('Informe a cidade do recebedor no Dashboard');let payload=field('00','01')+field('26',field('00','br.gov.bcb.pix')+field('01',key))+field('52','0000')+field('53','986')+field('58','BR')+field('59','TIAGO PEREIRA DA SILVA')+field('60',normalized)+field('62',field('05','***'))+'6304';let crc=0xffff;for(const ch of payload){crc^=ch.charCodeAt(0)<<8;for(let j=0;j<8;j++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;}return payload+crc.toString(16).toUpperCase().padStart(4,'0');}
