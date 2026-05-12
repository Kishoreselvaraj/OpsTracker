using Aetram_OPs_Track.Models.Request;
using Aetram_OPs_Track.Models.Response;

namespace Aetram_OPs_Track.Services.Registration;

public interface IRegistrationService
{
    Task<AjaxAuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
}
