/**
 * Script to delete all non-system collections from a Directus instance.
 * Requirements: Node.js, fetch (Node 18+)
 * 
 * Usage: 
 *   node delete-collections.js         # Run once
 *   node delete-collections.js --loop  # Run until all are deleted
 */

const DIRECTUS_URL = "http://localhost:8055"; 
const STATIC_TOKEN = "2cpd1MiSahgbSQqyu_pUfz0MK8BJOjqV"; 

async function deleteCollections() {
  const isLoopMode = process.argv.some(arg => arg === '--loop' || arg === '-l');
  let attempt = 1;
  let totalDeletedOverall = 0;

  try {
    while (true) {
      if (isLoopMode) console.log(`\n--- Deletion Attempt #${attempt} ---`);

      // 1. Fetch all collections
      const response = await fetch(`${DIRECTUS_URL}/collections`, {
        headers: { Authorization: `Bearer ${STATIC_TOKEN}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch collections: ${response.statusText}`);
      }

      const { data: collections } = await response.json();

      // 2. Filter non-system collections
      const nonSystemCollections = collections
        .map((c) => c.collection)
        .filter((name) => !name.startsWith("directus_"));

      if (nonSystemCollections.length === 0) {
        console.log("✅ All non-system collections have been deleted.");
        break;
      }

      console.log(`Found ${nonSystemCollections.length} collections remaining.`);
      
      let successfulDeletionsInThisPass = 0;

      // 3. Delete collections one by one
      for (const collectionName of nonSystemCollections) {
        process.stdout.write(`Deleting ${collectionName}... `);
        
        const deleteRes = await fetch(`${DIRECTUS_URL}/collections/${collectionName}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${STATIC_TOKEN}` },
        });

        if (deleteRes.status === 204) {
          console.log("✅");
          successfulDeletionsInThisPass++;
          totalDeletedOverall++;
        } else {
          const error = await deleteRes.json().catch(() => ({}));
          console.log(`❌ (${error.errors?.[0]?.message || deleteRes.statusText})`);
        }
      }

      // Break if not in loop mode
      if (!isLoopMode) {
        console.log("\nFinished single pass. Use --loop to retry automatically.");
        break;
      }

      // Safety break: If we are in loop mode but couldn't delete anything in a full pass, 
      // we stop to avoid an infinite loop (likely a hard dependency issue).
      if (successfulDeletionsInThisPass === 0 && nonSystemCollections.length > 0) {
        console.log("\n⚠️ Progress stalled: No collections could be deleted in this pass despite remaining items.");
        console.log("This usually indicates a database-level constraint that needs manual intervention.");
        break;
      }

      attempt++;
      // Small delay between passes to let the database breathe
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\nSummary: Processed ${totalDeletedOverall} total deletions.`);
  } catch (error) {
    console.error("\nFATAL ERROR:", error.message);
  }
}

deleteCollections();
