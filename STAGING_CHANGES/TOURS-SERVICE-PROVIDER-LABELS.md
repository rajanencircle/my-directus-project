# Tours Service Provider Labels — Staging Changes

**Date:** 2026-07-20
**Collection:** `tours`
**Source of truth:** Hotels `id_tour_user` / `haupt_id_tour_user` translations & notes

## Changes Made to Staging

### 1. `service_provider_id_tour32`

| Property | Before | After |
|----------|--------|-------|
| `translations` | `[{en-GB:"Service Provider (Tour32 only)"}]` | `[{en-GB:"Service Provider (Tour32 only)"},{de-DE:"Leistungsträger (Tour32 only)"},{nl-NL:"Dienstverlener (Tour32 only)"}]` |
| `note` | `null` | `$t:hotels_id_tour_user_note` |

### 2. `main_service_provider_id_tour32`

| Property | Before | After |
|----------|--------|-------|
| `translations` | `null` | `[{en-GB:"Main Service Provider (Tour32 only)"},{de-DE:"Haupt-Leistungsträger (Tour32 only)"},{nl-NL:"Hoofddienstverlener (Tour32 only)"}]` |
| `note` | `null` | `$t:hotels_haupt_id_tour_user_note` |

## Revert Instructions

```bash
# Revert service_provider_id_tour32
curl -s -X PATCH "https://staging.content.botg.cloud/fields/tours/service_provider_id_tour32" \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"meta": {"translations": [{"language": "en-GB", "translation": "Service Provider (Tour32 only)"}], "note": null}}'

# Revert main_service_provider_id_tour32
curl -s -X PATCH "https://staging.content.botg.cloud/fields/tours/main_service_provider_id_tour32" \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"meta": {"translations": null, "note": null}}'
```
