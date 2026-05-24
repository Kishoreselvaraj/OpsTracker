using System.ComponentModel.DataAnnotations;

namespace Aetram_OpsTrack.Models.Request
{
    public class RegisterUserRequest
    {
        [Required]
        public string FirstName { get; set; }

        public string LastName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }

        public string MobileNo { get; set; }

        public string Role { get; set; } = "MEMBER";

        public string Designation { get; set; }

        public int? CreatedBy { get; set; }
    }
}