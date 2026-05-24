
using Microsoft.AspNetCore.Http;

namespace Aetram_OpsTrack.DBO.Repository
{

    public interface ILogs
    {
        Task LogUserActivityAsync(
            HttpContext context,
            int userId,
            string activity);

        Task LogAuditAsync(
            string tableName,
            int recordId,
            string actionType,
            string oldData,
            string newData,
            int actionBy,
            string ipAddress);

        Task LogExceptionAsync(
            Exception ex,
            HttpContext context,
            int? userId = null);
    }
}
