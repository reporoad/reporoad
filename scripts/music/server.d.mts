import type { IncomingMessage, ServerResponse } from 'node:http';
export function musicMiddleware(root?: string): (req: IncomingMessage, res: ServerResponse, next?: () => void) => void;
