import { hotelsProduct } from "./hotels.js";
import { cruisesProduct } from "./cruises.js";
import { campersProduct } from "./campers.js";

const productRegistry = {
  hotels: hotelsProduct,
  cruises: cruisesProduct,
  campers: campersProduct,
};

export function getProduct(productName) {
  const product = productRegistry[productName];
  if (!product) {
    const available = Object.keys(productRegistry).join(", ");
    throw new Error(
      `Unknown product: "${productName}". Available: ${available}`,
    );
  }
  return product;
}

export function listProducts() {
  return Object.keys(productRegistry);
}
