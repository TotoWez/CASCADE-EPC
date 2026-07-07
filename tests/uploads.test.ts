import { describe, it, expect } from "vitest";
import { assertUploadAllowed, MAX_ATTACHMENT_BYTES } from "@/lib/api/notes";

function fakeFile(name: string, type: string, size: number): File {
  const f = new File([""], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("attachment upload rules (client mirror of migration 0011)", () => {
  it("accepts common project files under the size cap", () => {
    const ok = [
      ["site.jpg", "image/jpeg"],
      ["scan.png", "image/png"],
      ["report.pdf", "application/pdf"],
      ["boq.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["minutes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["legacy.doc", "application/msword"],
      ["data.csv", "text/csv"],
      ["readme.txt", "text/plain"],
      ["bundle.zip", "application/zip"],
    ] as const;
    for (const [name, type] of ok) {
      expect(() => assertUploadAllowed(fakeFile(name, type, 1024))).not.toThrow();
    }
  });

  it("rejects files over 10 MB", () => {
    expect(() => assertUploadAllowed(fakeFile("big.pdf", "application/pdf", MAX_ATTACHMENT_BYTES + 1))).toThrow(/10 MB/);
  });

  it("accepts a file exactly at the cap", () => {
    expect(() => assertUploadAllowed(fakeFile("edge.pdf", "application/pdf", MAX_ATTACHMENT_BYTES))).not.toThrow();
  });

  it("rejects executables and unknown types", () => {
    expect(() => assertUploadAllowed(fakeFile("virus.exe", "application/x-msdownload", 10))).toThrow(/not allowed/);
    expect(() => assertUploadAllowed(fakeFile("script.sh", "text/x-shellscript", 10))).toThrow(/not allowed/);
    expect(() => assertUploadAllowed(fakeFile("mystery.bin", "", 10))).toThrow(/not allowed/);
  });
});
