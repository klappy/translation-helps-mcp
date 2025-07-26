# TSV Pass-through Recommendations

## The Fundamental Principle: No Mapping Needed

**TSV columns should pass through directly to JSON output. If you're writing mapping code, you're doing it wrong.**

## Executive Summary

Currently, there is a **significant mismatch** between TSV data fields from DCS and the JSON responses returned by the API. The tests have identified:

1. **Wrong column mapping** - Fields are being read from incorrect column positions
2. **Lost fields** - Only 3 out of 7 TSV fields make it to the JSON response for Translation Notes
3. **Renamed fields** - Some fields are renamed without documentation (e.g., "Response" → "answer")
4. **Missing data** - Important fields like ID, Tags, and SupportReference are completely missing

## Test Results Summary

### Translation Notes (TN)
- **TSV Columns**: 7 (Reference, ID, Tags, SupportReference, Quote, Occurrence, Note)
- **JSON Fields**: 3 (reference, note, quote)
- **Lost Fields**: ID, Tags, SupportReference, Occurrence
- **Wrong Mappings**: 
  - `note` contains value from `Occurrence` column
  - `quote` contains value from `SupportReference` column

### Translation Questions (TQ)
- **TSV Columns**: 7 (Reference, ID, Tags, Quote, Occurrence, Question, Response)
- **JSON Fields**: 3 (reference, question, answer)
- **Lost Fields**: ID, Tags, Quote, Occurrence
- **Renamed Fields**: Response → answer

### Translation Word Links (TWL)
- **TSV Columns**: 6 (Reference, ID, Tags, OrigWords, Occurrence, TWLink)
- **JSON Fields**: Needs verification
- **Unicode Handling**: ✅ Greek/Hebrew text preserved correctly

## Immediate Fixes Required

### 1. Fix Column Mapping in translation-notes-service.ts

**Current (WRONG):**
```javascript
const [ref, id, supportReference, quote, occurrence, note, occurrenceNote] = columns;
```

**Should be:**
```javascript
const [ref, id, tags, supportReference, quote, occurrence, note] = columns;
```

### 2. Fix Column Mapping in ResourceAggregator.ts

Similar fixes needed in:
- `parseTNFromTSV()` - Line ~937
- `parseTWFromTSV()` - Line ~1067  
- `parseTWLFromTSV()` - Line ~1107

### 3. Include ALL TSV Fields in JSON Response

Update the response objects to include all fields:

```javascript
// Translation Notes
{
  reference: string,
  id: string,
  tags: string,
  supportReference: string,
  quote: string,
  occurrence: string,
  note: string
}

// Translation Questions
{
  reference: string,
  id: string,
  tags: string,
  quote: string,
  occurrence: string,
  question: string,
  response: string  // or keep as 'answer' but document it
}
```

## Why Tests Didn't Catch This

1. **Tests were written to match the interface, not the source data** - Tests checked if the API returned fields like `note`, `quote`, etc. but didn't verify these matched the TSV
2. **Mock data instead of real TSV** - Tests used fabricated data that matched the expected interface
3. **No end-to-end validation** - Tests didn't fetch real TSV from DCS and compare to API output

## Long-term Recommendations

### 1. Use Generic TSV Parser
The `parseTSV()` function in RouteGenerator.ts correctly preserves all columns. Consider using it instead of custom parsing in each service.

### 2. Add Field Mapping Documentation
Document exactly how TSV columns map to JSON fields, including any renaming.

### 3. Add Integration Tests
Run the provided tests regularly to ensure 100% field pass-through:
- `tests/tsv-passthrough.test.ts`
- `tests/tsv-field-validation.test.ts`
- `tests/tsv-integration.test.ts`
- `tests/tsv-passthrough-summary.test.ts`

### 4. Version the API
If field names must change (e.g., Response → answer), version the API to maintain backward compatibility.

## Benefits of Fixing These Issues

1. **Data Integrity** - All source data will be available to API consumers
2. **Flexibility** - Clients can use fields like Tags and ID for filtering/sorting
3. **Transparency** - Clear mapping between source TSV and API responses
4. **Future-proofing** - If DCS adds new columns, they'll automatically be included

## Testing

Run all TSV tests to verify fixes:
```bash
npm test tests/tsv-*.test.ts
```

Expected result: All tests should pass with 100% field preservation.