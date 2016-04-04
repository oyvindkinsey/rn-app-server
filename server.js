/**
 * @flow
 */
"use strict";

import express from 'express';
import graphQLHTTP from 'express-graphql';
import jwt from 'express-jwt';
import Schema from './data/schema';

import {
  jwtSecret,
} from './secrets';

const GRAPHQL_PORT = 8080;

const authenticator = jwt({
  secret: jwtSecret,
  credentialsRequired: false,
  userProperty: 'session',
});

express().use('/', authenticator, graphQLHTTP(request => ({
  graphiql: true,
  pretty: true,
  schema: Schema,
  rootValue: request.session || {},
}))).listen(GRAPHQL_PORT, () => console.log(
  `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}`
));
