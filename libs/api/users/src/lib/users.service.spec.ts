// tslint:disable: no-big-function
// tslint:disable: no-duplicate-string
// tslint:disable: no-identical-functions

import { ConfigService } from '@bookapp/api/config';
import { ApiQuery } from '@bookapp/api/shared';
import { UsersService } from '@bookapp/api/users';
import {
  MockConfigService,
  MockModel,
  MockMongooseModel,
  user
} from '@bookapp/testing';

import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import * as crypto from 'crypto';

import { USER_MODEL_NAME, USER_VALIDATION_ERRORS } from './constants';
import { EXCLUDED_FIELDS } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let configService: ConfigService;
  let userModel: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: ConfigService,
          useValue: MockConfigService
        },
        {
          provide: getModelToken(USER_MODEL_NAME),
          useValue: MockModel
        }
      ]
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
    userModel = module.get(getModelToken(USER_MODEL_NAME));
    jest
      .spyOn(userModel, 'exec')
      .mockImplementation(() => Promise.resolve(MockMongooseModel));
    jest
      .spyOn(userModel, 'save')
      .mockImplementationOnce(() => Promise.resolve(user));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    beforeEach(() => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementation(() => Promise.resolve(1));
    });

    it('should count users', async () => {
      await usersService.findAll(new ApiQuery());
      expect(userModel.countDocuments).toHaveBeenCalled();
    });

    it('should find users without filter', async () => {
      await usersService.findAll(new ApiQuery());
      expect(userModel.find).toHaveBeenCalledWith({}, EXCLUDED_FIELDS);
    });

    it('should find users with filter', async () => {
      await usersService.findAll(
        new ApiQuery({ test: new RegExp('search', 'i') })
      );
      expect(userModel.find).toHaveBeenCalledWith(
        { test: /search/i },
        EXCLUDED_FIELDS
      );
    });

    it('should skip with default value', async () => {
      await usersService.findAll(new ApiQuery());
      expect(userModel.skip).toHaveBeenCalledWith(0);
    });

    it('should skip with value from query', async () => {
      await usersService.findAll(new ApiQuery(null, null, 10));
      expect(userModel.skip).toHaveBeenCalledWith(10);
    });

    it('should limit with default value', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('5');
      await usersService.findAll(new ApiQuery());
      expect(userModel.limit).toHaveBeenCalledWith(5);
    });

    it('should limit with value from query', async () => {
      await usersService.findAll(new ApiQuery(null, 10, null));
      expect(userModel.limit).toHaveBeenCalledWith(10);
    });

    it('should sort without value from query', async () => {
      await usersService.findAll(new ApiQuery());
      expect(userModel.sort).toHaveBeenCalledWith(null);
    });

    it('should sort with value from query', async () => {
      const order = { test: -1 };
      await usersService.findAll(new ApiQuery(null, null, null, order));
      expect(userModel.sort).toHaveBeenCalledWith(order);
    });
  });

  describe('findById()', () => {
    it('should find user by id', async () => {
      const id = 'userId';
      await usersService.findById(id);
      expect(userModel.findById).toHaveBeenCalledWith(id, EXCLUDED_FIELDS);
    });
  });

  describe('findByIds()', () => {
    it('should find users by ids', async () => {
      const ids = ['user1', 'user2', 'user3'];
      await usersService.findByIds(ids);
      expect(userModel.find).toHaveBeenCalledWith(
        { _id: { $in: ids } },
        EXCLUDED_FIELDS
      );
    });
  });

  describe('findByEmail()', () => {
    it('should find user by email', async () => {
      const email = 'user@test.com';
      await usersService.findByEmail(email);
      expect(userModel.findOne).toHaveBeenCalledWith({ email });
    });
  });

  describe('create()', () => {
    it('should create user', async () => {
      expect(await usersService.create(user)).toEqual(user);
    });

    it('should reject user creation', async () => {
      const error = { message: 'error' };

      jest
        .spyOn(userModel, 'save')
        .mockImplementationOnce(() => Promise.reject(error));

      try {
        await usersService.create(user);
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('update()', () => {
    it('should find user by id', async () => {
      await usersService.update(user.id, user);
      expect(userModel.findById).toHaveBeenCalledWith(user.id, EXCLUDED_FIELDS);
    });

    it('should throw error if user is not found', async () => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementationOnce(() => Promise.resolve(null));

      try {
        await usersService.update(user.id, user);
      } catch (err) {
        expect(err.message.message).toEqual(
          USER_VALIDATION_ERRORS.USER_NOT_FOUND_ERR
        );
      }
    });

    it('should update user', async () => {
      expect(await usersService.update(user.id, user)).toEqual(user);
    });

    it('should reject user update', async () => {
      const error = { message: 'error' };

      jest
        .spyOn(userModel, 'save')
        .mockImplementationOnce(() => Promise.reject(error));

      try {
        await usersService.update(user.id, user);
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('changePassword()', () => {
    beforeEach(() => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementation(() =>
          Promise.resolve({ ...MockMongooseModel, authenticate: () => true })
        );
    });

    it('should find user by id', async () => {
      await usersService.changePassword(user.id, 'oldPassword', 'newPassword');
      expect(userModel.findById).toHaveBeenCalledWith(user.id);
    });

    it('should throw error if password is incorrect', async () => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementationOnce(() =>
          Promise.resolve({ ...MockMongooseModel, authenticate: () => false })
        );

      try {
        await usersService.changePassword(
          user.id,
          'oldPassword',
          'newPassword'
        );
      } catch (err) {
        expect(err.message.message).toEqual(
          USER_VALIDATION_ERRORS.OLD_PASSWORD_MATCH_ERR
        );
      }
    });

    it('should update password', async () => {
      expect(
        await usersService.changePassword(user.id, 'oldPassword', 'newPassword')
      ).toEqual(user);
    });

    it('should reject password update', async () => {
      const error = { message: 'error' };

      jest
        .spyOn(userModel, 'save')
        .mockImplementationOnce(() => Promise.reject(error));

      try {
        await usersService.changePassword(
          user.id,
          'oldPassword',
          'newPassword'
        );
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('requestResetPassword()', () => {
    const email = 'user@test.com';

    it('should find user by email', async () => {
      await usersService.requestResetPassword(email);
      expect(userModel.findOne).toHaveBeenCalledWith(
        { email },
        EXCLUDED_FIELDS
      );
    });

    it('should throw error if user is not found', async () => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementationOnce(() => Promise.resolve(null));

      try {
        await usersService.requestResetPassword(email);
      } catch (err) {
        expect(err.message.message).toEqual(
          USER_VALIDATION_ERRORS.EMAIL_NOT_FOUND_ERR
        );
      }
    });

    it('should resolve with token', async () => {
      const token = 'token';
      jest.spyOn(crypto, 'randomBytes').mockImplementation(() => token);
      expect(await usersService.requestResetPassword(email)).toEqual(token);
    });

    it('should reject without token', async () => {
      const error = { message: 'error' };

      jest
        .spyOn(userModel, 'save')
        .mockImplementationOnce(() => Promise.reject(error));

      try {
        await usersService.requestResetPassword(email);
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('resetPassword()', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1564393782396);
    });

    it('should find user by token', async () => {
      await usersService.resetPassword('token', 'password');
      expect(userModel.findOne).toHaveBeenCalledWith({
        resetPasswordToken: 'token',
        resetPasswordExpires: {
          $gt: Date.now()
        }
      });
    });

    it('should throw error if user with provided token is not found', async () => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementationOnce(() => Promise.resolve(null));

      try {
        await usersService.resetPassword('token', 'password');
      } catch (err) {
        expect(err.message.message).toEqual(
          USER_VALIDATION_ERRORS.TOKEN_NOT_FOUND_ERR
        );
      }
    });

    it('should return user with new password', async () => {
      expect(await usersService.resetPassword('token', 'password')).toEqual(
        user
      );
    });

    it('should reject without token', async () => {
      const error = { message: 'error' };

      jest
        .spyOn(userModel, 'save')
        .mockImplementationOnce(() => Promise.reject(error));

      try {
        await usersService.resetPassword('token', 'password');
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('remove()', () => {
    it('should find user by id', async () => {
      await usersService.remove(user.id);
      expect(userModel.findById).toHaveBeenCalledWith(user.id, EXCLUDED_FIELDS);
    });

    it('should throw error if user is not found', async () => {
      jest
        .spyOn(userModel, 'exec')
        .mockImplementationOnce(() => Promise.resolve(null));

      try {
        await usersService.remove(user.id);
      } catch (err) {
        expect(err.message.message).toEqual(
          USER_VALIDATION_ERRORS.USER_NOT_FOUND_ERR
        );
      }
    });

    it('should remove user', async () => {
      await usersService.remove(user.id);
      expect(userModel.remove).toHaveBeenCalled();
    });

    it('should reject user remove', async () => {
      const error = { message: 'error' };

      jest
        .spyOn(userModel, 'save')
        .mockImplementationOnce(() => Promise.reject(error));

      try {
        await usersService.update(user.id, user);
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });
});