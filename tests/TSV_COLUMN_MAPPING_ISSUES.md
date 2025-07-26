# TSV Column Mapping Issues Summary

## Overview
There is a significant mismatch between the actual TSV column structure from DCS and how the code is parsing these columns. This leads to incorrect data being extracted and fields being mapped to wrong values.

## Translation Notes (TN) Issues

### Actual TSV Structure
```
Reference | ID | Tags | SupportReference | Quote | Occurrence | Note
```

### Current Code Mapping (INCORRECT)
```javascript
const [ref, id, supportReference, quote, occurrence, note, occurrenceNote] = columns;
```

### Problems:
1. **Tags column is skipped** - The code expects `supportReference` in position 3, but it's actually `Tags`
2. **Wrong column mapping** - Every column after position 2 is shifted:
   - Code expects `supportReference` at index 2, but actual is `Tags`
   - Code expects `quote` at index 3, but actual is `SupportReference`
   - Code expects `occurrence` at index 4, but actual is `Quote`
   - Code expects `note` at index 5, but actual is `Occurrence`
   - Code expects `occurrenceNote` at index 6, but actual is `Note`

### Correct Mapping Should Be:
```javascript
const [reference, id, tags, supportReference, quote, occurrence, note] = columns;
```

## Translation Questions (TQ) Issues

### Actual TSV Structure
```
Reference | ID | Tags | Quote | Occurrence | Question | Response
```

### Current Code Mapping (PARTIALLY CORRECT)
```javascript
const [ref, , , , , question, response] = cols;
```

### Status:
- ✅ The code correctly skips to columns 5 and 6 for Question and Response
- ⚠️ However, it loses access to ID, Tags, Quote, and Occurrence fields

## Translation Word Links (TWL) Issues

### Actual TSV Structure
```
Reference | ID | Tags | OrigWords | Occurrence | TWLink
```

### Current Code Mapping
The code in ResourceAggregator appears to be parsing TWL data but needs verification for correct column mapping.

## Required Fixes

### 1. Translation Notes Service
File: `/workspace/src/functions/translation-notes-service.ts`
Line ~257: Fix the destructuring to match actual column order

### 2. ResourceAggregator Service
File: `/workspace/src/services/ResourceAggregator.ts`
- Line ~937: Fix parseTNFromTSV column mapping
- Line ~1024: Verify parseTQFromTSV (seems correct but loses data)
- Line ~1067: Verify parseTWFromTSV column mapping
- Line ~1107: Verify parseTWLFromTSV column mapping

### 3. Generic TSV Parser
The generic `parseTSV` function in RouteGenerator.ts correctly preserves all columns, but the service-specific parsers are not using it and have hardcoded incorrect column positions.

## Impact
- Fields are being read from wrong columns
- Data is being lost or misattributed
- API responses don't match the source data structure
- Unable to access all TSV fields in the JSON response

## Recommendation
1. Use the generic `parseTSV` function that preserves all columns
2. Or fix the column indices in each service-specific parser
3. Add comprehensive tests to verify column mapping
4. Ensure all TSV fields are accessible in the JSON response, even if empty