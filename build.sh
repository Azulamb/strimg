#!/bin/sh

# Use AssemblyScript NativeMath
#asc -o wasm/color.wasm wasm/color.ts
#asc -o wasm/color.wat wasm/color.ts

asc --use Math=JSMath -o wasm/color.wasm wasm/color.ts
asc --use Math=JSMath -o wasm/color.wat wasm/color.ts
