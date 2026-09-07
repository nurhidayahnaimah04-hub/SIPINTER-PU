/**
 * Membuat bentuk response mirip Illuminate\Pagination\LengthAwarePaginator::toJson(),
 * supaya frontend (yang membaca res.data.data) tidak perlu diubah sama sekali.
 */
export function buildPaginationResponse({ data, total, page, perPage, path }) {
  const lastPage = Math.max(Math.ceil(total / perPage), 1);
  const from = total === 0 ? null : (page - 1) * perPage + 1;
  const to = total === 0 ? null : Math.min(page * perPage, total);

  return {
    current_page: page,
    data,
    first_page_url: `${path}?page=1`,
    from,
    last_page: lastPage,
    last_page_url: `${path}?page=${lastPage}`,
    links: [],
    next_page_url: page < lastPage ? `${path}?page=${page + 1}` : null,
    path,
    per_page: perPage,
    prev_page_url: page > 1 ? `${path}?page=${page - 1}` : null,
    to,
    total,
  };
}
