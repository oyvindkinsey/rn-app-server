/**
 * @flow
 */
"use strict";

import hasher from 'wordpress-hash-node';
import invariant from 'invariant';
import jwt from 'jsonwebtoken';
import mysql from 'mysql';

import {
  genHead,
} from '../utilities';

import {
  User,
} from './models';

import {
  dbSettings,
  jwtSecret,
} from '../secrets';

type AuthResponse = {
  id: number,
  accessToken: string,
};

type Connection = {
  release: () => void;
  query: (
    query: string,
    fn: (err: ?Error, rows: ?Array<Object>
  ) => void) => void;
}

type ConnectionPool = {
  getConnection: (
    fn: (err: ?Error, connection: ?Connection) => Promise
  ) => Promise;
};

const mySqlPool: ConnectionPool = mysql.createPool({
  connectionLimit: 10,
  ...dbSettings,
});

class SqlQuery {

  _query: string;

  constructor(query) {
    this._query = query;
  }

  toString(): string {
    return this._query;
  }

}

function SQL(query: Array<string>, ...params: Array<string>): SqlQuery {
  const parts = [query[0]];
  for (let ii = 0; ii < params.length; ii++) {
    parts.push(mysql.escape(params[ii]), query[ii + 1]);
  }
  return new SqlQuery(parts.join(''));
}

function getConnection<T>(
  fn: (connection: Connection) => Promise<T>,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    mySqlPool.getConnection(async (err, connection) => {
      if (err) {
        reject(err);
      } else if (connection) {
        const result = await fn(connection);
        connection.release();
        resolve(result);
      }
    });
  });
}

function runQuery(
  connection: Connection,
  sqlQuery: SqlQuery,
): Promise<Array<Object>> {
  invariant(
    sqlQuery instanceof SqlQuery,
    'Query has to be escaped using SQL`...`',
  );

  return new Promise((resolve, reject) => {
    connection.query(sqlQuery.toString(), (err, rows: ?Array<Object>) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}


export function genUsers(): Promise<Array<User>> {
  return getConnection(async (conn): Promise<Array<User>> => {
    const rows = await runQuery(conn, SQL`
      SELECT ID, display_name
      FROM wp_users;`
    );

    return rows.map(row => new User({
      id: String(row.ID),
      name: row.display_name,
    }));
  });
}

export function genUser(id: string): Promise<?User> {
  return getConnection(async (conn): Promise<?User> => {
    const row = await genHead(runQuery(conn, SQL`
      SELECT ID, display_name
      FROM wp_users
      WHERE ID=${id};`
    ));
    if (!row) {
      return null;
    }
    return new User({
      id: String(row.ID),
      name: row.display_name,
    });
  });
}

export function genAuthenticate(
  username: string,
  password: string,
): Promise<?AuthResponse> {
  return getConnection(async (conn): Promise<?AuthResponse> => {
    const row = await genHead(runQuery(conn, SQL`
      SELECT ID, user_pass
      FROM wp_users
      WHERE user_login=${username};`,
    ));
    if (!row) {
      return null;
    }
    if (!hasher.CheckPassword(password, row.user_pass)) {
      return null;
    }
    const accessToken = jwt.sign({ id: row.ID }, jwtSecret);
    return { id: row.ID, accessToken };
  });
}
