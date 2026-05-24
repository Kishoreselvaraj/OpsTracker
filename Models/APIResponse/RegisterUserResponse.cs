namespace Aetram_OpsTrack.Models.Response
{
    public class RegisterUserResponse
    {
        public int StatusCode { get; set; }

        public string Message { get; set; }

        public int LastInsertedID { get; set; }
    }
}