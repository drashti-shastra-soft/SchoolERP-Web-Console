using Microsoft.Extensions.Hosting.Internal;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;

namespace SchoolERPWebClient.Helpers
{
    public class StaticMethods
    {
        //public static string SaveBase64Image(string base64String, string relativeFolder, string uniqueFileName)
        //{
        //    if (string.IsNullOrWhiteSpace(base64String) || string.IsNullOrWhiteSpace(relativeFolder))
        //        throw new ArgumentException("Invalid input parameters.");

        //    // Strip metadata if present
        //    string base64Data = Regex.Replace(base64String, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);

        //    // Convert to byte array
        //    byte[] imageBytes = Convert.FromBase64String(base64Data);

        //    // Resolve physical path
        //    string physicalFolderPath = HostingEnvironment.MapPath(relativeFolder);
        //    if (!Directory.Exists(physicalFolderPath))
        //        Directory.CreateDirectory(physicalFolderPath);

        //    // Build full file path
        //    string fullFilePath = Path.Combine(physicalFolderPath, uniqueFileName);

        //    // Save to disk
        //    File.WriteAllBytes(fullFilePath, imageBytes);

        //    // Return relative path for DB or client use
        //    return Path.Combine(relativeFolder.TrimStart('~', '/'), uniqueFileName).Replace("\\", "/");
        //}

        public static string ResolveCompanyImageBase64(string fileName, string imageType)
        {
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var noImagePath = Path.Combine(wwwrootPath, "uploads", "Image", "No-Image-Found.png");

            if (string.IsNullOrEmpty(fileName))
                return StaticMethods.GetImageBase64(noImagePath);

            var imagePath = Path.Combine(wwwrootPath, "Uploads", "Company", imageType, fileName);
            return File.Exists(imagePath) ? StaticMethods.GetImageBase64(imagePath) : StaticMethods.GetImageBase64(noImagePath);
        }

        
        public static string ToDataUri(string base64, string fileName)
        {
            if (string.IsNullOrEmpty(base64))
                return null;

            var ext = Path.GetExtension(fileName)?.ToLowerInvariant();
            var mime = ext switch
            {
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                _ => "application/octet-stream"
            };

            return $"data:{mime};base64,{base64}";
        }


        public static string GetImageBase64(string imagePath)
        {
            if (!File.Exists(imagePath))
                return null;

            byte[] bytes = File.ReadAllBytes(imagePath);
            return Convert.ToBase64String(bytes);
        }


        public static string ResolveVehicleImageBase64(string fileName)
        {
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var noImagePath = Path.Combine(wwwrootPath, "uploads", "Image", "No-Image-Found.png");

            if (string.IsNullOrEmpty(fileName))
                return StaticMethods.GetImageBase64(noImagePath);

            var imagePath = Path.Combine(wwwrootPath, "Uploads", "Vehicle", fileName);
            return File.Exists(imagePath) ? StaticMethods.GetImageBase64(imagePath) : StaticMethods.GetImageBase64(noImagePath);
        }
    }
}
