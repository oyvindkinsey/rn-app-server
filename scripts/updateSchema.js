#!/usr/bin/env babel-node --optional es7.asyncFunctions
/**
 * @flow
 */
"use strict";

import fs from 'fs';
import path from 'path';
import Schema from '../data/schema';
import { graphql }  from 'graphql';
import { introspectionQuery, printSchema } from 'graphql/utilities';

console.info('Updating Schema');

// Save JSON of full schema introspection for Babel Relay Plugin to use
(async () => {
  var result = await (graphql(Schema, introspectionQuery));
  if (result.errors) {
    console.error(
      'ERROR introspecting schema: ',
      JSON.stringify(result.errors, null, 2)
    );
  } else {
    fs.writeFileSync(
      path.join(__dirname, '../data/schema.json'),
      JSON.stringify(result, null, 2)
    );
  }
})().done();

// Save user readable type system shorthand of schema
fs.writeFileSync(
  path.join(__dirname, '../data/schema.graphql'),
  printSchema(Schema)
);

console.info('Done Updating Schema');
