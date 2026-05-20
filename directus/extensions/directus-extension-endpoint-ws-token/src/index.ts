import type { Request, Response } from 'express';

export default {
  id: 'ws-token',
  handler: (router: any) => {
    router.get('/', (req: Request, res: Response) => {
      const cookie = req.headers.cookie ?? '';
      const match = cookie.match(/(?:^|;\s*)directus_session_token=([^;]+)/);
      const token = match ? decodeURIComponent(match[1]) : null;

      if (!token) {
        return res.status(401).json({ error: 'No directus_session_token found in request' });
      }

      return res.json({ token });
    });
  },
};
