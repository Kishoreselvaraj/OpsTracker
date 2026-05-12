using System.ComponentModel.DataAnnotations;

namespace Aetram_OPs_Track.Models.Request;

public class LoginRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [StringLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [DataType(DataType.Password)]
    [StringLength(200, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;
}
