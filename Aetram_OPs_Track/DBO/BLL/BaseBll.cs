using Aetram_OPs_Track.DBO.Repository;

namespace Aetram_OPs_Track.DBO.BLL;

/// <summary>
/// Base class for business logic; inject <see cref="IUnitOfWork"/> for data access.
/// </summary>
public abstract class BaseBll
{
    protected BaseBll(IUnitOfWork unitOfWork) => UnitOfWork = unitOfWork;

    protected IUnitOfWork UnitOfWork { get; }
}
