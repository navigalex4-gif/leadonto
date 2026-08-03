"use strict";

const { spawn } = require("node:child_process");

function extract(options = {}) {
  const { file, cwd } = options;

  if (typeof file !== "string" || !file) {
    return Promise.reject(new TypeError("tar.extract requires a file path"));
  }
  if (typeof cwd !== "string" || !cwd) {
    return Promise.reject(new TypeError("tar.extract requires a cwd"));
  }

  return new Promise((resolve, reject) => {
    const child = spawn("tar", ["-xf", file, "-C", cwd], {
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `tar extraction failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
        ),
      );
    });
  });
}

module.exports = { extract };