import { crc32, toHex } from "../utils/crypto-utils.js";

export class RequestSigner {
  constructor(api, session) {
    this.api = api;
    this.session = session;
  }

  sign(pathAndQuery) {
    if (!this.session.sessionPrivateKey || !this.session.sessionIDHexa8) {
      throw new Error('Sessão inválida. Faça login primeiro.');
    }

    const nonce = this.session.generateNonce();
    const urlAuth = pathAndQuery.includes(this.api.root)
      ? pathAndQuery.slice(pathAndQuery.indexOf(this.api.root))
      : pathAndQuery;

    const intermediate = crc32(nonce, this.session.sessionPrivateKey);
    const final = crc32(urlAuth, intermediate.toString());
    const signature = toHex(final);

    const separator = pathAndQuery.includes('?') ? '&' : '?';
    const path = pathAndQuery.startsWith('/') ? pathAndQuery.slice(1) : pathAndQuery;

    return `${this.session.sessionIDHexa8}${nonce}${signature}`;
  }
}