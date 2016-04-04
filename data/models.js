/**
 * @flow
 */
"use strict";

type UserProps = {
  id: string;
  name: string;
}

export class User {
  id: string;
  name: string;

  constructor(properties: UserProps) {
    this.id = properties.id;
    this.name = properties.name;
  }
}
