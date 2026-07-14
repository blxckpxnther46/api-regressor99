import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createTargetVerification,
  listTargetVerifications,
  revokeTargetVerification,
  verifyTarget
} from "./target-verification.service.js";
import {
  createTargetVerificationSchema,
  targetVerificationParamsSchema
} from "./target-verification.schemas.js";

export const targetVerificationRouter = Router({ mergeParams: true });

targetVerificationRouter.get(
  "/",
  validateRequest({ params: targetVerificationParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await listTargetVerifications(request.actor!.userId, request.params.projectId!))
    );
  })
);

targetVerificationRouter.post(
  "/",
  validateRequest({
    params: targetVerificationParamsSchema,
    body: createTargetVerificationSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createTargetVerification(
          request.actor!.userId,
          request.params.projectId!,
          request.body
        )
      )
    );
  })
);

targetVerificationRouter.post(
  "/verify",
  validateRequest({ params: targetVerificationParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await verifyTarget(request.actor!.userId, request.params.projectId!)));
  })
);

targetVerificationRouter.post(
  "/revoke",
  validateRequest({ params: targetVerificationParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await revokeTargetVerification(request.actor!.userId, request.params.projectId!))
    );
  })
);

