/**
 * @flow
 */
"use strict";

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

import {
  genUser,
  genUsers,
  genAuthenticate,
} from './database';

import {
  User,
} from './models';

const VIEWER = { id: 'viewer' };

const {nodeInterface, nodeField} = nodeDefinitions(
  async (globalId: string) => {
    var {type, id} = fromGlobalId(globalId);
    switch (type) {
      case 'User':
        return await genUser(id);
      default:
        return null;
    }
  },
  (obj) => {
    if (obj instanceof User) {
      return userType;
    } else {
      return null;
    }
  }
);

const viewerType = new GraphQLObjectType({
  name: 'Viewer',
  description: 'A person who uses our app',
  fields: () => ({
    id: globalIdField('Viewer'),
    user: userField,
  }),
});

const userType = new GraphQLObjectType({
  name: 'User',
  description: 'A person who uses our app',
  fields: () => ({
    id: globalIdField('User'),
    name: {
      type: GraphQLString,
      description: 'A person\'s name',
    },

  }),
  interfaces: [nodeInterface],
});

const userConnection = connectionDefinitions({
  name: 'User',
  nodeType: userType
}).connectionType;

const userField = {
  type: userType,
  resolve: async (root, args, {rootValue}) => {
    if (!rootValue.id) {
      return null;
    }
    return await genUser(rootValue.id);
  },
};

const viewerField = {
  type: viewerType,
  resolve: (root, args, {rootValue}) => {
    return VIEWER;
  },
};

const loginMutation = mutationWithClientMutationId({
  name: 'LoginMutation',
  inputFields: {
    username: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
  },
  outputFields: {
    access_token: {
      type: GraphQLString,
      description: 'The user\'s access token',
    },
    viewer: viewerField,
  },
  mutateAndGetPayload: async ({username, password}, {rootValue}) => {
    const userData = await genAuthenticate(username, password);
    if (!userData) {
      return {};
    }
    rootValue.id = userData.id;
    return {access_token: userData.accessToken};
  },
});

export default new GraphQLSchema({

  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      node: nodeField,
      viewer: viewerField,
      users: {
        type: userConnection,
        description: '',
        args: connectionArgs,
        resolve: async (root, args) => {
          const users = await genUsers();
          return connectionFromArray(users, args);
        }
      },
    }),
  }),

  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
      login: loginMutation,
    })
  }),

});
