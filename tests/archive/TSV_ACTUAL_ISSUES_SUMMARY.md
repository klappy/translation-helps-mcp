# TSV Implementation Issues - User Feedback Summary

## Translation Notes Issues

### 1. Extra `markdown` field

- **Issue**: The JSON response includes a `markdown` field that duplicates the `note` field
- **Problem**: This field doesn't exist in the source TSV data
- **Current**: Both `note` and `markdown` contain the same content
- **Should be**: Only `note` field should exist

### 2. Wrong Column Mapping

The code is reading from wrong column positions:

| What it should be               | What it actually is          |
| ------------------------------- | ---------------------------- |
| `tags` = RC link (rc://...)     | `supportReference` = RC link |
| `supportReference` = Greek text | `quote` = Greek text         |
| `quote` = English quote         | Missing!                     |
| `note` = Note content           | `note` = Note content ✓      |

### 3. Code expects 8 columns but TSV has 7

```javascript
// Current (WRONG - expects 8 values):
const [ref, id, supportReference, quote, occurrence, note, occurrenceNote] =
  columns;

// Should be (7 values matching TSV):
const [ref, id, tags, supportReference, quote, occurrence, note] = columns;
```

## Translation Questions

- Appears to be working correctly at first glance
- Fields are mapped properly to Question and Response columns

## Translation Word Links Issues

- **Major Issue**: No data is returned even though data exists on DCS
- Confirmed via curl that Titus has multiple word links per verse
- The API should return this data but currently returns empty

## Root Cause

As the user correctly identified: **"These inconsistencies wouldn't show up if the extraction was automated."**

## Solution: Automated Extraction

Using the generic `parseTSV` function would:

1. Preserve exact column structure from TSV headers
2. Eliminate manual mapping errors
3. Include all data that exists on DCS
4. Remove duplicate/invented fields
5. Maintain consistency across all TSV types

## Example of Automated Approach

```javascript
// Generic parsing preserves everything correctly
const parsed = parseTSV(tsvData);
// Returns objects with exact column names from headers
// No manual mapping, no missing fields, no duplicates
```
