import { getGeoName } from "./geo.js";

/**
 * @description Shapes an operator's address and contact details.
 *
 * When an `operatorLinked` (an agency record) is provided, it extracts its specific address
 * fields (street, place, state, country, etc.) and formats them into a standardized object.
 * It deliberately does not fall back to the resource's direct-entry fields if the linked
 * operator is missing fields, since they represent distinct data sources.
 *
 * The tour and excursion detail transformers use this to consistently format agency/operator
 * information without conflating linked records with direct-entry text fields.
 * 
 * @param {Object} params - The address configuration parameters.
 * @returns {Object} The shaped operator address object.
 */
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
