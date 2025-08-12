const conversions = [];

export class ConversionManager {
  static getNames() {
    return conversions;
  }

  static setName(conv, name) {
    conversions[conv - 1] = name;
  }
}