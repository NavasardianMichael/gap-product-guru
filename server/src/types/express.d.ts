declare global {
  namespace Express {
    interface Request {
      /** Anonymous per-browser id from the X-Client-Id header, set by `requireClientId`. */
      clientId?: string;
    }
  }
}

export {};
