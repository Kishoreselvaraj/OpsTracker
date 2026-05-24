using System.ComponentModel.DataAnnotations;

namespace OpsTracker_v1.Models.Request
{
    public class LoginViewModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; }

        
    }
}