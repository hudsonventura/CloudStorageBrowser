using CloudStorageBrowser.Domain.Enums;

namespace CloudStorageBrowser.Application.Common.Models;

public class PaginationParams
{
    private const int MaxPageSize = 500;
    private int _pageSize = 100;

    public int Page { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 100 : value);
    }

    public SortField SortBy { get; set; } = SortField.Name;
    public SortDirection SortDirection { get; set; } = SortDirection.Ascending;
    public string? Search { get; set; }
}
