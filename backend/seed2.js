import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { doctors } from "./assets/assets.js"; // Adjust the path if needed

// Provide a valid admin token; if you don't have one, you can temporarily bypass authAdmin.
const token = "YOUR_VALID_ADMIN_TOKEN"; // Replace with a valid token

const seedDoctorsViaAPI = async () => {
  for (let doctor of doctors) {
    try {
      const form = new FormData();

      // Append required fields (ensure they match what your controller expects)
      form.append("name", doctor.name);
      form.append(
        "email",
        doctor.email ||
          `${doctor.name.replace(/\s+/g, "").toLowerCase()}@example.com`
      );
      form.append("password", doctor.password || "defaultpassword123");
      form.append("speciality", doctor.speciality);
      form.append("degree", doctor.degree);
      form.append("experience", doctor.experience);
      form.append("about", doctor.about);
      form.append("fees", doctor.fees);
      form.append("address", JSON.stringify(doctor.address));

      // Since your multer middleware uses upload.single("image"), use "image" as key.
      const imagePath = path.join(process.cwd(), doctor.image);
      if (!fs.existsSync(imagePath)) {
        console.warn(`Image file not found for ${doctor.name}: ${imagePath}`);
        continue;
      }
      form.append("image", fs.createReadStream(imagePath));

      // Include headers; include Authorization if required by authAdmin
      const headers = {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`, // Remove this header if you're bypassing authAdmin
      };

      const response = await axios.post(
        "http://localhost:4000/api/admin/add-doctor",
        form,
        { headers, maxContentLength: Infinity, maxBodyLength: Infinity }
      );
      console.log(`✅ Doctor ${doctor.name} added:`, response.data);
    } catch (error) {
      console.error(
        `❌ Error adding doctor ${doctor.name}:`,
        error.response ? error.response.data : error.message
      );
    }
  }
};

seedDoctorsViaAPI();
