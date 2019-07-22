import {
  createSongkoro,
} from 'songkoro';
import {
  MakeHtml,
} from 'express-isomorphic';
import { logger } from 'jege/server';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { renderToStringProxy } from 'songkoro/server';

import ServerApp from './ServerApp';
import State from './State';

const log = logger('[sandbox]');

const makeHtml: MakeHtml<State> = async function makeHtml({
  requestUrl,
  serverState,
}) {
  log('makeHtml(): requestUrl: %s, serverState: %j', requestUrl, serverState);

  const { socketPath, socketPort, state } = serverState;
  const songkoro = createSongkoro({
    ssr: true,
  });
  const element = (
    <ServerApp
      songkoro={songkoro}
      requestUrl={requestUrl}
    />
  );

  const appRootInString = await renderToStringProxy({
    element,
    renderFunction: renderToString,
  });

  log('makeHtml(): store', Object.keys(songkoro.store));
  log('makeHtml(): appRootInString length: %s', appRootInString.length);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,height=device-height,initial-scale=1">
  <title>songkoro-example</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.dev.js"></script>
  <script>
    window['__APP_STATE__']=${songkoro.getStoreObject()}
  </script>
</head>
<body>
  <div id="app-root">${appRootInString}</div>
  ${attachAssetElements(state.assets)}
  <script>
    ${createSocketScriptElement(socketPort, socketPath)}
  </script>
</body>
</html>
`;
};

export default makeHtml;

function attachAssetElements(assets: string[] = []): string {
  return assets.map((asset) => {
    if (asset.endsWith('.js')) {
      return `<script src="/bundle/${asset}"></script>`;
    }

    if (asset.endsWith('.css')) {
      return `<link rel="stylesheet" type="text/css" href="/bundle/${asset}">`;
    }

    console.warn('The type of asset is not handled: %s', asset); // eslint-disable-line
    return undefined;
  })
    .join('');
}

function createSocketScriptElement(socketPort, socketPath) {
  if (socketPort && socketPath) {
    return socketPort && socketPath && `
if (window.io) {
  var socket = io('http://localhost:${socketPort}', {
    path: '${socketPath}',
  });
  socket.on('express-isomorphic', function ({ msg }) {
    console.log('[express-isomorphic] %s', msg);
  });
}`;
  }
  return '';
}
