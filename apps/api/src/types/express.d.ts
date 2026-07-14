declare global {
  namespace Express {
    interface Request {
      requestId: string;
      actor?: {
        userId: string;
        email: string;
      };
    }
  }
}

export {};
