import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { signParams } from './imageUpload.js';

describe('signParams', () => {
  it('gera a assinatura SHA-1 no formato do Cloudinary (parâmetros ordenados)', () => {
    // Exemplo da documentação do Cloudinary.
    const signature = signParams(
      { timestamp: 1315060510, public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' },
      'abcd',
    );

    assert.equal(signature, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});
