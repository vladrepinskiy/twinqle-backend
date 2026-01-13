import { readdir } from "fs/promises";
import { join } from "path";
import { db } from "../../config/database";

const runSeeds = async () => {
  try {
    const seedsDir = join(__dirname);
    const files = await readdir(seedsDir);
    const seedFiles = files
      .filter((file) => file.endsWith(".ts") && file !== "runner.ts")
      .sort();

    for (const file of seedFiles) {
      console.log(`Running seed: ${file}`);
      const seed = await import(join(seedsDir, file));

      if (typeof seed.seed === "function") {
        await seed.seed(db);
        console.log(`✓ Seed ${file} completed`);
      } else {
        console.error(`Seed ${file} does not export a 'seed' function`);
      }
    }

    console.log("All seeds completed successfully");
  } catch (error) {
    console.error("Seed error:", error);
    throw error;
  } finally {
    await db.destroy();
  }
};

runSeeds();
