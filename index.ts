import { Strimg } from './strimg.ts'

//deno run --allow-net --allow-read index.ts

//const url = 'https://hirokimiyaoka.github.io/Strimg/sample.jpg';
const url = './docs/sample.jpg';

const strimg = new Strimg( 60, 30 );
await strimg.loadImage( url );
const img16 = await strimg.convert();
console.log( img16 );

console.log( '----' );

strimg.setTerminalColor( 256 );
await strimg.loadImage( url );
const img256 = await strimg.convert();
console.log( img256 );
