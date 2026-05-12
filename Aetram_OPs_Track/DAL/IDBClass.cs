using System.Data;
using Microsoft.Data.SqlClient;

namespace Aetram_OPs_Track.DAL;

/// <summary>
/// SQL Server data access via ADO.NET (async, DI-scoped, transaction-aware).
/// </summary>
public interface IDBClass
{
    string ConnectionString { get; }

    /// <summary>ADO.NET command timeout in seconds (0 = driver default).</summary>
    int CommandTimeoutSeconds { get; }

    SqlConnection CreateConnection();

    /// <summary>Runs work inside a transaction (commit on success, rollback on any exception).</summary>
    Task<T> ExecuteInTransactionAsync<T>(
        Func<SqlConnection, SqlTransaction, CancellationToken, Task<T>> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default);

    Task ExecuteInTransactionAsync(
        Func<SqlConnection, SqlTransaction, CancellationToken, Task> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default);

    Task<int> ExecuteNonQueryAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters);

    Task<int> ExecuteNonQueryAsync(string commandText, CommandType commandType, params SqlParameter[] parameters);

    Task<object?> ExecuteScalarAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters);

    Task<object?> ExecuteScalarAsync(string commandText, CommandType commandType, params SqlParameter[] parameters);

    Task<DataTable> ExecuteDataTableAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters);

    Task<DataTable> ExecuteDataTableAsync(string commandText, CommandType commandType, params SqlParameter[] parameters);

    /// <summary>Opens a new connection; reader closes connection when disposed.</summary>
    Task<SqlDataReader> ExecuteReaderAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters);

    Task<SqlDataReader> ExecuteReaderAsync(string commandText, CommandType commandType, params SqlParameter[] parameters);

    /// <summary>Use inside <see cref="ExecuteInTransactionAsync"/> so the reader participates in the transaction.</summary>
    Task<SqlDataReader> ExecuteReaderAsync(
        SqlConnection connection,
        SqlTransaction? transaction,
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters);

    SqlParameter CreateParameter(string name, object? value, SqlDbType? dbType = null, ParameterDirection direction = ParameterDirection.Input);
}
