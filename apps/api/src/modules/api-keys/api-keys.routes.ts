import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey
} from "./api-keys.service.js";
import {
  apiKeyParamsSchema,
  createApiKeySchema,
  organizationApiKeysParamsSchema
} from "./api-keys.schemas.js";

export const organizationApiKeysRouter = Router({ mergeParams: true });
export const apiKeysRouter = Router();

organizationApiKeysRouter.use(requireAuth);
apiKeysRouter.use(requireAuth);

organizationApiKeysRouter.get(
  "/",
  validateRequest({ params: organizationApiKeysParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await listApiKeys(request.actor!.userId, request.params.organizationId!))
    );
  })
);

organizationApiKeysRouter.post(
  "/",
  validateRequest({
    params: organizationApiKeysParamsSchema,
    body: createApiKeySchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createApiKey(
          request.actor!.userId,
          request.params.organizationId!,
          request.body
        )
      )
    );
  })
);

apiKeysRouter.delete(
  "/:apiKeyId",
  validateRequest({ params: apiKeyParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await revokeApiKey(request.actor!.userId, request.params.apiKeyId!)));
  })
);

