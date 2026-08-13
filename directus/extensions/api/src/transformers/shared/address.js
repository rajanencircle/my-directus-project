import { getGeoName } from "./geo.js";

// Shared by tour and excursion detail transformers: when operator_linked (an
// agencies record) is set, its own address/contact fields are the operator's
// real data. No fallback to the resource's own street/phone/etc. columns —
// those are a separate, unrelated direct-entry set and must not be silently
// substituted in.
export function shapeOperatorAddress({
  operatorLinked,
  operatorDirect,
  nameOperator,
  lang,
}) {
  const operator = operatorLinked ?? null;
  const place = operator?.place ?? null;
  const state = operator?.state ?? null;
  const country = operator?.country ?? null;
  const locationTour32 = operator?.location_tour32 ?? null;
  return {
    operator_direct: operatorDirect ?? null,
    operator_linked: operator
      ? { id: operator.id, name: operator.name_agency ?? null }
      : null,
    name_operator: nameOperator ?? null,
    street: operator?.street ?? null,
    street_number: operator?.street_number ?? null,
    postcode: operator?.postcode ?? null,
    place: place
      ? { id: place.id, name: getGeoName(place, lang) ?? null, code: null }
      : null,
    state: state
      ? {
          id: state.id,
          name: getGeoName(state, lang) ?? null,
          code: state.ISO ?? null,
        }
      : null,
    country: country
      ? {
          id: country.id,
          name: getGeoName(country, lang) ?? null,
          code: country.ISO ?? null,
        }
      : null,
    location_tour32: locationTour32
      ? { id: locationTour32.id, name: getGeoName(locationTour32, lang) }
      : null,
    phone_general: operator?.phone_general ?? null,
    phone_after_hours: operator?.phone_after_hours ?? null,
    email_general: operator?.email_general ?? null,
    website: operator?.website ?? null,
  };
}
