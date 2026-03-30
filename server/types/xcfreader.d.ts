declare module 'xcfreader' {
  interface Layer {
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    visible: boolean;
    opacity: number;
    toPNG(): Buffer;
    render(image: XCFImage): void;
  }

  interface XCFImage {
    width: number;
    height: number;
    layers: Layer[];
    fill(color: { red: number; green: number; blue: number; alpha: number }): void;
    flatten(): XCFImage;
    toPNG(): Buffer;
  }

  export function readXCF(path: string): XCFImage;
  export function readXCFBuffer(buffer: Buffer): XCFImage;
}
