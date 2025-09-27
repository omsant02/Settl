// Extended types for Next.js API routes with dynamic segments
import { NextRequest } from 'next/server';

// Augment Next.js types with our custom API route types
declare global {
  namespace NextApiRoute {
    interface DynamicParams {
      params: {
        [key: string]: string | string[];
      };
    }
  }
}

// Helper type for dynamic API route parameters
export type ApiRouteParams<T extends Record<string, string | string[]>> = {
  params: T;
};

// Helper type for dynamic route handlers
export type ApiRouteHandler<T extends Record<string, string | string[]>> = (
  req: NextRequest,
  context: ApiRouteParams<T>
) => Promise<Response> | Response;


