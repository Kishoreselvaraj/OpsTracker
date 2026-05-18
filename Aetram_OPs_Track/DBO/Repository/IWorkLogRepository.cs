using Aetram_OpsTrack.Models.Request;
using Aetram_OpsTrack.Models.Response;
using Aetram_OpsTrack.Models.Response.Aetram_OpsTrack.Models.Response;

namespace Aetram_OpsTrack.DBO.Repository
{
    public interface IWorkLogRepository
    {
        public Task<SaveWorkLogResponse> SaveWorkLogAsync(
            SaveWorkLogRequest request,
            int userId);

        Task<List<MonthlyCalendarResponse>>
    GetMonthlyCalendarAsync(
        int userId,
        int month,
        int year);
        public Task<List<GetWorkLogResponse>> GetWorkLogsByDateAsync(int userId, DateTime workDate);



        public  Task<WorkLogUpdateResponse> UpdateWorkLogAsync(
            UpdateWorkLogRequest request,
            int userId);

        public  Task<GetWorkLogResponse> GetWorkLogByIdAsync(
int workLogId,
int userId);

    }

}