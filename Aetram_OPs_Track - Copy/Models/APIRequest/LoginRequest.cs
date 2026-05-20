using System.ComponentModel.DataAnnotations;

namespace Aetram_OpsTrack.Models.Request
{
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
}