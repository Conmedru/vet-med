import { createAdmin } from "@/lib/auth";

async function main() {
  console.log("Creating default admin user...");
  try {
    await createAdmin("admin@neurology.today", "neurology");
    console.log("Admin user created successfully: admin@neurology.today / neurology");
  } catch (error) {
    console.error("Failed to create admin:", error);
  }
}

main();
