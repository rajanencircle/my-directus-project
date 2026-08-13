# Client reply draft — Primarix-structure API ticket (ClickUp)

Hi team,

Thanks for the ticket — we've gone through the current API extension, the live Directus schema, and the original Primarix data structure in detail to understand what it would take to provide data shaped like the old Primarix XML dump. Before we can give you a firm, reliable estimate, we'd like to clarify a few important points with you — getting these right up front will save rework later and help us size this accurately rather than guessing. 🙂

## Why we need a reference point first

The most important thing we need before estimating: **one example — either an API endpoint or a sample DB/XML dump — showing exactly how you'd like Directus data shaped to match the current Primarix dump.** Without a concrete target to compare against, any estimate we give is a rough guess rather than something we can stand behind.

Here's why this matters, explained simply:

- In Primarix, each hotel exists as **one row per language** (e.g. 7 rows for one hotel — German, English, Dutch, Belgian, Swiss, Austrian, South African variants), and *all* of that hotel's data (address, star rating, everything) is duplicated in every one of those 7 rows — not just the translatable text.
- In Directus, we changed this: **one hotel = one item.** Only fields that genuinely need translation (descriptions, price info, etc.) go through Directus's translation feature, so we don't repeat non-translatable data 7 times per hotel.
- This is exactly why, for example, in a Primarix-style count you might see "1,810 hotels" — because we mapped each unique hotel (Primarix calls this the `oid`) using its German-language (`D`) row as the base into a single Directus item, and the other 6 language rows became translations *of that one item* rather than 6 more separate hotels.
- Similarly, Primarix keeps a separate table per product that maps each field's ID to its name and label in each language. Directus doesn't need this — field names, interfaces, and multi-language labels are all built into Directus's own field settings directly.
- On top of that, some relationships changed shape between the two systems — for example how occupancy, categories, and other linked data are stored. Primarix often used simple ID columns; Directus uses proper relational structures (one-to-many, many-to-one, many-to-many links) for the same data. These aren't just renamed — they're structured differently, so reconstructing the old flat shape means unpacking these relations back out per product.

**So the real question for you is: how closely do you actually want the new API/dump to resemble the original Primarix structure?** Do you want it to look byte-for-byte the same (same field names, same one-row-per-language layout, same IDs), or is "close enough that our current consumer sites don't need major changes" good enough? These are two very different amounts of work, and we want to build the right one, not over- or under-build.

## A few more things we'd love your input on

- **Format:** Would you prefer a **nightly dump file** (generated automatically via a scheduled job, e.g. every night) or a **live API endpoint** you call on demand? Both are possible, but they're built differently.
- **Size, if it's a dump:** Please keep in mind a full dump covering all products/languages could realistically be **100–500 MB**, depending on how much data and how many products you want included. We'd want to agree on scope (which products, which languages, how far back) before generating this regularly.
- **Our recommendation:** Rather than shipping a large bulk dump to every consuming site, we'd suggest sites **consume our API directly** instead of pulling bulk data files. It's lighter, easier to keep in sync, and avoids the overhead of moving hundreds of MB around on a schedule — but we're happy to build whichever fits your setup best.
- **Which sites and which products** actually need this? Do all your consumer sites need every product type (hotels, cruises, tours, excursions, rental cars/campers), or just some? Note: **roundtrips and study trips don't exist as products in the new Directus system yet** — if any site needs those, that's a separate piece of work on top of this.
- **Languages per record:** Should the mirrored output include **all 3 languages together** in one record (closer to how Primarix worked), or is one language per response (like our current API) acceptable?
- **botg vs. karawane:** Is this just for botg, or do you also need this for karawane? They're on different structures with different products — please note.
- **The botg.de-on-Primarix-database idea:** If botg.de ends up being built directly on top of the Primarix database instead of importing a dump, that changes the picture for that one site specifically — but it wouldn't reduce the work needed for any other sites still relying on a Directus-based feed. We'd treat that as a separate, smaller conversation once we know if it's really the direction you want to go.

## Our current estimate

Based on our understanding so far, we estimate **around 3–4 days** for us to:
- Review your example dump/endpoint together with you,
- Confirm the exact target field-by-field shape,
- Firm up the answers to the questions above,
- And come back to you with an accurate, confident estimate for the actual build.

We didn't want to give you a "build it all" number without first confirming the target shape and scope — that number would carry too much guesswork and risk being wrong in either direction. Once we have your answers and a reference dump/endpoint to compare against, we'll turn this around quickly with a solid estimate.

Looking forward to your thoughts!

Best,
[Your name]
