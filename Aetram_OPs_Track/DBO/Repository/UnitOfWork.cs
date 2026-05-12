using Aetram_OPs_Track.DAL;

namespace Aetram_OPs_Track.DBO.Repository;

public sealed class UnitOfWork : IUnitOfWork
{
    public UnitOfWork(IDBClass db) => Db = db;

    public IDBClass Db { get; }
}
