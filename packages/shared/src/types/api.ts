export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiSuccessResponse<TData, TMeta = Record<string, unknown>> = {
  data: TData;
  meta: TMeta;
  error: null;
};

export type ApiErrorResponse<TMeta = Record<string, unknown>> = {
  data: null;
  meta: TMeta;
  error: ApiError;
};

export type ApiResponse<TData, TMeta = Record<string, unknown>> =
  | ApiSuccessResponse<TData, TMeta>
  | ApiErrorResponse<TMeta>;

export type CursorPaginationMeta = {
  nextCursor: string | null;
  hasMore: boolean;
};

