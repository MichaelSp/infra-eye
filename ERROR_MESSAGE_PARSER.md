# Kubernetes Error Message Parser

## Overview
Created a sophisticated parser for long, complex Kubernetes status condition messages, especially those with embedded JSON errors from Helm upgrade failures.

## Files Created

### 1. `parseErrorMessage.ts`
A utility module that parses Kubernetes error messages with the following capabilities:

**Key Functions:**
- `parseErrorMessage(message)` - Main parser that extracts structured error information
  - Detects embedded JSON patches in error messages
  - Extracts the actual validation error
  - Returns a `ParsedError` object with:
    - `summary`: Human-readable error description
    - `embeddedJson`: Extracted JSON if present
    - `actualError`: Key validation error extracted from JSON
    - `isComplex`: Boolean indicating if message needs special handling

- `getSummaryMessage(message, maxLength)` - Generates short summary suitable for table display

- `formatJson(jsonString)` - Pretty-prints JSON for readability

- `truncateJson(jsonString, maxLength)` - Truncates JSON while maintaining structure

**Supported Error Patterns:**
- Helm upgrade failures with nested JSON patches
- Kubernetes JSON validation errors
- Go struct unmarshaling errors
- General validation errors

### 2. `ConditionMessage.svelte`
A Svelte component that renders parsed error messages with:

**Features:**
- Clean display of complex error messages
- Expandable/collapsible JSON details view
- Error highlighting in red box showing the actual validation issue
- Truncated JSON preview for quick scanning
- Full formatted JSON in expandable section
- Graceful fallback for simple messages

**UI Elements:**
- Red error box highlighting the key validation error
- "Show/Hide Request Details" toggle
- Syntax-highlighted code blocks
- Responsive scrolling for large JSON

### 3. Test Files
- `parseErrorMessage.test.ts` - Unit tests for parsing logic
- `ConditionMessage.test.ts` - Component tests for rendering

## Integration

The `ConditionMessage` component is now used in `FluxDetailsModal.svelte` to display condition messages:

**Before:**
```svelte
{#if condition.message}
  <div class=" mb-1">{condition.message}</div>
{/if}
```

**After:**
```svelte
{#if condition.message}
  <div class=" mb-1">
    <ConditionMessage message={condition.message} />
  </div>
{/if}
```

## Example

### Input:
```
Helm upgrade failed for release paperless/open-webui with chart open-webui@12.13.0: 
cannot patch "open-webui" with kind StatefulSet:  "" is invalid: patch: Invalid value: 
"{"apiVersion":"apps/v1",...}" : json: cannot unmarshal bool into Go struct field 
EnvVar.spec.template.spec.containers.env.value of type string
```

### Output Display:
1. **Summary**: "Helm upgrade failed for release paperless/open-webui..."
2. **Error Box**: "❌ json: cannot unmarshal bool into Go struct field EnvVar.spec.template.spec.containers.env.value of type string"
3. **Expandable Details**: Full formatted JSON of the attempted patch

## Testing

Run tests with:
```bash
npm run test:ai
```

Or specific test file:
```bash
npm run test:ai -- parseErrorMessage.test.ts
```

## Future Improvements

1. Add more error pattern detection for different APIs
2. Link JSON errors to documentation
3. Suggest fixes for common errors
4. Add JSON diff view for patch errors
5. Support for kubectl error messages
6. Integration with Kubernetes error documentation
