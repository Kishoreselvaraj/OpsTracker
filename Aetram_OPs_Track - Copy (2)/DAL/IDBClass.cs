using Microsoft.Data.SqlClient;
using System.Data;

namespace Aetram_OpsTrack.DAL
{
    public interface IDBClass
    {
        Task<DataTable> ExecuteProcedureForDataTable(string procedureName, SqlParameter[] parameters = null);
        Task<List<T>> ExecuteProcedureForGenericList<T>(string procedureName, SqlParameter[] parameters = null);
        Task<int> ExecuteProcedureForInt(string procedureName, SqlParameter[] parameters = null);
        Task<string> ExecuteProcedureForString(string procedureName, SqlParameter[] parameters = null);
        Task<DataSet> ExecuteProcedureForDataSet(string procedureName, SqlParameter[] parameters = null);
        Task<T> ExecuteProcedureForObject<T>(string procedureName, SqlParameter[] parameters = null);
        Task<string> ExecuteJsonReturningProcedureAsync(string procedureName, SqlParameter[] parameters = null);
        Task<(List<T> Items, int TotalCount)> ExecutePaginatedProcedure<T>(string procedureName, int pageNumber = 1, int pageSize = 10, object additionalParams = null);
        public Task<int> ExecuteNonQuery(string procedureName, SqlParameter[] parameters = null);



    }
}
