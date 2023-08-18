import request from 'supertest';
import app from '../src/app';

describe('/lifecycleEvents', () => {
	it('should respond 401 when JWT token is missing', () => {
		return request(app).post('/lifecycleEvents/installed').expect(401);
	});
});
