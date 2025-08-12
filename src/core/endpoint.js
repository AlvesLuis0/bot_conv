export class Endpoint {
  constructor({ base, path, root }) {
    this.base = base;
    this.path = path;
    this.root = root;
  }

  getUrl(path) {
    return `${this.base}${this.getFullPath(path)}`;
  }

  getFullPath(path) {
    return `${this.path}/${this.root}/${path}`
  }
}