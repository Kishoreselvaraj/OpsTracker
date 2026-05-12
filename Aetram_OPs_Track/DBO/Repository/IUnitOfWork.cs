using Aetram_OPs_Track.DAL;

namespace Aetram_OPs_Track.DBO.Repository;

/// <summary>
/// Unit of work / database access gateway for repositories (request-scoped).
/// </summary>
public interface IUnitOfWork
{
    IDBClass Db { get; }
}
