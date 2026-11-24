import crypto from "node:crypto";

const SAFE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;

export function requestIdTracer(req, res, next) {
  const incomingId = req.get("x-request-id");
  const requestId =
    incomingId && SAFE_REQUEST_ID_PATTERN.test(incomingId)
      ? incomingId
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
}
