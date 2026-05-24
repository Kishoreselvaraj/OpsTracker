using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;

namespace Aetram_OpsTrack.DBO.Repository
{
    public interface ILoginRepository
    {
        Task<LoginResponse> LoginAsync(LoginRequest request); 
    }
}