import { Strimg } from './strimg.ts'

//--allow-net --allow-read

const strimg = new Strimg( 60, 30 );
//const strimg = new Strimg( 120, 60 );
await strimg.loadImage( 'https://hirokimiyaoka.github.io/Strimg/sample.jpg' );
const img = strimg.convert();
console.log( img );
