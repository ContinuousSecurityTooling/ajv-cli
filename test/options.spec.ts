import assert from "assert"
import {checkOptions, getOptions} from "../src/commands/options"

// checkOptions mutates the schema it receives, so each test must use a fresh object.
function schema(extra: object = {}): any {
  return {type: "object", properties: {}, ...extra}
}

describe("options", function () {
  describe("checkOptions", () => {
    it("should return null when all required params are present", () => {
      const result = checkOptions(
        schema({properties: {s: {type: "string"}}, required: ["s"]}),
        {_: [], s: "test/schema.json"}
      )
      assert.strictEqual(result, null)
    })

    it("should return an error string for a missing required param", () => {
      const result = checkOptions(
        schema({properties: {s: {type: "string"}}, required: ["s"]}),
        {_: []}
      )
      assert(result !== null)
      assert(result.includes("required"))
      assert(result.includes("-s"))
    })

    it("should prefix single-char params with single dash", () => {
      const result = checkOptions(
        schema({properties: {s: {type: "string"}}, required: ["s"]}),
        {_: []}
      )
      assert(result !== null)
      assert(result.includes("-s"))
      assert(!result.includes("--s"))
    })

    it("should prefix multi-char params with double dash", () => {
      const result = checkOptions(
        schema({properties: {schema: {type: "string"}}, required: ["schema"]}),
        {_: []}
      )
      assert(result !== null)
      assert(result.includes("--schema"))
    })

    it("should return an error for an unknown parameter", () => {
      const result = checkOptions(schema(), {_: [], unknownParam: "value"})
      assert(result !== null)
      assert(result.includes("unknown"))
      assert(result.includes("--unknownParam"))
    })

    it("should return an error when too many positional arguments are given", () => {
      const result = checkOptions(schema(), {_: ["arg1", "arg2"]})
      assert(result !== null)
      assert(result.includes("too many arguments"))
    })

    it("should return null for exactly one positional argument", () => {
      const result = checkOptions(schema(), {_: ["one"]})
      assert.strictEqual(result, null)
    })

    it("should accept known ajv options when ajvOptions key is present in schema", () => {
      const result = checkOptions(schema({ajvOptions: true}), {_: [], "all-errors": true})
      assert.strictEqual(result, null)
    })

    it("should reject unknown options even with ajvOptions in schema", () => {
      const result = checkOptions(schema({ajvOptions: true}), {_: [], "not-an-option": true})
      assert(result !== null)
      assert(result.includes("unknown"))
    })
  })

  describe("getOptions", () => {
    it("should return an empty code object when argv has no ajv options", () => {
      const opts = getOptions({_: []})
      assert.deepStrictEqual(opts.code, {})
    })

    it("should not include undefined options in the result", () => {
      const opts = getOptions({_: []})
      assert(!("allErrors" in opts))
      assert(!("strict" in opts))
    })

    it("should extract allErrors from camelCase argv key", () => {
      const opts = getOptions({_: [], allErrors: true})
      assert.strictEqual(opts.allErrors, true)
    })

    it("should extract allErrors from dash-case argv key (--all-errors)", () => {
      const opts = getOptions({_: [], "all-errors": true})
      assert.strictEqual(opts.allErrors, true)
    })

    it("should map the data option to $data", () => {
      const opts = getOptions({_: [], data: true})
      assert.strictEqual(opts.$data, true)
    })

    it("should put code-es5 into the code sub-object", () => {
      const opts = getOptions({_: [], "code-es5": true})
      assert.strictEqual(opts.code.es5, true)
    })

    it("should put code-optimize into the code sub-object", () => {
      const opts = getOptions({_: [], "code-optimize": 2})
      assert.strictEqual(opts.code.optimize, 2)
    })

    it("should put code-lines into the code sub-object", () => {
      const opts = getOptions({_: [], "code-lines": true})
      assert.strictEqual(opts.code.lines, true)
    })

    it("should handle strict option (boolean)", () => {
      const opts = getOptions({_: [], strict: true})
      assert.strictEqual(opts.strict, true)
    })

    it("should handle strict option (string value)", () => {
      const opts = getOptions({_: [], strict: "log"})
      assert.strictEqual(opts.strict, "log")
    })

    it("should handle multiple options at once", () => {
      const opts = getOptions({_: [], allErrors: true, "code-es5": true, data: true})
      assert.strictEqual(opts.allErrors, true)
      assert.strictEqual(opts.$data, true)
      assert.strictEqual(opts.code.es5, true)
    })
  })
})
