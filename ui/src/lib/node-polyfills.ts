import { Buffer } from "buffer";
import process from "process";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
if (typeof globalThis.process === "undefined") {
  globalThis.process = process;
}
if (typeof globalThis.global === "undefined") {
  globalThis.global = globalThis;
}
