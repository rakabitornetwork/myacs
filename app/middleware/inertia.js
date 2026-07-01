import { getViteAssets, getAssetVersion } from '../helpers/vite.js';
import { acsInfoForClient } from '../helpers/acs.js';
import { taskCancelHelperScript } from '../helpers/taskCancelScript.js';
import config from '../config/index.js';

function resolveVersion(req) {
  const header = req.headers['x-inertia-version'];
  return header || undefined;
}

export function inertiaMiddleware(req, res, next) {
  const shared = {
    auth: { user: null },
    flash: {},
    app: {
      name: 'MyACS',
      url: config.appUrl,
      ...acsInfoForClient(),
    },
  };

  req.inertia = {
    share(key, value) {
      if (typeof key === 'object') {
        Object.assign(shared, key);
      } else {
        shared[key] = value;
      }
    },

  render(page, props = {}, options = {}) {
      const assets = getViteAssets();
      const version = options.version || getAssetVersion();
      const data = {
        component: page,
        props: { ...shared, ...props },
        url: req.originalUrl,
        version,
      };

      const isInertia = req.headers['x-inertia'] === 'true';

      if (isInertia) {
        res.setHeader('X-Inertia', 'true');
        res.setHeader('X-Inertia-Version', version);
        return res.json(data);
      }

      if (!config.isProduction) {
        res.setHeader('Cache-Control', 'no-store');
      }

      const pageJson = JSON.stringify(data).replace(/</g, '\\u003c');
      const scriptTags = assets.scripts
        .map((src) => `<script type="module" src="${src}"></script>`)
        .join('\n    ');
      const styleTags = assets.styles
        .map((href) => `<link rel="stylesheet" href="${href}">`)
        .join('\n    ');

      const viteClient =
        assets.dev ? `<script type="module" src="${assets.url}/@vite/client"></script>` : '';

      return res.send(`<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MyACS — TeslaTech</title>
    ${styleTags}
    ${viteClient}
    ${scriptTags}
  </head>
  <body class="antialiased">
    <div id="app" data-page='${pageJson}'></div>
    ${taskCancelHelperScript()}
  </body>
</html>`);
    },

    redirect(url) {
      return res.redirect(302, url);
    },

    location(url) {
      if (req.headers['x-inertia'] === 'true') {
        res.setHeader('X-Inertia-Location', url);
        return res.status(409).end();
      }
      return res.redirect(302, url);
    },
  };

  next();
}

export function inertiaErrorHandler(err, req, res, next) {
  if (req.headers['x-inertia'] === 'true') {
    return res.status(err.status || 500).json({
      component: 'Error',
      props: { message: err.message || 'Server Error' },
      url: req.originalUrl,
      version: '1.0.0',
    });
  }
  next(err);
}
