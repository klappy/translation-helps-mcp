# TSV Auto-Discovery Guide

## The Core Principle: No Mapping Needed

**TSV columns should pass through directly to JSON output without any transformation or mapping.**

## Why Mapping Exists (The Problem)

1. **Historical Interface Design**: The TypeScript interfaces were created with different field names than the TSV columns:

   ```typescript
   // Interface expects:
   interface TranslationNote {
     note: string; // But TSV has: Note
     quote?: string; // But TSV has: Quote
     supportReference?: string; // But TSV has: SupportReference
     // etc.
   }
   ```

2. **Manual Column Mapping**: Instead of using TSV headers, the code manually maps columns by position:

   ```javascript
   // WRONG - Manual mapping by position:
   const [ref, id, supportReference, quote, occurrence, note, occurrenceNote] =
     columns;

   // This assumes column order and renames fields!
   ```

3. **Invented Fields**: Fields like `markdown` were added that don't exist in the source TSV

## The Solution: Auto-Discovery

### 1. Use TSV Headers Directly

```javascript
// RIGHT - Auto-discovery from headers:
const parseTSV = (data) => {
  const lines = data.split("\n");
  const headers = lines[0].split("\t"); // Use actual column names!

  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || "";
    });
    return obj;
  });
};
```

### 2. No Field Renaming

- TSV column `Reference` → JSON field `Reference` (not `reference`)
- TSV column `SupportReference` → JSON field `SupportReference` (not `supportReference`)
- TSV column `Tags` → JSON field `Tags` (not mapped to something else)

### 3. No Extra Fields

- Only include fields that exist in the TSV
- No `markdown` field (doesn't exist in source)
- No `occurrences` field (if not in TSV)

## Why Tests Didn't Catch This

1. **Tests Used Mock Data**: Many tests created their own data instead of using real TSV
2. **Tests Assumed the Interface**: Tests were written to match the TypeScript interface, not the actual TSV structure
3. **No End-to-End Validation**: Tests didn't compare actual DCS TSV data to API output

## Regression Prevention Tests

### 1. TSV Structure Validation

```javascript
test("TSV columns must match JSON fields exactly", () => {
  const tsvHeaders = [
    "Reference",
    "ID",
    "Tags",
    "SupportReference",
    "Quote",
    "Occurrence",
    "Note",
  ];
  const jsonResponse = fetchTranslationNotes(/*...*/);

  // Every TSV column should exist in JSON
  tsvHeaders.forEach((header) => {
    expect(jsonResponse[0]).toHaveProperty(header);
  });

  // No extra fields in JSON
  expect(Object.keys(jsonResponse[0])).toEqual(tsvHeaders);
});
```

### 2. Real Data Validation

```javascript
test("API output matches actual DCS TSV data", async () => {
  // Fetch real TSV from DCS
  const tsvData = await fetch("https://git.door43.org/.../tn_TIT.tsv");
  const parsed = parseTSV(tsvData);

  // Fetch from API
  const apiResponse = await fetchTranslationNotes({
    /*...*/
  });

  // Should be identical structure
  expect(Object.keys(apiResponse[0])).toEqual(Object.keys(parsed[0]));
});
```

### 3. No Mapping Test

```javascript
test("No manual field mapping should occur", () => {
  const tsv = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tabc\trc://link\tGreek text\tEnglish quote\t1\tThe note`;

  const result = parseTSV(tsv);

  // Exact field preservation
  expect(result[0].Tags).toBe("rc://link"); // NOT renamed
  expect(result[0].SupportReference).toBe("Greek text"); // NOT moved
  expect(result[0]).not.toHaveProperty("markdown"); // NOT added
});
```

## Implementation Checklist

- [ ] Remove all manual column mapping code
- [ ] Use generic `parseTSV` for all TSV resources
- [ ] Update TypeScript interfaces to match TSV columns exactly
- [ ] Remove any fields not in the source TSV
- [ ] Add regression tests that validate against real DCS data
- [ ] Document that no mapping should ever be needed

## Benefits of Auto-Discovery

1. **Zero Maintenance**: New TSV columns automatically appear in API
2. **100% Accuracy**: No human errors in mapping
3. **Consistency**: All TSV resources handled the same way
4. **Transparency**: API output matches source exactly
5. **Future-Proof**: Changes to TSV structure automatically reflected

## The Golden Rule

**If you find yourself writing code to map TSV columns to different field names, STOP. The TSV structure IS the API structure.**
