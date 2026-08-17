import { deflateRawSync } from "zlib";

// ZIP armado a mano con el módulo nativo "zlib" (DEFLATE), sin agregar
// ninguna librería npm nueva (jszip/archiver) — mismo criterio de
// siempre en este proyecto por lo lenta que es una instalación nueva en
// la unidad de red. Formato estándar (local file headers + directorio
// central + end record), lo abre cualquier programa de zip normal.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function fechaDos(fecha: Date) {
  const dosTime =
    ((fecha.getHours() & 0x1f) << 11) |
    ((fecha.getMinutes() & 0x3f) << 5) |
    ((fecha.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((fecha.getFullYear() - 1980) & 0x7f) << 9) |
    (((fecha.getMonth() + 1) & 0xf) << 5) |
    (fecha.getDate() & 0x1f);
  return { dosTime, dosDate };
}

export function crearZip(archivos: { nombre: string; datos: Buffer }[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  const { dosTime, dosDate } = fechaDos(new Date());
  let offset = 0;

  for (const archivo of archivos) {
    const nombreBuf = Buffer.from(archivo.nombre, "utf8");
    const comprimido = deflateRawSync(archivo.datos);
    const crc = crc32(archivo.datos);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(comprimido.length, 18);
    localHeader.writeUInt32LE(archivo.datos.length, 22);
    localHeader.writeUInt16LE(nombreBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nombreBuf, comprimido);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(comprimido.length, 20);
    centralHeader.writeUInt32LE(archivo.datos.length, 24);
    centralHeader.writeUInt16LE(nombreBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nombreBuf);

    offset += localHeader.length + nombreBuf.length + comprimido.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralChunks.reduce((sum, b) => sum + b.length, 0);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(archivos.length, 8);
  end.writeUInt16LE(archivos.length, 10);
  end.writeUInt32LE(centralDirSize, 12);
  end.writeUInt32LE(centralDirOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, end]);
}
