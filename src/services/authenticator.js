import axios from 'axios';
import moment from 'moment';
import { sha256, crc32 } from '../utils/crypto-utils.js';

export class Authenticator {
  constructor(api, session) {
    this.api = api;
    this.session = session;
  }

  async signIn({ username, password, tipo = 0 }) {
    const user = username.toLowerCase();
    const passwordHash = sha256('salt' + password);

    const nonceRes = await axios.get(this.api.getUrl(`auth?UserName=${user}`));
    const serverNonce = nonceRes.data.result;

    const clientNonce = sha256(moment().format('YYYY-MM-DD HH:mm:ss'));
    const hashInput = this.api.root + serverNonce + clientNonce + user + passwordHash;
    const passwordParam = sha256(hashInput);

    const params = new URLSearchParams({
      UserName: user,
      Password: passwordParam,
      ClientNonce: clientNonce,
      TipoID: tipo,
      GrupoID: 0
    });

    const sessionRes = await axios.get(this.api.getUrl(`auth?${params}`));
    const [sessionIDStr] = sessionRes.data.result.split('+');
    const sessionID = parseInt(sessionIDStr, 10);
    const privateKey = crc32(passwordHash, crc32(sessionRes.data.result, 0));

    this.session.updateSession({ sessionID, privateKey });

    return {
      login: user,
      sessionID,
      sessionIDHexa8: this.session.sessionIDHexa8,
      sessionPrivateKey: privateKey
    };
  }
}