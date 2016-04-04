/**
 * @flow
 */
"use strict";

import mysql from 'mysql';

export async function genHead<T>(promise: Promise<Array<T>>): Promise<?T> {
  const vector = await promise;
  if (!vector) {
    return null;
  }
  return vector[0] || null;
}
