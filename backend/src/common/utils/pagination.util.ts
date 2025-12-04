export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    meta: {
      total,
      page,
      lastPage: Math.ceil(total / limit),
      perPage: limit,
    },
  };
}

export function calculatePagination(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}
