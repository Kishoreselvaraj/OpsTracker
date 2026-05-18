using Aetram_OpsTrack.DAL;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using System.Data;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

namespace Aetram_OpsTrack.DAL
{
    public class DBClass : IDBClass
    {

        private readonly string _connectionString;

        public DBClass(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(_connectionString))
                throw new InvalidOperationException("DefaultConnection is missing in appsettings.json");
        }
        public async Task<int> ExecuteNonQuery(string procedureName, SqlParameter[] parameters = null)
        {
            using (var con = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand(procedureName, con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;

                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                await con.OpenAsync();
                return await cmd.ExecuteNonQueryAsync();
            }
        }

        //Execute Stored Procedure and return DataTable
        public async Task<DataTable> ExecuteProcedureForDataTable(string procedureName, SqlParameter[] parameters = null)
        {
            var dt = new DataTable();

            using (var con = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand(procedureName, con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;
                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                await con.OpenAsync();
                using var reader = await cmd.ExecuteReaderAsync();
                dt.Load(reader);
            }
            return dt;
        }

        //Execute Procedure and Return List<T>
        public async Task<List<T>> ExecuteProcedureForGenericList<T>(string procedureName, SqlParameter[] parameters = null)
        {
            using var con = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(procedureName, con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.CommandTimeout = 120;
            if (parameters?.Length > 0)
                cmd.Parameters.AddRange(parameters);

            await con.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            var dt = new DataTable();
            dt.Load(reader);
            string json = JsonConvert.SerializeObject(dt);
            return JsonConvert.DeserializeObject<List<T>>(json) ?? [];
        }

        //Execute Procedure and Return Scalar as Int
        public async Task<int> ExecuteProcedureForInt(string procedureName, SqlParameter[] parameters = null)
        {
            try
            {
                using var con = new SqlConnection(_connectionString);
                using var cmd = new SqlCommand(procedureName, con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;
                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                await con.OpenAsync();
                var result = await cmd.ExecuteScalarAsync();
                if (result != null && result != DBNull.Value)
                    return Convert.ToInt32(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ExecuteProcedureForInt ({procedureName}): {ex.Message}");
            }
            return 0;
        }

        //Execute Procedure and Return Scalar as String
        public async Task<string> ExecuteProcedureForString(string procedureName, SqlParameter[] parameters = null)
        {
            using var con = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(procedureName, con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.CommandTimeout = 120;
            if (parameters?.Length > 0)
                cmd.Parameters.AddRange(parameters);

            await con.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return result != DBNull.Value ? result?.ToString() ?? string.Empty : string.Empty;
        }

        //Execute Procedure and Return DataSet
        public async Task<DataSet> ExecuteProcedureForDataSet(string procedureName, SqlParameter[] parameters = null)
        {
            var ds = new DataSet();

            using (var con = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand(procedureName, con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;
                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                using var adapter = new SqlDataAdapter(cmd);
                await Task.Run(() => adapter.Fill(ds));
            }
            return ds;
        }

        public async Task<T> ExecuteProcedureForObject<T>(string procedureName, SqlParameter[] parameters = null)
        {
            try
            {
                using var con = new SqlConnection(_connectionString);
                using var cmd = new SqlCommand(procedureName, con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;
                if (parameters?.Length > 0)
                    cmd.Parameters.AddRange(parameters);

                await con.OpenAsync();
                using var reader = await cmd.ExecuteReaderAsync();
                var dt = new DataTable();
                dt.Load(reader);

                if (dt.Rows.Count == 0)
                    return default;

                string json = JsonConvert.SerializeObject(dt);
                var list = JsonConvert.DeserializeObject<List<T>>(json);
                return (list != null && list.Count > 0) ? list[0] : default;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ExecuteProcedureForObject ({procedureName}): {ex.Message}");
                return default;
            }
        }

        //Execute Procedure that returns JSON string
        public async Task<string> ExecuteJsonReturningProcedureAsync(string procedureName, SqlParameter[] parameters = null)
        {
            using var con = new SqlConnection(_connectionString);
            using var cmd = new SqlCommand(procedureName, con);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.CommandTimeout = 120;
            if (parameters?.Length > 0)
                cmd.Parameters.AddRange(parameters);

            await con.OpenAsync();
            using var reader = await cmd.ExecuteReaderAsync();
            var sb = new StringBuilder();
            while (await reader.ReadAsync())
            {
                sb.Append(reader.GetString(0));
            }
            return sb.ToString();
        }

        //Execute Paginated Procedure
        public async Task<(List<T> Items, int TotalCount)> ExecutePaginatedProcedure<T>(string procedureName, int pageNumber = 1, int pageSize = 10, object additionalParams = null)
        {
            var parameters = new List<SqlParameter>
            {
                new SqlParameter("@PageNumber", pageNumber),
                new SqlParameter("@PageSize", pageSize)
            };

            if (additionalParams != null)
            {
                foreach (var prop in additionalParams.GetType().GetProperties())
                {
                    parameters.Add(new SqlParameter("@" + prop.Name, prop.GetValue(additionalParams, null) ?? DBNull.Value));
                }
            }

            var result = new List<T>();
            int totalCount = 0;

            using (var con = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand(procedureName, con))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.CommandTimeout = 120;
                cmd.Parameters.AddRange(parameters.ToArray());

                await con.OpenAsync();
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    var props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
                    var colNames = Enumerable.Range(0, reader.FieldCount).Select(reader.GetName).ToList();

                    while (await reader.ReadAsync())
                    {
                        var item = Activator.CreateInstance<T>();
                        foreach (var prop in props)
                        {
                            if (colNames.Any(cn => cn.Equals(prop.Name, StringComparison.InvariantCultureIgnoreCase)))
                            {
                                var val = reader[prop.Name];
                                if (val != DBNull.Value)
                                {
                                    prop.SetValue(item, val);
                                }
                            }
                        }
                        result.Add(item);
                    }

                    if (await reader.NextResultAsync() && await reader.ReadAsync())
                    {
                        totalCount = reader.GetInt32(0);
                    }
                }
            }
            return (result, totalCount);
        }
        private static SqlParameter[] ConvertToSqlParameters(object obj)
        {
            var parameters = new List<SqlParameter>();
            foreach (var prop in obj.GetType().GetProperties())
            {
                var val = prop.GetValue(obj, null) ?? DBNull.Value;
                parameters.Add(new SqlParameter("@" + prop.Name, val));
            }
            return [.. parameters];
        }
    }

    public static class SqlDataReaderExtensions
    {
        public static bool HasColumn(this SqlDataReader reader, string columnName)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (reader.GetName(i).Equals(columnName, StringComparison.InvariantCultureIgnoreCase))
                    return true;
            }
            return false;
        }

    }


}

