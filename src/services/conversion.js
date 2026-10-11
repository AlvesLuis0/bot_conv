import axios from 'axios';
import { Endpoint } from '../core/endpoint.js';
import { SessionManager } from '../core/session-manager.js';
import { Authenticator } from '../core/authenticator.js';
import { RequestSigner } from '../core/request-signer.js';
import { ENVIRONMENT } from '../config/env.js';

const credentials = { username: ENVIRONMENT.CONV_USERNAME, password: ENVIRONMENT.CONV_PASSWORD };

export class ConversionService {
  constructor(number) {
    this.apiEndpoint = new Endpoint({
      base: `https://conversao-${number}.jetrocorporativo.com`,
      path: "/backend",
      root: "taylor"
    });
    this.session = new SessionManager();
    this.auth = new Authenticator(this.apiEndpoint, this.session);
    this.signer = new RequestSigner(this.apiEndpoint, this.session);
  }
  async getNameFromLoginScreen() {
    const { data } = await axios.get(`${this.apiEndpoint.base}/login`);
    const match = data.match(/<div class="versao">\s*<span>([^<]+)<\/span>/);
    return match ? match[1].trim() : null;
  }

  async getNameFromSession() {
    await this.auth.signIn(credentials);
    const path = this.apiEndpoint.getFullPath('api?modelo%3Dappgrupoempress');
    const signedUrl = `${this.apiEndpoint.base}${path}&session_signature=${this.signer.sign(path)}`;
    return (await axios.get(signedUrl)).data.data[0].Subdominio;
  }

  async getName() {
    try {
      const name = await this.getNameFromLoginScreen();
      if (name) return name;
    } catch { /* tela de login indisponível, tenta via sessão */ }

    try {
      return await this.getNameFromSession();
    } catch {
      return 'Fora do ar';
    }
  }
}