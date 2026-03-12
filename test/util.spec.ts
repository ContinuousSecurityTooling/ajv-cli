import assert from "assert"
import {getFiles, openFile, logJSON} from "../src/commands/util"

describe("util", function () {
  describe("getFiles", () => {
    it("should return a single filename as-is (no glob magic)", () => {
      const files = getFiles("test/schema.json")
      assert.deepStrictEqual(files, ["test/schema.json"])
    })

    it("should expand a glob pattern to matching files", () => {
      const files = getFiles("test/valid_data.js*")
      assert(files.length >= 2)
      assert(files.every((f) => /valid_data\.js/.test(f)))
    })

    it("should handle an array of plain filenames", () => {
      const files = getFiles(["test/schema.json", "test/valid_data.json"])
      assert.deepStrictEqual(files, ["test/schema.json", "test/valid_data.json"])
    })

    it("should handle an array mixing plain names and globs", () => {
      const files = getFiles(["test/schema.json", "test/valid_data.js*"])
      assert(files.length >= 3)
      assert.strictEqual(files[0], "test/schema.json")
    })

    it("should return an empty array for a no-match glob", () => {
      const files = getFiles("test/no_such_file_xyz_*.json")
      assert.deepStrictEqual(files, [])
    })
  })

  describe("openFile", () => {
    it("should parse a JSON file", () => {
      const data = openFile("test/valid_data.json", "data")
      assert(Array.isArray(data))
    })

    it("should parse a .yml YAML file", () => {
      const data = openFile("test/valid_data.yml", "data")
      assert(data !== null && typeof data === "object")
    })

    it("should parse a .yaml YAML file", () => {
      const data = openFile("test/valid_data.yaml", "data")
      assert(data !== null && typeof data === "object")
    })

    it("should parse a JSON5 file", () => {
      const data = openFile("test/valid_data.json5", "data")
      assert(data !== null && typeof data === "object")
    })

    it("should parse a JSONC file", () => {
      const data = openFile("test/valid_data.jsonc", "data")
      assert(data !== null && typeof data === "object")
    })

    it("should parse a JSON schema file", () => {
      const data = openFile("test/schema.json", "schema")
      assert(typeof data === "object" && data !== null)
      assert("type" in data || "$schema" in data || "properties" in data)
    })

    it("should load file content matching across all supported text formats", () => {
      const json = openFile("test/valid_data.json", "data")
      const yml = openFile("test/valid_data.yml", "data")
      const yaml = openFile("test/valid_data.yaml", "data")
      assert.deepStrictEqual(json, yml)
      assert.deepStrictEqual(json, yaml)
    })
  })

  describe("logJSON", () => {
    const errors = [{keyword: "required", message: "must have required property 'foo'"}]

    it('should pretty-print JSON for mode "json"', () => {
      const result = logJSON("json", errors)
      assert.strictEqual(result, JSON.stringify(errors, null, "  "))
    })

    it('should output compact JSON for mode "line"', () => {
      const result = logJSON("line", errors)
      assert.strictEqual(result, JSON.stringify(errors))
    })

    it('should return empty string for mode "no"', () => {
      const result = logJSON("no", errors)
      assert.strictEqual(result, "")
    })

    it('should return data unchanged for mode "text" without ajv', () => {
      const result = logJSON("text", errors)
      assert.strictEqual(result, errors)
    })

    it('should call ajv.errorsText for mode "text" with ajv instance', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ajv = require("ajv")
      const ajv = new Ajv()
      const result = logJSON("text", errors, ajv)
      assert(typeof result === "string")
      assert(result.includes("must have required property"))
    })

    it("should return data unchanged for an unrecognised mode", () => {
      const result = logJSON("fancy", errors)
      assert.strictEqual(result, errors)
    })
  })
})
