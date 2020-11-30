import Canvas, { loadImage, SkImage, ImageData } from 'https://deno.land/x/canvas@v1.0.4/mod.ts';

interface TerminalColorTable
{
    reset: string;
    front: { [ key: string ]: string, default: string, },
    back: { [ key: string ]: string, default: string, },
}

interface TerminalColor
{
    colors(): { r: number, g: number, b: number }[];

    terminal(): TerminalColorTable;
}

class Terminal16Color implements TerminalColor
{
    private table =
    [
        { r: 0,   g: 0,   b: 0,   back: '30m', front: '40m',  name: 'black' },
        { r: 128, g: 0,   b: 0,   back: '31m', front: '41m',  name: 'maroon' },
        { r: 0,   g: 128, b: 0,   back: '32m', front: '42m',  name: 'green' },
        { r: 128, g: 128, b: 0,   back: '33m', front: '43m',  name: 'olive' },
        { r: 0,   g: 0,   b: 128, back: '34m', front: '44m',  name: 'navy' },
        { r: 128, g: 0,   b: 128, back: '35m', front: '45m',  name: 'purple' },
        { r: 0,   g: 128, b: 128, back: '36m', front: '46m',  name: 'teal' },
        { r: 192, g: 192, b: 192, back: '37m', front: '47m',  name: 'silver' },
        { r: 128, g: 128, b: 128, back: '90m', front: '100m', name: 'gray' },
        { r: 255, g: 0,   b: 0,   back: '91m', front: '101m', name: 'red' },
        { r: 0,   g: 255, b: 0,   back: '92m', front: '102m', name: 'lime' },
        { r: 255, g: 255, b: 0,   back: '93m', front: '103m', name: 'yellow' },
        { r: 0,   g: 0,   b: 255, back: '94m', front: '104m', name: 'blue' },
        { r: 255, g: 0,   b: 255, back: '95m', front: '105m', name: 'magenta' },
        { r: 0,   g: 255, b: 255, back: '96m', front: '106m', name: 'cyan' },
        { r: 255, g: 255, b: 255, back: '97m', front: '107m', name: 'white' },
    ];

    constructor()
    {
        const prefix = '\x1b[';
        this.table.forEach( ( color ) =>
        {
            color.back = prefix + color.back;
            color.front = prefix + color.front;
        } );
    }

    public colors() { return this.table.map( ( color ) => { return { r: color.r, g: color.g, b: color.b }; } ); }

    public terminal()
    {
        const back: { [ key: string ]: string, default: string, } = { default: '', };
        const front: { [ key: string ]: string, default: string, } = { default: '', };

        this.table.forEach( ( color ) =>
        {
            const code = Color.ColorCodeToString(
                color.r,
                color.g,
                color.b
            );
            back[ code ] = color.back;
            front[ code ] = color.front;
        } );

        return {
            reset: '\x1b[0m',
            front: front,
            back: back,
        };
    }
}

export interface ImageDataConverter
{
    ( image: ImageData ): string;
}

export interface ColorReducer
{
    ( image: ImageData ): ImageData;
}

interface ImageColorReducer
{
    convert( image: ImageData ): ImageData | null;
}

interface ImageToStringConverter
{
    convert( image: ImageData ): string;
}

export class Strimg
{
    private width: number = 0;
    private height: number = 0;
    private image: SkImage | null = null;
    private mode: 'contain' | 'cover' = 'contain';
    private positionX: 'center' | 'left' | 'right' = 'center';
    private positionY: 'center' | 'top' | 'bottom' = 'center';
    private color = new Terminal16Color();

    constructor( width?: number, height?: number )
    {
        if ( width && height )
        {
            this.resize( width, height );
        }
    }

    public async loadImage( url: string ): Promise<this>
    {
        this.image = await loadImage( url );

        return this;
    }

    public convert( converter?: ImageDataConverter, reducer?: ColorReducer )
    {
        const rawImage = this.resizeImage();
        if ( !rawImage ) { return ''; }

        const image = reducer ? reducer( rawImage ) : this.imageDataToConsoleColors( rawImage );
        if ( !image ) { return ''; }

        return converter ? converter( image ) : this.imageDataToConsoleString( image );
    }

    public resize( width: number, height: number )
    {
        if ( 0 < width ) { this.width = width; }
        if ( 0 < height ) { this.height = height; }
    }

    private resizeImage()
    {
        if ( !this.image ) { return; }

        const canvas = Canvas.MakeCanvas( this.width, this.height );
        const context = canvas.getContext( '2d' );

        if ( !context ) { return; }

        const size = this.culcSize( this.image.width(), this.image.height() );

        context.drawImage( this.image, size.x, size.y, size.width, size.height );

        return context.getImageData(0, 0, this.width, this.height );
    }

    public imageDataToConsoleColors( image: ImageData )
    {
        const converter = new ToneReductionImage();
        converter.setColor( this.color );

        return converter.convert( image );
    }

    public imageDataToConsoleString( image: ImageData )
    {
        const converter = new ImageToTerminalString();
        converter.setColor( this.color );

        return converter.convert( image );
    }

    private culcSize( width: number, height: number )
    {
        const size =
        {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };

        const resize = this.mode === 'contain' ?
            this.calcContain( width, height ) :
            this.calcCover( width, height );
        size.width = resize.width;
        size.height = resize.height;

        switch ( this.positionX )
        {
            case 'right': size.x = this.width - size.width; break;
            case 'center': size.x = Math.floor( ( this.width - size.width ) / 2 ); break;
        }

        switch ( this.positionY )
        {
            case 'bottom': size.y = this.height - size.height; break;
            case 'center': size.y = Math.floor( ( this.height - size.height ) / 2 ); break;
        }

        return size;
    }

    private calcContain( width: number, height: number )
    {
        const scale = this.width / width;
        if ( height * scale <= this.height )
        {
            return { width: this.width, height: Math.floor( height * scale ) }
        }
        return {
            width: Math.floor( width * this.height / height ),
            height: this.height,
        };
    }

    private calcCover( width: number, height: number )
    {
        const scale = this.width / width;
        if ( this.height <= height * scale )
        {
            return { width: this.width, height: Math.floor( height * scale ) }
        }

        return {
            width: Math.floor( width * this.height / height ),
            height: this.height,
        };
    }
}

class Color
{
    static radianToDegree( radian: number ) { return radian * ( 180 / Math.PI ); }

    static degreeToRadian( degree: number ) { return degree * ( Math.PI / 180 ); }

    static distance(
        r1: number, g1: number, b1: number,
        r2: number, g2: number, b2: number
    )
    {
        const x = Color.rgbToLab( r1, g1, b1 );
        const y = Color.rgbToLab( r2, g2, b2 );
        return Color.ciede2000(
            x.L, x.a, x.b,
            y.L, y.a, y.b
        );
    }

    static ciede2000(
        L1: number, a1: number, b1: number,
        L2: number, a2: number, b2: number,
        kL = 1, kC = 1, kH = 1
    ) {
        // http://en.wikipedia.org/wiki/Color_difference#CIEDE2000

        const deltaLp = L2 - L1;

        const C1 = Math.sqrt( Math.pow( a1, 2) + Math.pow( b1, 2 ) );
        const C2 = Math.sqrt( Math.pow( a2, 2) + Math.pow( b2, 2 ) );

        const [ ap1, ap2 ] = ( ( value ) =>
        {
            value = Math.sqrt( Math.pow( value, 7 ) / ( Math.pow( value, 7 ) + Math.pow( 25, 7 ) ) );
            return [
                a1 + (a1 / 2) * ( 1 - value ),
                a2 + (a2 / 2) * ( 1 - value ),
            ];
        } )( ( C1 + C2 ) / 2 );

        const Cp1 = Math.sqrt( Math.pow( ap1, 2 ) + Math.pow( b1, 2 ) );
        const Cp2 = Math.sqrt( Math.pow( ap2, 2 ) + Math.pow( b2, 2 ) );

        const cp = ( Cp1 + Cp2 ) / 2;

        const deltaCp = Cp2 - Cp1;

        const hp1 = ( () =>
        {
            if ( b1 == 0 && ap1 == 0 )
            {
                return 0;
            }
            const hp1 = Color.radianToDegree( Math.atan2( b1, ap1 ) );
            return  hp1 < 0 ? hp1 + 360 : hp1;
        } )();
        const hp2 = ( () =>
        {
            if ( b2 == 0 && ap2 == 0 )
            {
                return 0;
            }
            const hp2 = Color.radianToDegree( Math.atan2( b2, ap2 ) );
            return hp2 < 0 ? hp2 + 360 : hp2;
        } )();

        const deltaHp = ( () =>
        {
            let deltaHp;
            if ( C1 == 0 || C2 == 0 )
            {
                deltaHp = 0;
            } else if ( Math.abs( hp1 - hp2 ) <= 180 )
            {
                deltaHp = hp2 - hp1;
            } else if ( hp2 <= hp1 )
            {
                deltaHp = hp2 - hp1 + 360;
            } else
            {
                deltaHp = hp2 - hp1 - 360;
            }

            return 2 * Math.sqrt( Cp1 * Cp2 ) * Math.sin( Color.degreeToRadian( deltaHp ) / 2 )
        } )();

        const hp = ( () =>
        {
            if ( Math.abs( hp1 - hp2 ) > 180 )
            {
                return ( hp1 + hp2 + 360 ) / 2;
            }
            return  ( hp1 + hp2 ) / 2;
        } )();

        const SL = ( ( value ) =>
        {
            return 1 + ( ( 0.015 * value ) / Math.sqrt( 20 + value ) );
        } )( Math.pow( ( L1 + L2 ) / 2 - 50, 2 ) );
        const SC = 1 + 0.045 * cp;
        const SH = ( ( value ) =>
        {
            return 1 + 0.015 * cp * value;
        } )( 1 -
            0.17 * Math.cos( Color.degreeToRadian( hp - 30 ) ) +
            0.24 * Math.cos( Color.degreeToRadian( 2 * hp ) ) +
            0.32 * Math.cos( Color.degreeToRadian( 3 * hp + 6 ) ) -
            0.20 * Math.cos( Color.degreeToRadian( 4 * hp - 63 ) )
        );

        const RT = ( ( value ) =>
        {
            return -2 *
                Math.sqrt( value / ( value + Math.pow( 25, 7 ) ) ) *
                Math.sin( Color.degreeToRadian(
                    60 * Math.exp( -Math.pow( ( hp - 275 ) / 25, 2 ) )
                )
            );
        } )( Math.pow( cp, 7 ) );

        return Math.sqrt(
            Math.pow( deltaLp / ( kL * SL ), 2) +
            Math.pow( deltaCp / ( kC * SC ), 2) +
            Math.pow( deltaHp / ( kH * SH ), 2) +
            RT * ( deltaCp / ( kC * SC ) ) * ( deltaHp / ( kH * SH ) )
        );
    }

    static rgbToLab( R: number, G: number, B: number )
    {
        // https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation

        const conv = ( c: number ) =>
        {
            return 0.04045 < c ? Math.pow( ( ( c + 0.055 ) / 1.055 ), 2.4 ) : ( c / 12.92 );
        };

        const [ x, y, z ] = ( ( r, g, b ) =>
        {
            return [
                ( r * 0.4124 ) + ( g * 0.3576 ) + ( b * 0.1805 ),
                ( r * 0.2126 ) + ( g * 0.7152 ) + ( b * 0.0722 ),
                ( r * 0.0193 ) + ( g * 0.1192 ) + ( b * 0.9505 ),    
            ];
        } )(
            conv( R / 255 ),
            conv( G / 255 ),
            conv( B / 255 )
        );

        // https://en.wikipedia.org/wiki/Lab_color_space#CIELAB-CIEXYZ_conversions

        return ( ( x, y, z ) =>
        {
            x *= 100;
            y *= 100;
            z *= 100;

            x /= 95.047;
            y /= 100;
            z /= 108.883;

            x = 0.008856 < x ? Math.pow( x, 1 / 3 ) : ( 7.787 * x ) + ( 4 / 29 );
            y = 0.008856 < y ? Math.pow( y, 1 / 3 ) : ( 7.787 * y ) + ( 4 / 29 );
            z = 0.008856 < z ? Math.pow( z, 1 / 3 ) : ( 7.787 * z ) + ( 4 / 29 );

            return {
                L: ( 116 * y ) - 16,
                a: 500 * ( x - y ),
                b: 200 * ( y - z ),
            };
        } )( x, y, z );
    }

    static ColorCodeToString( r: number, g: number, b: number )
    {
        return r.toString( 16 ).padStart( 2, '0' ) +
            g.toString( 16 ).padStart( 2, '0' ) +
            b.toString( 16 ).padStart( 2, '0' );
    }
}

class ToneReductionImage implements ImageColorReducer
{
    private table: { r: number, g: number, b: number }[] = [];

    public setColor( color: TerminalColor )
    {
        this.table = color.colors();
    }

    public convert( image: ImageData )
    {
        const canvas = Canvas.MakeCanvas( image.width, image.height );
        const context = canvas.getContext( '2d' );
        if ( !context ) { return null; }

        const max = image.data.length;
        for ( let i = 0 ; i < max ; i += 4 )
        {
            const color = this.similarColor(
                image.data[ i ],
                image.data[ i + 1 ],
                image.data[ i + 2 ]
            );
            context.fillStyle = '#' + Color.ColorCodeToString( color.r, color.g, color.b );
            context.fillRect( ( i / 4 ) % image.width, Math.floor( i / 4 / image.width ) , 1, 1 );
        }

        return context.getImageData( 0, 0, image.width, image.height );
    }

    public similarColor( r: number, g: number, b: number )
    {
        return this.table.reduce( ( prev: { r: number, g: number, b: number, v: number }, current, index ) =>
        {
            const value = Color.distance(
                current.r, current.g, current.b,
                r, g, b
            );

            return index <= 0 || value < prev.v ? {
                ... current,
                v: value,
            } : prev;
        }, { ... this.table[ 0 ], v: 0 } );
    }
}

class ImageToTerminalString implements ImageToStringConverter
{
    private newLine = '\n';
    private halfBlock = '▀';
    private colors: TerminalColorTable = { reset: '', front: { default: '' }, back: { default: '' } };

    public setColor( color: TerminalColor )
    {
        const prefix = '\x1b[';
        this.colors = color.terminal();
    }

    public convert( image: ImageData ): string
    {
        const lines: string[] = [];
        for ( let y = 0 ; y < image.height ; y += 2 )
        {
            let prevBack = '';
            let prevFront = '';
            const line: string[] = [];
            for ( let x = 0 ; x < image.width ; ++x )
            {
                const base1 = ( y * image.width + x ) * 4;
                const colorName1 = Color.ColorCodeToString(
                    image.data[ base1 ],
                    image.data[ base1 + 1 ],
                    image.data[ base1 + 2 ]
                );
                const base2 = base1 + image.width * 4;
                const colorName2 = ( y + 1 < image.height ? Color.ColorCodeToString(
                    image.data[ base2 ],
                    image.data[ base2 + 1 ],
                    image.data[ base2 + 2 ]
                ) : 'default' );
    
                const front = this.colors.front[ colorName1 ] || this.colors.front.default;
                const back = this.colors.back[ colorName2 ] || this.colors.back.default;
    
                if ( prevBack !== back )
                {
                    prevBack = back;
                    line.push( back );
                }
                if ( prevFront !== front )
                {
                    prevFront = front;
                    line.push( front );
                }
                line.push( this.halfBlock );
            }
            lines.push( line.join( '' ) + this.colors.reset );
        }
    
        return lines.join( this.newLine );
    }
}