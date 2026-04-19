import { NextRequest } from "next/server";
import busboy from "busboy";
import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import { promises as fsPromises } from "node:fs";

interface ParsedMultipart {
  fields: Record<string, string>;
  filePath?: string;
  fileName?: string;
}

/**
 * Streams a multipart/form-data request body to disk and parses fields.
 * This is memory-efficient and avoids buffering large files in RAM.
 */
export async function streamMultipartFormData(req: NextRequest): Promise<ParsedMultipart> {
  const headers = Object.fromEntries(req.headers);
  const bb = busboy({ headers });
  
  const fields: Record<string, string> = {};
  let filePath: string | undefined;
  let fileName: string | undefined;

  // Ensure temp directory exists
  const tempDir = path.join(process.cwd(), "src/tmp");
  if (!fs.existsSync(tempDir)) {
    await fsPromises.mkdir(tempDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    bb.on("file", (name, file, info) => {
      fileName = info.filename;
      const fileId = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      filePath = path.join(tempDir, fileId);
      
      const writeStream = fs.createWriteStream(filePath);
      file.pipe(writeStream);
      
      writeStream.on("error", (err) => {
        reject(new Error(`Failed to write file to disk: ${err.message}`));
      });
    });

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("finish", () => {
      resolve({ fields, filePath, fileName });
    });

    bb.on("error", (err: any) => {
      reject(new Error(`Busboy error: ${err.message}`));
    });

    // Pipe the web request body (ReadableStream) to busboy (Node.js WritableStream)
    // We use Readable.fromWeb to bridge the two stream APIs
    if (!req.body) {
      return reject(new Error("Request body is empty"));
    }
    
    Readable.fromWeb(req.body as any).pipe(bb);
  });
}
