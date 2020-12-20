# Strimg

## Example

```
deno run --allow-net --allow-read index.ts
```

or 

```js
import { Strimg } from './strimg.ts'

//deno run --allow-net --allow-read index.ts

const url = 'https://hirokimiyaoka.github.io/Strimg/sample.jpg';


const strimg = new Strimg( 60, 30 );

console.log( '16 colors.' );
await strimg.loadImage( url );
const img16 = await strimg.convert();
console.log( img16 );

console.log( '256 colors.' );

strimg.setTerminalColor( 256 );
await strimg.loadImage( url );
const img256 = await strimg.convert();
console.log( img256 );

console.log( 'Full colors.' );

strimg.setTerminalColor( 0 );
await strimg.loadImage( url );
const imgfull = await strimg.convert();
console.log( imgfull );
```
