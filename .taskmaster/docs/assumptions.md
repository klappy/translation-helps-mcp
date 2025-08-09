# Assumptions Log (vnext-architecture)

- Validation will start in soft mode (warn on mismatch) to avoid breaking existing endpoints; enforcement will be enabled after schemas stabilize.
- Scripture responses will transition to array-only shape; during transition, validators accept both single `data.text` and `data.resources[]`.
- Error envelope will be added incrementally to endpoints; existing error shapes may persist temporarily.
- Logging sweep begins with critical services; full sweep will follow after tests are green.
- Cache timing will be improved in ZIP fetcher first; broader unification will follow.
