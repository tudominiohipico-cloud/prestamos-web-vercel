import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("[cloudinary] Faltan variables de entorno CLOUDINARY_*");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// Sube un buffer a Cloudinary y devuelve la URL segura
export async function uploadBuffer(buffer: Buffer, folder = "comprobantes"): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: "image", unique_filename: true, overwrite: false },
        (err, result) => {
          if (err) return reject(err);
          if (!result || !result.secure_url) return reject(new Error("Cloudinary: sin URL"));
          resolve(result.secure_url);
        }
      )
      .end(buffer);
  });
}
