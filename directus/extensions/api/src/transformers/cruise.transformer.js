// TODO: Implement cruise transformer once the cruise schema is finalised.
// Currently a pass-through scaffold that attaches the required `type` discriminator.
export function shapeCruise(cruise) {
  return {
    type: 'cruise',
    id: cruise.id,
    ...cruise,
  };
}
