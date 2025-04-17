import doctorModel from "./models/doctorModel.js"; // Import the Mongoose model
import { doctors } from "./assets/assets.js"; // Import the doctors array

export const seedDoctors = async () => {
  try {
    console.log("🔄 Seeding doctors data...");

    await doctorModel.deleteMany(); // Clear existing data (optional)
    await doctorModel.insertMany(doctors); // Insert new data

    console.log("✅ Doctors data inserted successfully!");
  } catch (error) {
    console.error("❌ Error seeding doctors data:", error);
  }
};
