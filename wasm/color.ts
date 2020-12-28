// asc --use Math=JSMath -o wasm/color.wasm wasm/color.ts

type color = u8;
type float = f64;

export function distance( r1: color, g1: color, b1: color, r2: color, g2: color, b2: color ): float
{
    rgbToLab( r1, g1, b1 );
    const L_1 = L;
    const a_1 = a;
    const b_1 = b;

    rgbToLab( r2, g2, b2 );
    const L_2 = L;
    const a_2 = a;
    const b_2 = b;

    return ciede2000(
        L_1, a_1, b_1,
        L_2, a_2, b_2,
        1, 1, 1
    );
}

function calcColorVal( c: float ): float
{
    return 0.04045 < c ? Math.pow( ( ( c + 0.055 ) / 1.055 ), 2.4 ) : ( c / 12.92 );
}

function calcX( r: float, g: float, b: float ): float
{
    const x = ( ( r * 0.4124 ) + ( g * 0.3576 ) + ( b * 0.1805 ) ) * 100 / 95.047;

    return 0.008856 < x ? Math.pow( x, 1 / 3 ) : ( 7.787 * x ) + ( 4 / 29 );
}

function calcY( r: float, g: float, b: float ): float
{
    const y = ( ( r * 0.2126 ) + ( g * 0.7152 ) + ( b * 0.0722 ) ) * 100 / 100;

    return 0.008856 < y ? Math.pow( y, 1 / 3 ) : ( 7.787 * y ) + ( 4 / 29 );
}

function calcZ( r: float, g: float, b: float ): float
{
    const z = ( ( r * 0.0193 ) + ( g * 0.1192 ) + ( b * 0.9505 ) ) * 100 / 108.883;

    return 0.008856 < z ? Math.pow( z, 1 / 3 ) : ( 7.787 * z ) + ( 4 / 29 );
}

let L: float;
let a: float;
let b: float;
export function getL(): float { return L; }
export function getA(): float { return a; }
export function getB(): float { return b; }

export function rgbToLab( R: color, G: color, B: color ): void
{
    // https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation

    const _r: float = calcColorVal( <float>R / 255.0 );
    const _g: float = calcColorVal( <float>G / 255.0 );
    const _b: float = calcColorVal( <float>B / 255.0 );

    const x = calcX( _r, _g, _b );
    const y = calcY( _r, _g, _b );
    const z = calcZ( _r, _g, _b );

    // https://en.wikipedia.org/wiki/Lab_color_space#CIELAB-CIEXYZ_conversions

    L = ( 116 * y ) - 16;
    a = 500 * ( x - y );
    b = 200 * ( y - z );
}

function calcHp( b: float, ap: float ): float
{
    if ( b == 0 && ap == 0 )
    {
        return 0;
    }
    const hp1 = radianToDegree( Math.atan2( b, ap ) );

    return  hp1 < 0 ? hp1 + 360 : hp1;
}

function calcDelta( C1: float, C2: float, hp1: float, hp2: float ): float
{
    if ( C1 == 0 || C2 == 0 )
    {
        return 0;
    }

    if ( Math.abs( hp1 - hp2 ) <= 180 )
    {
        return hp2 - hp1;
    }

     if ( hp2 <= hp1 )
    {
        return hp2 - hp1 + 360;
    }

    return hp2 - hp1 - 360;
}

function calcHp2( hp1: float, hp2: float ): float
{
    if ( Math.abs( hp1 - hp2 ) > 180 )
    {
        return ( hp1 + hp2 + 360 ) / 2;
    }

    return  ( hp1 + hp2 ) / 2;
}

function calcSl( value: float ): float
{
    return 1 + ( ( 0.015 * value ) / Math.sqrt( 20 + value ) );
}

function calcRt( value: float, hp: float ): float
{
    return -2 *
        Math.sqrt( value / ( value + Math.pow( 25, 7 ) ) ) *
        Math.sin( degreeToRadian(
            60 * Math.exp( -Math.pow( ( hp - 275 ) / 25, 2 ) )
        )
    );
}

export function ciede2000(
    L1: float, a1: float, b1: float,
    L2: float, a2: float, b2: float,
    kL: float, kC: float, kH: float
): float
{
    // http://en.wikipedia.org/wiki/Color_difference#CIEDE2000

    const deltaLp = L2 - L1;

    const C1 = Math.sqrt( Math.pow( a1, 2) + Math.pow( b1, 2 ) );
    const C2 = Math.sqrt( Math.pow( a2, 2) + Math.pow( b2, 2 ) );

    const c = Math.pow( ( C1 + C2 ) / 2, 7 );
    const ap = Math.sqrt( c / ( c + Math.pow( 25, 7 ) ) );
    const ap1 = a1 + (a1 / 2) * ( 1 - ap );
    const ap2 = a2 + (a2 / 2) * ( 1 - ap );

    const Cp1 = Math.sqrt( Math.pow( ap1, 2 ) + Math.pow( b1, 2 ) );
    const Cp2 = Math.sqrt( Math.pow( ap2, 2 ) + Math.pow( b2, 2 ) );

    const cp = ( Cp1 + Cp2 ) / 2;

    const deltaCp = Cp2 - Cp1;

    const hp1 = calcHp( b1, ap1 );
    const hp2 = calcHp( b2, ap2 );

    const deltaHp = 2 * Math.sqrt( Cp1 * Cp2 ) * Math.sin( degreeToRadian( calcDelta( C1, C2, hp1, hp2 ) ) / 2 )

    const hp = calcHp2( hp1, hp2 );

    const SL = calcSl( Math.pow( ( L1 + L2 ) / 2 - 50, 2 ) );
    const SC = 1 + 0.045 * cp;
    const SH = 1 + 0.015 * cp * ( 1 -
        0.17 * Math.cos( degreeToRadian( hp - 30 ) ) +
        0.24 * Math.cos( degreeToRadian( 2 * hp ) ) +
        0.32 * Math.cos( degreeToRadian( 3 * hp + 6 ) ) -
        0.20 * Math.cos( degreeToRadian( 4 * hp - 63 ) )
    );

    const RT = calcRt( Math.pow( cp, 7 ), hp );

    return Math.sqrt(
        Math.pow( deltaLp / ( kL * SL ), 2) +
        Math.pow( deltaCp / ( kC * SC ), 2) +
        Math.pow( deltaHp / ( kH * SH ), 2) +
        RT * ( deltaCp / ( kC * SC ) ) * ( deltaHp / ( kH * SH ) )
    );
}

export function radianToDegree( radian: float ): float
{
    return radian * ( 180 / Math.PI );
}

export function degreeToRadian( degree: number ): float
{
    return degree * ( Math.PI / 180 );
}
