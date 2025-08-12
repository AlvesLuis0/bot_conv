import { ConversionService } from './services/conversion.js';

(async() => {
  const requests = [];
  for(let i = 1; i <= 9; i++) {
    requests.push(new ConversionService(i).getName())
  }
  const responses = await Promise.all(requests)
  const table = {};
  responses.forEach((value, i) => table['Conversão '+ (i + 1)] = value)
  console.table(table);
})()