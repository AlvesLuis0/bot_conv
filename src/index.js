import { SessionManager } from './services/session-manager.js';
import { Authenticator } from './services/authenticator.js';
import { RequestSigner } from './services/request-signer.js';
import { Endpoint } from './services/endpoint.js';
import axios from 'axios';

async function getConvName(number) {
  const apiEndpoint = new Endpoint({
    base: `https://conversao-${number}.jetrocorporativo.com`,
    path: "/backend",
    root: "taylor"
  });
  const session = new SessionManager();
  const auth = new Authenticator(apiEndpoint, session);
  const signer = new RequestSigner(apiEndpoint, session);
  try {
    await auth.signIn({ username: 'jetro', password: 'Aa1234567' });
    const path = apiEndpoint.getFullPath('api?modelo%3Dappgrupoempress');
    const sessionSignature = signer.sign(path);
    const signedUrl = `${apiEndpoint.base}${path}&session_signature=${sessionSignature}`;

    return (await axios.get(signedUrl)).data.data[0].Subdominio;

  } catch (err) {
    console.error('Erro:', err.message);
    return 'Fora do ar';
  }
}

(async() => {
  const requests = [];
  for(let i = 1; i <= 9; i++) {
    requests.push(getConvName(i))
  }
  const responses = await Promise.all(requests)
  const table = {};
  responses.forEach((value, i) => table['Conversão '+ (i + 1)] = value)
  console.table(table);
})()