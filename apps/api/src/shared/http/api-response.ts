type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiSuccessResponse<TData, TMeta = Record<string, unknown>> = {
  data: TData;
  meta: TMeta;
  error: null;
};

type ApiErrorResponse<TMeta = Record<string, unknown>> = {
  data: null;
  meta: TMeta;
  error: ApiError;
};

export function ok<TData, TMeta = Record<string, never>>(
  data: TData,
  meta = {} as TMeta
): ApiSuccessResponse<TData, TMeta> {
  return {
    data,
    meta,
    error: null
  };
}

export function fail<TMeta = Record<string, never>>(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  meta = {} as TMeta
): ApiErrorResponse<TMeta> {
  return {
    data: null,
    meta,
    error: {
      code,
      message,
      details
    }
  };
}
