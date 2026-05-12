using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using DbOptions = Aetram_OPs_Track.DatabaseOptions;
using BehaviorOptions = Aetram_OPs_Track.DataAccessOptions;

namespace Aetram_OPs_Track.DAL;

/// <summary>
/// ADO.NET implementation with async APIs, optional transactions, and centralized SQL exception handling.
/// </summary>
public sealed class DBClass : IDBClass
{
    private readonly DbOptions _connectionOptions;
    private readonly BehaviorOptions _behavior;
    private readonly ILogger<DBClass> _logger;

    public DBClass(
        IOptionsSnapshot<DbOptions> connectionOptions,
        IOptionsSnapshot<BehaviorOptions> behaviorOptions,
        ILogger<DBClass> logger)
    {
        _connectionOptions = connectionOptions.Value;
        _behavior = behaviorOptions.Value;
        _logger = logger;
    }

    public string ConnectionString =>
        string.IsNullOrWhiteSpace(_connectionOptions.DefaultConnection)
            ? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.")
            : _connectionOptions.DefaultConnection;

    public int CommandTimeoutSeconds => _behavior.CommandTimeoutSeconds;

    public SqlConnection CreateConnection() => new(ConnectionString);

    public async Task<T> ExecuteInTransactionAsync<T>(
        Func<SqlConnection, SqlTransaction, CancellationToken, Task<T>> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(work);
        await using var connection = CreateConnection();
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        await using var dbTransaction = await connection
            .BeginTransactionAsync(isolationLevel, cancellationToken)
            .ConfigureAwait(false);
        var transaction = (SqlTransaction)dbTransaction;

        try
        {
            var result = await work(connection, transaction, cancellationToken).ConfigureAwait(false);
            await dbTransaction.CommitAsync(cancellationToken).ConfigureAwait(false);
            return result;
        }
        catch (Exception ex)
        {
            try
            {
                await dbTransaction.RollbackAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (Exception rollbackEx)
            {
                _logger.LogWarning(rollbackEx, "Transaction rollback failed after an error.");
            }

            ThrowIfSql(ex, "ExecuteInTransaction");
            throw;
        }
    }

    public Task ExecuteInTransactionAsync(
        Func<SqlConnection, SqlTransaction, CancellationToken, Task> work,
        IsolationLevel isolationLevel = IsolationLevel.ReadCommitted,
        CancellationToken cancellationToken = default) =>
        ExecuteInTransactionAsync(async (c, t, ct) =>
        {
            await work(c, t, ct).ConfigureAwait(false);
            return true;
        }, isolationLevel, cancellationToken);

    public Task<int> ExecuteNonQueryAsync(string commandText, CommandType commandType, params SqlParameter[] parameters) =>
        ExecuteNonQueryAsync(commandText, commandType, CancellationToken.None, parameters);

    public Task<int> ExecuteNonQueryAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters) =>
        GuardAsync("ExecuteNonQuery", async () =>
        {
            await using var connection = CreateConnection();
            await using var command = CreateCommand(connection, null, commandText, commandType, parameters);
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            return await command.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        });

    public Task<object?> ExecuteScalarAsync(string commandText, CommandType commandType, params SqlParameter[] parameters) =>
        ExecuteScalarAsync(commandText, commandType, CancellationToken.None, parameters);

    public Task<object?> ExecuteScalarAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters) =>
        GuardAsync("ExecuteScalar", async () =>
        {
            await using var connection = CreateConnection();
            await using var command = CreateCommand(connection, null, commandText, commandType, parameters);
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            return (object?)await command.ExecuteScalarAsync(cancellationToken).ConfigureAwait(false);
        });

    public Task<DataTable> ExecuteDataTableAsync(string commandText, CommandType commandType, params SqlParameter[] parameters) =>
        ExecuteDataTableAsync(commandText, commandType, CancellationToken.None, parameters);

    public Task<DataTable> ExecuteDataTableAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters) =>
        GuardAsync("ExecuteDataTable", async () =>
        {
            var table = new DataTable();
            await using var connection = CreateConnection();
            await using var command = CreateCommand(connection, null, commandText, commandType, parameters);
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            table.Load(reader);
            return table;
        });

    public Task<SqlDataReader> ExecuteReaderAsync(string commandText, CommandType commandType, params SqlParameter[] parameters) =>
        ExecuteReaderAsync(commandText, commandType, CancellationToken.None, parameters);

    public Task<SqlDataReader> ExecuteReaderAsync(
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters) =>
        GuardAsync("ExecuteReader", async () =>
        {
            var connection = CreateConnection();
            try
            {
                var command = CreateCommand(connection, null, commandText, commandType, parameters);
                await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
                return await command
                    .ExecuteReaderAsync(CommandBehavior.CloseConnection, cancellationToken)
                    .ConfigureAwait(false);
            }
            catch
            {
                await connection.DisposeAsync().ConfigureAwait(false);
                throw;
            }
        });

    public Task<SqlDataReader> ExecuteReaderAsync(
        SqlConnection connection,
        SqlTransaction? transaction,
        string commandText,
        CommandType commandType,
        CancellationToken cancellationToken,
        params SqlParameter[] parameters) =>
        GuardAsync("ExecuteReader(Transactional)", async () =>
        {
            ArgumentNullException.ThrowIfNull(connection);
            var command = CreateCommand(connection, transaction, commandText, commandType, parameters);
            return await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
        });

    public SqlParameter CreateParameter(string name, object? value, SqlDbType? dbType = null, ParameterDirection direction = ParameterDirection.Input)
    {
        var parameter = dbType.HasValue
            ? new SqlParameter(name, dbType.Value) { Direction = direction }
            : new SqlParameter(name, value ?? DBNull.Value) { Direction = direction };

        if (!dbType.HasValue && value is null && direction == ParameterDirection.Input)
            parameter.Value = DBNull.Value;

        return parameter;
    }

    private SqlCommand CreateCommand(
        SqlConnection connection,
        SqlTransaction? transaction,
        string commandText,
        CommandType commandType,
        SqlParameter[] parameters)
    {
        var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = commandText;
        command.CommandType = commandType;
        if (CommandTimeoutSeconds > 0)
            command.CommandTimeout = CommandTimeoutSeconds;
        if (parameters is { Length: > 0 })
            command.Parameters.AddRange(parameters);
        return command;
    }

    private async Task<T> GuardAsync<T>(string operation, Func<Task<T>> action)
    {
        try
        {
            return await action().ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            ThrowIfSql(ex, operation);
            throw;
        }
    }

    private void ThrowIfSql(Exception ex, string operation)
    {
        if (ex is SqlException sql)
        {
            _logger.LogError(sql, "SQL failure during {Operation}", operation);
            throw DatabaseAccessException.FromSql(operation, sql);
        }
    }
}