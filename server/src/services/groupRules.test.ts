import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HttpError } from '../utils/httpError.js';
import { assertLimitCoversMembers, assertValidLimit, computeMembersAfterAdd } from './groupRules.js';

function errorCode(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof HttpError ? error.code : 'UNKNOWN';
  }
}

describe('groupRules', () => {
  it('aceita adicionar até completar o limite', () => {
    assert.deepEqual(computeMembersAfterAdd(['a', 'b'], ['c', 'd', 'e'], 5), ['a', 'b', 'c', 'd', 'e']);
  });

  it('bloqueia quando a entrada ultrapassa o limite', () => {
    assert.equal(errorCode(() => computeMembersAfterAdd(['a', 'b', 'c', 'd', 'e'], ['f'], 5)), 'GROUP_FULL');
  });

  it('ignora integrantes repetidos ou já existentes', () => {
    assert.deepEqual(computeMembersAfterAdd(['a', 'b'], ['b', 'c', 'c'], 3), ['a', 'b', 'c']);
  });

  it('não permite reduzir o limite abaixo da quantidade atual', () => {
    assert.equal(errorCode(() => assertLimitCoversMembers(3, 4)), 'LIMIT_BELOW_MEMBERS');
    assert.equal(errorCode(() => assertLimitCoversMembers(4, 4)), null);
  });

  it('valida limite inteiro e dentro da faixa', () => {
    assert.equal(errorCode(() => assertValidLimit(2.5)), 'INVALID_LIMIT');
    assert.equal(errorCode(() => assertValidLimit('5')), 'INVALID_LIMIT');
    assert.equal(errorCode(() => assertValidLimit(1)), 'INVALID_LIMIT');
    assert.equal(errorCode(() => assertValidLimit(5)), null);
  });
});
