using System.Data;
using Microsoft.Data.SqlClient;

namespace Aetram_OPs_Track.DAL;

/// <summary>
/// Reusable ADO.NET helpers (parameters, readers, safe conversions).
/// </summary>
public static class DatabaseHelper
{
    /// <summary>Creates an input parameter; null becomes <see cref="DBNull.Value"/>.</summary>
    public static SqlParameter Input(string name, object? value, SqlDbType? dbType = null)
    {
        var p = dbType.HasValue
            ? new SqlParameter(EnsureName(name), dbType.Value)
            : new SqlParameter(EnsureName(name), value ?? DBNull.Value);
        p.Direction = ParameterDirection.Input;
        if (!dbType.HasValue && value is null)
            p.Value = DBNull.Value;
        return p;
    }

    public static SqlParameter Output(string name, SqlDbType dbType, int? size = null)
    {
        var p = new SqlParameter(EnsureName(name), dbType) { Direction = ParameterDirection.Output };
        if (size.HasValue)
            p.Size = size.Value;
        return p;
    }

    public static SqlParameter ReturnValue() =>
        new("@RETURN_VALUE", SqlDbType.Int) { Direction = ParameterDirection.ReturnValue };

    /// <summary>Reads all rows using <paramref name="map"/>; disposes <paramref name="reader"/>.</summary>
    public static async Task<IReadOnlyList<T>> ReadAllAsync<T>(
        SqlDataReader reader,
        Func<SqlDataReader, T> map,
        CancellationToken cancellationToken = default)
    {
        var list = new List<T>();
        try
        {
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
                list.Add(map(reader));
        }
        finally
        {
            await reader.DisposeAsync().ConfigureAwait(false);
        }

        return list;
    }

    /// <summary>Maps first row or default if no row.</summary>
    public static async Task<T?> ReadFirstOrDefaultAsync<T>(
        SqlDataReader reader,
        Func<SqlDataReader, T> map,
        CancellationToken cancellationToken = default)
        where T : class
    {
        try
        {
            if (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
                return map(reader);
            return null;
        }
        finally
        {
            await reader.DisposeAsync().ConfigureAwait(false);
        }
    }

    public static T? GetField<T>(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
            return default;
        return reader.GetFieldValue<T>(ordinal);
    }

    public static T? GetFieldOrNull<T>(SqlDataReader reader, string columnName) where T : struct
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetFieldValue<T>(ordinal);
    }

    public static string? GetStringOrNull(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private static string EnsureName(string name) =>
        string.IsNullOrWhiteSpace(name) ? throw new ArgumentException("Parameter name is required.", nameof(name)) : name;
}
