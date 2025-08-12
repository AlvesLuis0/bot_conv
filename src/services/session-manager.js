export class SessionManager {
  constructor() {
    this.sessionID = null;
    this.sessionIDHexa8 = null;
    this.sessionPrivateKey = null;
    this.lastSessionTickCount = 0;
  }

  generateNonce() {
    const now = Date.now();
    if (now <= this.lastSessionTickCount) {
      this.lastSessionTickCount++;
    } else {
      this.lastSessionTickCount = now;
    }

    let nonce = this.lastSessionTickCount.toString(16);
    while (nonce.length < 8) nonce = '0' + nonce;
    return nonce.slice(-8);
  }

  updateSession({ sessionID, privateKey }) {
    this.sessionID = sessionID;
    this.sessionIDHexa8 = sessionID.toString(16).padStart(8, '0');
    this.sessionPrivateKey = privateKey;
  }
}