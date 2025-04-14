# Trip Mapping Endpoint Documentation

## Overview

The backend provides an endpoint named `/tripmapping` designed to map trip IDs to their corresponding route IDs. It also returns associated route shape data.

---

## Endpoint: `/tripmapping`

### Request

- **Method:** `POST`
- **Payload:**

```json
{
  "trip_ids": ["trip_id_1", "trip_id_2", "..."]
}
```

### Response

- **Format:**

```json
{
  "route_id_1": {
    "trip_ids": ["trip_id_1", "trip_id_2"],
    "shape": [[[shape data]]]
  },
  ...
}
```

- **Mapping Structure:**
  - Each `route_id` is a key.
  - Each value contains:
    - `trip_ids`: An array of trip IDs belonging to that route.
    - `shape`: The shape (geometry/path) of that route, represented as a nested array.

---

## Backend Logic

- Uses **MongoDB collections**:
  - `Trip`: Contains `trip_id` and `route_id` mappings.
  - `Route`: Contains route shape data.
  
- **Caching Strategy:**
  - Uses [`node_cache`](https://www.npmjs.com/package/node-cache) to cache results.
  - Performance test for one trip ID: fresh: **114ms**, cached: **4ms**
  - Cache expiration: **24 hours**.

- **Subcache Mechanism:**
  - Two separate caches are used:
    - `tripToRouteCache`: Maps individual `trip_id` to a `route_id`.
    - `routeCache`: Stores the full mapping for each `route_id`, including `trip_ids` and shape data.
  - On setting a new trip mapping:
    - `routeCache` stores the complete mapping.
    - `tripToRouteCache` stores each `trip_id` with its corresponding `route_id`.

- **Cache Refresh Conditions:**
  - A cache miss for a `trip_id` triggers backend processing.
  - When new or expired `trip_id`s are seen:
    - The full mapping is re-fetched and both caches are updated.
  - The caches have a **1-hour check period** for cleanup and are TTL-bound for **24 hours**.

- **Clarified Behavior:**
  - Since each `trip_id` is individually cached via `tripToRouteCache`, **expiration is effectively handled per-trip**, not just per-route.
  - This addresses the previous uncertainty:
    - **Trip-to-route mappings are refreshed individually.**
    - Even a rarely accessed trip ID under a popular route will expire and be refreshed **independently**.

---

## Frontend Caching

- Mirrors the backend caching logic:
  - Caches the mapping for **24 hours**.
  - If all trip IDs are found in the **frontend cache**, no backend call is made.
  - If a **new trip ID** is encountered:
    - A call to the backend is triggered.
    - Backend response is usually fast if the trip ID was accessed by **any user** in the last 24 hours and still exists in backend cache.

---

## Notes

- **Potential Caveat (Resolved):**  
  It was previously unclear whether cache expiration occurred per `trip_id` or `route_id`.  
  The current design uses a **trip-to-route subcache**, which confirms that:
    - **Each `trip_id` expires independently**.
    - This ensures that even infrequently used trips are **eventually refreshed**, preventing stale mappings.

- This design promotes **performance optimization** by minimizing database hits and improving user response time.
