namespace Aetram_OpsTrack.Models.Response
{
    public class LoginResponse
    {
        public int StatusCode { get; set; }

        public string Message { get; set; }

        public int UserId { get; set; }

        public string EmployeeCode { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public string Email { get; set; }

        public string MobileNo { get; set; }

        public string Role { get; set; }

        public string Designation { get; set; }

        public bool IsActive { get; set; }

        public string Token { get; set; }
    }
}