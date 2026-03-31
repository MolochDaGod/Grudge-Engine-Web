import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    engine: 'Grudge Engine Web',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'modular-characters',
      'vat-crowd-rendering',
      'asset-pipeline',
      'babylonjs-editor',
    ],
  });
}
