import { gql } from '@apollo/client/core';

import { ProfileFragment } from './fragments';

export const UPDATE_USER_MUTATION = gql`
  mutation updateUser($id: ID!, $user: UserInput!) {
    updateUser(id: $id, user: $user) {
      ...Profile
    }
  }
  ${ProfileFragment}
`;
