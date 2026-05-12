namespace Aetram_OPs_Track.Models.Entities;

/// <summary>
/// Optional base for persisted entities (shared audit fields).
/// </summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
