import { Strimg } from './strimg.ts'

//deno run --allow-net --allow-read index.ts

const strimg = new Strimg( 60, 30 );
//await strimg.loadImage( 'https://hirokimiyaoka.github.io/Strimg/sample.jpg' );
await strimg.loadImage( './docs/sample.jpg' );
const img = await strimg.convert();
console.log( img );
