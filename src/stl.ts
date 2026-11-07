// Minimal STL inspection: detects ASCII vs binary, counts triangles, computes the bounding box.
// The View does the actual rendering with three.js; the server only needs a summary the model can read.

export type StlSummary = {
  format: "ascii" | "binary";
  triangles: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  size: [number, number, number];
};

export function summarizeStl(buf: Buffer): StlSummary {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const add = (x: number, y: number, z: number) => {
    const p = [x, y, z];
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  };

  let format: StlSummary["format"];
  let triangles = 0;

  // Binary STL: 80-byte header, uint32 count, 50 bytes per triangle. Some binary files start with "solid",
  // so trust the size check first.
  const count = buf.length >= 84 ? buf.readUInt32LE(80) : -1;
  if (count >= 0 && 84 + count * 50 === buf.length) {
    format = "binary";
    triangles = count;
    for (let t = 0; t < count; t++) {
      const o = 84 + t * 50 + 12; // skip normal
      for (let v = 0; v < 3; v++) add(buf.readFloatLE(o + v * 12), buf.readFloatLE(o + v * 12 + 4), buf.readFloatLE(o + v * 12 + 8));
    }
  } else {
    format = "ascii";
    const text = buf.toString("utf8");
    if (!/^\s*solid/i.test(text)) throw new Error("Not an STL file (no binary header match and no 'solid' keyword)");
    const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;
    let m: RegExpExecArray | null;
    let vertices = 0;
    while ((m = re.exec(text))) {
      add(Number(m[1]), Number(m[2]), Number(m[3]));
      vertices++;
    }
    triangles = Math.floor(vertices / 3);
  }

  if (triangles === 0) throw new Error("STL file contains no triangles");
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { format, triangles, bbox: { min, max }, size };
}
