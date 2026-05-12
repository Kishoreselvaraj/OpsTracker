using Microsoft.Data.SqlClient;

namespace Aetram_OPs_Track.DAL;

/// <summary>
/// Wraps SQL Server failures after logging so upper layers avoid leaking raw provider details to the UI.
/// </summary>
public sealed class DatabaseAccessException : Exception
{
    public DatabaseAccessException(string message, Exception innerException)
        : base(message, innerException)
    {
        if (innerException is SqlException sql)
        {
            SqlErrorNumber = sql.Number;
            if (sql.Errors.Count > 0)
                SqlBatchState = sql.Errors[0].State;
        }
    }

    public int? SqlErrorNumber { get; }

    /// <summary>SQLSTATE class from the first error in the batch, when present.</summary>
    public byte? SqlBatchState { get; }

    public static DatabaseAccessException FromSql(string operation, SqlException ex) =>
        new($"Database operation '{operation}' failed (SQL {ex.Number}).", ex);
}
