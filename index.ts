import { Strimg } from './strimg.ts'
import { termcolor } from 'https://github.com/Azulamb/termcolor/raw/main/mod.ts'

//deno run --allow-net --allow-read index.ts

const strimg = new Strimg( 60, 30 );
//await strimg.loadImage( 'https://hirokimiyaoka.github.io/Strimg/sample.jpg' );
await strimg.loadImage( './docs/sample.jpg' );
const img16 = await strimg.convert();
console.log( img16 );

console.log( '----' );

strimg.setTerminalColor( new termcolor.tc256() );
await strimg.loadImage( './docs/sample.jpg' );
const img256 = await strimg.convert();
console.log( img256 );
